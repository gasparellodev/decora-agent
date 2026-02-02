import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { salesAgentPrompt, LeadHistory, postSalePrompt, PostSaleMessageType, PostSaleContext } from '@/lib/ai/prompts/sales-agent'
import { agentTools } from '@/lib/ai/tools'
import {
  executeCheckOrderStatus,
  executeEscalateToHuman,
  executeScheduleFollowUp,
  executeCalculateShipping,
  executeGetProductInfo,
  executeUpdateLeadInfo,
  executeValidateMeasurement,
  executeRecommendProduct
} from '@/lib/ai/tools/executors'
import { formatForWhatsApp, calculateTypingTime, sleep, splitLongMessage, getDelayBetweenMessages } from '@/lib/utils/whatsapp-formatter'
import { formatForML } from '@/lib/utils/ml-formatter'
import type { Lead, Conversation, Order } from '@/types/database'
import type { AgentContext, ProcessMessageResult as AgentProcessResult } from '@/types/agent'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

function getSupabase() { return createAdminClient() }

interface ProcessMessageResult {
  success: boolean
  response?: string
  error?: string
  tokensUsed?: number
  toolsUsed?: string[]
}

// Buscar histórico do lead para contextualizar a IA
async function getLeadHistory(leadId: string): Promise<LeadHistory> {
  const supabase = getSupabase()
  
  // Buscar conversas anteriores
  const { data: conversations } = await supabase
    .from('dc_conversations')
    .select('id, status, created_at, context_json')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  
  // Buscar pedidos
  const { data: orders } = await supabase
    .from('dc_orders')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  
  const hasEscalations = conversations?.some(
    c => (c.context_json as Record<string, unknown>)?.escalation_reason
  ) || false
  
  return {
    isReturningCustomer: (conversations?.length || 0) > 1,
    previousConversations: conversations?.length || 0,
    lastInteractionDate: conversations?.[0]?.created_at,
    ordersInProduction: (orders?.filter(o => 
      ['em_producao', 'pronto'].includes(o.production_status || '')
    ) || []) as Order[],
    hasEscalations
  }
}

/**
 * Processa mensagem do agente unificado
 * Suporta WhatsApp e Mercado Livre com comportamento adaptado por canal
 */
export async function processMessage(
  messageContent: string,
  context: AgentContext,
  lead?: Lead | null,
  conversation?: Conversation | null
): Promise<ProcessMessageResult> {
  const startTime = Date.now()
  const isML = context.channel === 'mercadolivre'
  const toolsUsed: string[] = []
  
  try {
    // Verificar se o agente está ativo (apenas para WhatsApp)
    if (!isML) {
      const { data: settings } = await getSupabase()
        .from('dc_agent_settings')
        .select('value')
        .eq('key', 'agent_enabled')
        .single()

      if (settings?.value === 'false' || settings?.value === false) {
        console.log('Agent is disabled, skipping processing')
        return { success: false, error: 'Agent is disabled' }
      }

      // Se a conversa está aguardando humano, não processar
      if (conversation?.status === 'waiting_human') {
        console.log('Conversation waiting for human, skipping AI processing')
        return { success: false, error: 'Waiting for human' }
      }
    }

    // Buscar histórico (apenas para WhatsApp com conversa)
    let history: { direction: string; content: string }[] = []
    let orders: Order[] = []
    let leadHistory: LeadHistory | undefined

    if (!isML && conversation && lead) {
      const { data: historyData } = await getSupabase()
        .from('dc_messages')
        .select('direction, sender_type, content, sent_at')
        .eq('conversation_id', conversation.id)
        .order('sent_at', { ascending: true })
        .limit(20)
      
      history = historyData || []

      const { data: ordersData } = await getSupabase()
        .from('dc_orders')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      orders = (ordersData || []) as Order[]
      leadHistory = await getLeadHistory(lead.id)
    }

    // Montar mensagens para a IA
    const messages: OpenAI.ChatCompletionMessageParam[] = history.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Adicionar a mensagem atual
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.content !== messageContent) {
      messages.push({
        role: 'user',
        content: messageContent
      })
    }

    // Gerar prompt com contexto do canal
    const systemPrompt = salesAgentPrompt(lead || null, orders, leadHistory, context)

    // Chamar GPT-4o com tools
    let response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: isML ? 200 : 500, // ML precisa de respostas mais curtas
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: agentTools,
      tool_choice: 'auto'
    })

    let totalTokens = response.usage?.total_tokens ?? 0
    let finalResponse = response.choices[0]?.message?.content || ''
    let iterations = 0
    const maxIterations = 5

    // Loop para processar tool calls
    while ((response.choices[0]?.message?.tool_calls?.length || 0) > 0 && iterations < maxIterations) {
      iterations++
      const toolCalls = response.choices[0]?.message?.tool_calls || []
      const toolResults: OpenAI.ChatCompletionMessageParam[] = []

      messages.push({
        role: 'assistant',
        content: response.choices[0]?.message?.content || '',
        tool_calls: toolCalls
      })

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name
        toolsUsed.push(toolName)
        let toolInput: Record<string, unknown> = {}

        try {
          toolInput = toolCall.function.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {}
        } catch {
          toolInput = {}
        }

        console.log(`[Agent ${context.channel}] Executing tool: ${toolName}`, toolInput)

        let result: unknown

        switch (toolName) {
          case 'check_order_status':
            result = lead ? await executeCheckOrderStatus(
              toolInput as { order_number?: string; phone?: string },
              lead.id
            ) : { found: false, message: 'Lead não disponível' }
            break

          case 'escalate_to_human':
            result = (lead && conversation) ? await executeEscalateToHuman(
              toolInput as { reason: string; priority?: string; summary?: string },
              conversation.id,
              lead.id
            ) : { success: false, message: 'Não disponível no Mercado Livre' }
            break

          case 'schedule_followup':
            result = lead ? await executeScheduleFollowUp(
              toolInput as { type: string; days_from_now: number; message?: string },
              lead.id
            ) : { success: false, message: 'Lead não disponível' }
            break

          case 'calculate_shipping':
            // Adicionar source ao input para regras de frete
            const shippingInput = {
              ...(toolInput as { cep: string; width?: number; height?: number; quantity?: number }),
              source: context.channel as 'whatsapp' | 'mercadolivre' | 'shopify'
            }
            result = await executeCalculateShipping(shippingInput)
            break

          case 'get_product_info':
            result = await executeGetProductInfo(
              toolInput as { model: string; width?: number; height?: number; glass_type?: string; color?: string }
            )
            break

          case 'update_lead_info':
            result = lead ? await executeUpdateLeadInfo(
              toolInput as { name?: string; email?: string; cep?: string; cpf?: string; notes?: string },
              lead.id
            ) : { success: false, message: 'Lead não disponível' }
            break

          case 'validate_measurement':
            result = await executeValidateMeasurement(
              toolInput as { 
                width: number; 
                height: number; 
                cep?: string; 
                wall_type?: string; 
                wall_depth?: number; 
                model?: string 
              }
            )
            break

          case 'recommend_product':
            result = await executeRecommendProduct(
              toolInput as { 
                environment: string; 
                needs?: string[]; 
                width?: number; 
                height?: number; 
                rain_region?: boolean 
              }
            )
            break

          default:
            result = { error: `Unknown tool: ${toolName}` }
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        })
      }

      // Continuar a conversa com os resultados das tools
      messages.push(...toolResults)

      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: isML ? 200 : 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: agentTools,
        tool_choice: 'auto'
      })

      totalTokens += response.usage?.total_tokens ?? 0
      finalResponse = response.choices[0]?.message?.content || finalResponse
    }

    if (!finalResponse) {
      console.error('No text response from OpenAI')
      return { success: false, error: 'No response generated' }
    }

    // Formatar resposta conforme canal
    const formattedResponse = isML 
      ? formatForML(finalResponse)
      : formatForWhatsApp(finalResponse)

    console.log(`[Agent ${context.channel}] Response generated (${formattedResponse.length} chars)`)

    // ===== COMPORTAMENTO POR CANAL =====
    if (isML) {
      // Mercado Livre: apenas retorna resposta, não envia nem salva
      return {
        success: true,
        response: formattedResponse,
        tokensUsed: totalTokens,
        toolsUsed
      }
    }

    // WhatsApp: envia via Evolution e salva no banco
    if (!lead) {
      return { success: false, error: 'Lead required for WhatsApp' }
    }

    const evolution = getEvolutionProvider()
    
    // Dividir mensagens longas para envio mais natural
    const messageParts = splitLongMessage(formattedResponse, 350)
    const sentParts: string[] = []
    
    try {
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i]
        
        // Delay entre mensagens (exceto primeira)
        if (i > 0) {
          await sleep(getDelayBetweenMessages())
        }
        
        // Simular digitação
        const typingTime = calculateTypingTime(part)
        try {
          await evolution.sendPresence(lead.phone, 'composing', typingTime)
          await sleep(typingTime)
        } catch (presenceError) {
          console.warn('Presence error (non-critical):', presenceError)
          // Mesmo sem presence, aguarda um pouco antes de enviar
          await sleep(Math.min(typingTime, 1000))
        }
        
        await evolution.sendText(lead.phone, part)
        sentParts.push(part)
      }
    } catch (sendError) {
      console.error('Error sending message parts:', sendError)
      // Se falhar no meio, tenta enviar o restante
      for (let i = sentParts.length; i < messageParts.length; i++) {
        try {
          await evolution.sendText(lead.phone, messageParts[i])
          sentParts.push(messageParts[i])
        } catch {
          // Ignora erro em partes individuais
        }
      }
    }

    // Salvar todas as partes como uma resposta no banco
    if (conversation) {
      await getSupabase().from('dc_messages').insert({
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'outbound',
        sender_type: 'agent',
        content: formattedResponse,
        ai_tokens_used: totalTokens,
        ai_model: 'gpt-4o',
        metadata: { 
          iterations, 
          response_time_ms: Date.now() - startTime,
          tools_used: toolsUsed,
          message_parts: messageParts.length > 1 ? messageParts.length : undefined,
          original_response: finalResponse !== formattedResponse ? finalResponse : undefined
        }
      })
    }

    // Atualizar métricas
    await updateMetrics(totalTokens, Date.now() - startTime)

    return {
      success: true,
      response: formattedResponse,
      tokensUsed: totalTokens,
      toolsUsed
    }

  } catch (error) {
    console.error('Error processing message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Wrapper para compatibilidade com código legado (WhatsApp)
 * @deprecated Use processMessage com AgentContext
 */
export async function processMessageLegacy(
  lead: Lead,
  conversation: Conversation,
  messageContent: string
): Promise<ProcessMessageResult> {
  const context: AgentContext = {
    channel: 'whatsapp',
    leadId: lead.id,
    conversationId: conversation.id
  }
  return processMessage(messageContent, context, lead, conversation)
}

async function updateMetrics(tokensUsed: number, responseTimeMs: number) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Custo estimado (Claude Sonnet: $3/1M input, $15/1M output - usando média)
    const estimatedCost = (tokensUsed / 1000000) * 9

    try {
      await getSupabase().rpc('upsert_daily_metrics', {
        p_date: today,
        p_messages_out: 1,
        p_tokens: tokensUsed,
        p_cost: estimatedCost,
        p_response_time: responseTimeMs / 1000
      })
    } catch {
      // Fallback se a função não existir
      await getSupabase().from('dc_agent_metrics').upsert({
        date: today,
        total_messages_out: 1,
        total_tokens_used: tokensUsed,
        total_ai_cost_usd: estimatedCost
      }, { onConflict: 'date' })
    }
  } catch (error) {
    console.error('Error updating metrics:', error)
  }
}

// Função auxiliar para criar ou recuperar conversa ativa
export async function getOrCreateConversation(leadId: string): Promise<Conversation | null> {
  try {
    // Buscar conversa ativa
    const { data: existing } = await getSupabase()
      .from('dc_conversations')
      .select('*')
      .eq('lead_id', leadId)
      .in('status', ['active', 'waiting_human'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      return existing as Conversation
    }

    // Criar nova conversa
    const { data: newConv, error } = await getSupabase()
      .from('dc_conversations')
      .insert({
        lead_id: leadId,
        channel: 'whatsapp',
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error

    // Atualizar métricas
    const today = new Date().toISOString().split('T')[0]
    try {
      await getSupabase().from('dc_agent_metrics').upsert({
        date: today,
        total_conversations: 1
      }, { onConflict: 'date' })
    } catch {
      // Ignore metrics error
    }

    return newConv as Conversation
  } catch (error) {
    console.error('Error getting/creating conversation:', error)
    return null
  }
}

// Função para upsert lead
export async function upsertLead(
  phone: string,
  name?: string,
  source: string = 'whatsapp'
): Promise<Lead | null> {
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    
    const { data, error } = await getSupabase()
      .from('dc_leads')
      .upsert({
        phone: cleanPhone,
        name: name || null,
        source,
        last_message_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select()
      .single()

    if (error) throw error

    return data as Lead
  } catch (error) {
    console.error('Error upserting lead:', error)
    return null
  }
}

// =====================================================
// FUNÇÕES DE PÓS-VENDA DO MERCADO LIVRE
// =====================================================

/**
 * Cria ou busca lead do Mercado Livre pelo buyer_id
 */
export async function upsertMLLead(data: {
  mlBuyerId: string
  name?: string
  nickname?: string
}): Promise<Lead | null> {
  try {
    const supabase = getSupabase()
    
    // Busca lead existente pelo ml_buyer_id no metadata
    const { data: existingLead } = await supabase
      .from('dc_leads')
      .select('*')
      .contains('metadata', { ml_buyer_id: data.mlBuyerId })
      .single()

    if (existingLead) {
      // Atualiza nome se necessário
      if (data.name && !existingLead.name) {
        await supabase
          .from('dc_leads')
          .update({ name: data.name })
          .eq('id', existingLead.id)
      }
      return existingLead as Lead
    }

    // Cria novo lead
    const { data: newLead, error } = await supabase
      .from('dc_leads')
      .insert({
        name: data.name || data.nickname || 'Cliente ML',
        source: 'mercadolivre',
        status: 'novo',
        metadata: {
          ml_buyer_id: data.mlBuyerId,
          ml_nickname: data.nickname
        }
      })
      .select()
      .single()

    if (error) throw error
    return newLead as Lead
  } catch (error) {
    console.error('[ML Lead] Error upserting ML lead:', error)
    return null
  }
}

/**
 * Atualiza lead do ML com dados coletados
 */
export async function updateMLLeadData(
  leadId: string,
  collectedData: Record<string, string>
): Promise<boolean> {
  try {
    const supabase = getSupabase()
    
    const updates: Record<string, unknown> = {}
    
    if (collectedData.name) updates.name = collectedData.name
    if (collectedData.email) updates.email = collectedData.email
    if (collectedData.cep) updates.cep = collectedData.cep
    if (collectedData.cpf) updates.cpf = collectedData.cpf
    if (collectedData.whatsapp) updates.phone = collectedData.whatsapp
    if (collectedData.address) {
      // Busca lead atual para merge de metadata
      const { data: currentLead } = await supabase
        .from('dc_leads')
        .select('metadata')
        .eq('id', leadId)
        .single()
      
      updates.metadata = {
        ...(currentLead?.metadata || {}),
        address: collectedData.address,
        glass_choice: collectedData.glass,
        data_collected_at: new Date().toISOString()
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('dc_leads')
        .update(updates)
        .eq('id', leadId)
    }

    return true
  } catch (error) {
    console.error('[ML Lead] Error updating lead data:', error)
    return false
  }
}

/**
 * Gera uma mensagem de pós-venda humanizada usando o agente
 */
export async function generatePostSaleMessage(
  messageType: PostSaleMessageType,
  context: PostSaleContext
): Promise<{ success: boolean; message: string; tokensUsed?: number }> {
  try {
    const prompt = postSalePrompt(messageType, context)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 150,
      temperature: 0.7, // Um pouco de variação para mensagens únicas
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Gere a mensagem.' }
      ]
    })

    const message = response.choices[0]?.message?.content?.trim() || ''
    const tokensUsed = response.usage?.total_tokens || 0
    
    // Garante que está dentro do limite
    const formattedMessage = formatForML(message)
    
    console.log(`[PostSale Agent] Generated ${messageType} message (${formattedMessage.length} chars)`)
    
    return {
      success: true,
      message: formattedMessage,
      tokensUsed
    }
  } catch (error) {
    console.error('[PostSale Agent] Error generating message:', error)
    return {
      success: false,
      message: ''
    }
  }
}

/**
 * Gera a sequência completa de boas-vindas (5 mensagens)
 */
export async function generatePostSaleSequence(
  buyerName: string,
  productInfo?: string
): Promise<{ success: boolean; messages: string[]; tokensUsed: number }> {
  const messageTypes: PostSaleMessageType[] = [
    'welcome',
    'chapatex',
    'cintas',
    'data_request',
    'glass_request'
  ]

  const messages: string[] = []
  let totalTokens = 0

  const context: PostSaleContext = {
    buyerName,
    productInfo
  }

  for (const type of messageTypes) {
    const result = await generatePostSaleMessage(type, context)
    
    if (result.success && result.message) {
      messages.push(result.message)
      totalTokens += result.tokensUsed || 0
    } else {
      // Fallback para mensagens fixas em caso de erro
      const fallback = getPostSaleFallback(type, buyerName)
      messages.push(fallback)
    }
    
    // Pequeno delay entre chamadas para não sobrecarregar
    await sleep(100)
  }

  console.log(`[PostSale Agent] Generated sequence: ${messages.length} messages, ${totalTokens} tokens`)

  return {
    success: messages.length === messageTypes.length,
    messages,
    tokensUsed: totalTokens
  }
}

/**
 * Gera notificação de status humanizada
 */
export async function generateStatusNotification(
  statusType: 'in_production' | 'ready' | 'shipped' | 'delivered',
  context: PostSaleContext
): Promise<{ success: boolean; message: string; tokensUsed?: number }> {
  return generatePostSaleMessage(statusType, context)
}

/**
 * Fallback para mensagens de pós-venda em caso de erro da IA
 */
function getPostSaleFallback(type: PostSaleMessageType, buyerName: string): string {
  const fallbacks: Record<PostSaleMessageType, string> = {
    welcome: `Ola ${buyerName}, tudo bem? Me chamo Ana, vou cuidar do seu pedido durante a entrega e qualquer duvida sobre instalacao.`,
    chapatex: `Quando seu pedido chegar NAO retire o chapatex! Ele informa o lado interno/externo e protege contra tintas e acabamentos da obra.`,
    cintas: `Tambem NAO remova as cintas laterais ate o momento da instalacao. Elas mantem o esquadro perfeito da janela.`,
    data_request: `Ja identifiquei o pagamento do frete! Preciso que me envie: nome completo, endereco, CEP, CPF, e-mail e WhatsApp.`,
    glass_request: `Por ultimo, confirme o vidro de sua escolha: incolor, mini boreal ou fume. Qual prefere?`,
    data_confirmation: `Obrigada ${buyerName}! Recebi seus dados. Vou preparar seu pedido e te aviso quando for enviado.`,
    glass_confirmation: `Perfeito! Anotei sua escolha. Qualquer duvida estou por aqui!`,
    in_production: `${buyerName}, sua janela entrou em producao! Te aviso quando ficar pronta.`,
    ready: `${buyerName}, sua janela ficou pronta! Aguardando coleta da transportadora.`,
    shipped: `${buyerName}, sua janela foi enviada! Acompanhe pelo site da transportadora.`,
    delivered: `${buyerName}, sua janela foi entregue! Lembre: so remova chapatex e cintas na instalacao. Duvidas, estou aqui!`
  }
  
  return fallbacks[type] || ''
}

/**
 * Processa resposta do cliente e extrai dados com ajuda do agente
 */
export async function processClientResponse(
  messageText: string,
  currentData: Record<string, string>,
  conversationStatus: string
): Promise<{
  dataExtracted: Record<string, string>
  glassChoice?: string
  needsMoreInfo: boolean
  responseMessage?: string
}> {
  // Extração básica por regex
  const extracted = extractDataFromMessage(messageText)
  const mergedData = { ...currentData, ...extracted }

  // Verifica escolha de vidro
  const glassChoice = extractGlassChoice(messageText)

  // Verifica se está completo
  const requiredFields = ['name', 'address', 'cep', 'cpf', 'email', 'whatsapp']
  const missingFields = requiredFields.filter(f => !mergedData[f])

  return {
    dataExtracted: mergedData,
    glassChoice: glassChoice || undefined,
    needsMoreInfo: conversationStatus === 'waiting_data' && missingFields.length > 0
  }
}

/**
 * Extrai dados do cliente de uma mensagem
 */
function extractDataFromMessage(text: string): Record<string, string> {
  const data: Record<string, string> = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Nome
    if (lower.includes('nome') && line.includes(':')) {
      data.name = line.split(':')[1]?.trim()
    }

    // Endereço
    if ((lower.includes('endereco') || lower.includes('endereço')) && line.includes(':')) {
      data.address = line.split(':')[1]?.trim()
    }
  }

  // CEP
  const cepMatch = text.match(/\b(\d{5})-?(\d{3})\b/)
  if (cepMatch) {
    data.cep = cepMatch[0].replace('-', '')
  }

  // CPF
  const cpfMatch = text.match(/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/)
  if (cpfMatch) {
    data.cpf = cpfMatch[0].replace(/\D/g, '')
  }

  // Email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  if (emailMatch) {
    data.email = emailMatch[0]
  }

  // WhatsApp (telefone)
  const phoneMatch = text.match(/\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/)
  if (phoneMatch) {
    data.whatsapp = phoneMatch[0].replace(/\D/g, '')
  }

  // Tenta extrair nome se não encontrou com label
  if (!data.name) {
    const nameMatch = text.match(/^([A-ZÀ-Ú][a-zà-ú]+ ){1,3}[A-ZÀ-Ú][a-zà-ú]+/m)
    if (nameMatch) {
      data.name = nameMatch[0].trim()
    }
  }

  return data
}

/**
 * Extrai escolha de vidro de uma mensagem
 */
function extractGlassChoice(text: string): string | null {
  const lower = text.toLowerCase()

  if (lower.includes('incolor')) return 'incolor'
  if (lower.includes('mini boreal') || lower.includes('boreal')) return 'mini_boreal'
  if (lower.includes('fum') || lower.includes('fumê') || lower.includes('fume')) return 'fume'

  return null
}

// =====================================================
// DETECÇÃO DE MEDIDAS NÃO PADRÃO
// =====================================================

/**
 * Detecta se a resposta do agente menciona medidas não padrão
 * Usado para escalar automaticamente para revisão humana
 */
export function detectNonStandardMeasurement(
  response: string,
  toolsUsed: string[]
): { isNonStandard: boolean; reason?: string } {
  // Se não usou validate_measurement, provavelmente não é sobre medidas
  if (!toolsUsed.includes('validate_measurement')) {
    return { isNonStandard: false }
  }

  // Patterns que indicam medida não padrão
  const patterns = [
    /n[aã]o s[aã]o padr[oõ]es/i,
    /n[aã]o [eé] padr[aã]o/i,
    /medida n[aã]o padr[aã]o/i,
    /padr[oõ]es mais pr[oó]ximos?:/i,
    /medidas? pr[oó]ximas?:/i,
    /fora do padr[aã]o/i,
    /altura e largura n[aã]o s[aã]o/i,
    /essa altura e largura n[aã]o/i
  ]

  for (const pattern of patterns) {
    if (pattern.test(response)) {
      // Tentar extrair a medida mencionada
      const measureMatch = response.match(/(\d+)\s*x\s*(\d+)/i)
      if (measureMatch) {
        return {
          isNonStandard: true,
          reason: `Medida ${measureMatch[1]}x${measureMatch[2]}cm não é padrão`
        }
      }
      return {
        isNonStandard: true,
        reason: 'Medida não padrão detectada na resposta'
      }
    }
  }

  return { isNonStandard: false }
}
