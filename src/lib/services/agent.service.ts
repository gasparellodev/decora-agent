import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { salesAgentPrompt, LeadHistory, postSalePrompt, PostSaleMessageType, PostSaleContext, CRMOutput } from '@/lib/ai/prompts/sales-agent'
import { searchSimilarKnowledge, formatRAGContext, shouldSkipRAG } from '@/lib/services/embedding.service'
import { agentTools } from '@/lib/ai/tools'
import {
  executeCheckOrderStatus,
  executeEscalateToHuman,
  executeCalculateShipping,
  executeGetProductInfo,
  executeCreatePaymentLink,
} from '@/lib/ai/tools/executors'
import { createProductionOrder } from '@/lib/services/production-order.service'
import { formatForWhatsApp, calculateTypingTime, sleep, splitLongMessage, getDelayBetweenMessages, truncateMessage } from '@/lib/utils/whatsapp-formatter'
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

// =====================================================
// PARSER DE RESPOSTA JSON
// =====================================================

/**
 * Separa a mensagem do cliente do JSON de CRM na resposta do GPT.
 * O GPT retorna: texto para WhatsApp + bloco ---JSON--- ... ---/JSON---
 */
function parseAgentResponse(rawResponse: string): { message: string; crmData: CRMOutput | null } {
  const jsonMatch = rawResponse.match(/---JSON---([\s\S]*?)---\/JSON---/)

  if (!jsonMatch) {
    return { message: rawResponse.trim(), crmData: null }
  }

  // Extrair texto (antes do JSON) e JSON
  const message = rawResponse.replace(/---JSON---[\s\S]*?---\/JSON---/, '').trim()
  const jsonStr = jsonMatch[1].trim()

  try {
    const crmData = JSON.parse(jsonStr) as CRMOutput
    return { message, crmData }
  } catch (err) {
    console.warn('[CRM Parser] Invalid JSON in response:', err)
    return { message: rawResponse.replace(/---JSON---[\s\S]*?---\/JSON---/, '').trim(), crmData: null }
  }
}

// =====================================================
// CRM AUTO-UPDATE
// =====================================================

/** Mapeamento de stage_suggested do JSON para dc_leads.stage */
const STAGE_MAP: Record<string, string> = {
  'Lead Novo': 'novo',
  'Qualificado': 'qualificando',
  'Orcamento/Resumo Gerado': 'orcamento',
  'Link Enviado': 'orcamento',
  'Aguardando Pagamento': 'orcamento',
  'Pedido Comprado': 'comprou',
  'Nao Interessado': 'inativo',
}

/**
 * Atualiza lead e conversa automaticamente a partir do JSON retornado pelo GPT.
 */
async function processCRMOutput(
  crmData: CRMOutput,
  lead: Lead,
  conversation: Conversation
): Promise<void> {
  const supabase = getSupabase()

  // 1. Atualizar lead
  const leadUpdates: Record<string, unknown> = {}
  if (crmData.customer_name) leadUpdates.name = crmData.customer_name
  if (crmData.cep) leadUpdates.cep = crmData.cep.replace(/\D/g, '')

  // Mapear stage
  const mappedStage = STAGE_MAP[crmData.stage_suggested]
  if (mappedStage && mappedStage !== lead.stage) {
    leadUpdates.stage = mappedStage
  }

  if (Object.keys(leadUpdates).length > 0) {
    try {
      await supabase.from('dc_leads').update(leadUpdates).eq('id', lead.id)
      console.log(`[CRM] Lead updated:`, leadUpdates)
    } catch (err) {
      console.warn('[CRM] Error updating lead:', err)
    }
  }

  // 2. Atualizar conversa com stage e fatos coletados (MERGE, não substituição)
  try {
    // Carregar fatos existentes para merge
    const { data: currentConv } = await supabase
      .from('dc_conversations')
      .select('collected_facts')
      .eq('id', conversation.id)
      .single()

    const existingFacts = (currentConv?.collected_facts || {}) as Record<string, unknown>
    const mergedFacts: Record<string, unknown> = { ...existingFacts }

    // Campos que resetam dependentes quando mudam de valor
    const DEPENDENT_RESETS: Record<string, string[]> = {
      product_model: ['product_url', 'link_sent', 'height_cm', 'width_cm'],
      height_cm: ['product_url', 'link_sent'],
      width_cm: ['product_url', 'link_sent'],
      color: ['product_url', 'link_sent'],
    }

    for (const [key, value] of Object.entries(crmData as unknown as Record<string, unknown>)) {
      if (value !== null && value !== undefined) {
        // Se valor mudou, resetar dependentes
        if (DEPENDENT_RESETS[key] && existingFacts[key] !== undefined && existingFacts[key] !== value) {
          for (const dep of DEPENDENT_RESETS[key]) {
            mergedFacts[dep] = null
          }
        }
        mergedFacts[key] = value
      }
    }

    await supabase
      .from('dc_conversations')
      .update({
        conversation_state: crmData.stage_suggested,
        collected_facts: mergedFacts
      })
      .eq('id', conversation.id)

    console.log('[CRM] Facts merged successfully')
  } catch (err) {
    console.warn('[CRM] Error updating conversation:', err)
  }

  // 3. Se handoff_to_human = true, escalar automaticamente
  if (crmData.handoff_to_human) {
    try {
      await executeEscalateToHuman(
        {
          reason: crmData.notes || `${crmData.case_type} - ${crmData.stage_suggested}`,
          priority: 'medium',
          summary: `Produto: ${crmData.product_model || 'N/A'} | Medida: ${crmData.width_cm || '?'}x${crmData.height_cm || '?'}cm | Cor: ${crmData.color || '?'} | Tipo: ${crmData.case_type}`
        },
        conversation.id,
        lead.id
      )
      console.log('[CRM] Auto-escalated to human:', crmData.case_type, crmData.stage_suggested)
    } catch (err) {
      console.warn('[CRM] Error auto-escalating:', err)
    }
  }

  // 4. Se link foi enviado, criar pedido no sistema de producao
  if (crmData.link_sent && crmData.product_url) {
    try {
      await createProductionOrder(crmData, lead, conversation)
    } catch (err) {
      console.warn('[CRM] Error creating production order:', err)
    }
  }
}

/**
 * Processa mensagem do agente unificado
 * Suporta WhatsApp e Mercado Livre com comportamento adaptado por canal
 *
 * WhatsApp: usa master prompt com JSON output estruturado para CRM
 * Mercado Livre: mantém comportamento existente (prompt-driven)
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

    // ===== CARREGAR DADOS DA CONVERSA =====
    let persistedFacts: string | undefined
    let conversationSummary: string | undefined

    if (!isML && conversation) {
      const { data: convState } = await getSupabase()
        .from('dc_conversations')
        .select('conversation_state, collected_facts, summary')
        .eq('id', conversation.id)
        .single()

      if (convState) {
        const conversationState = convState.conversation_state as string | null

        // Se conversa foi escalada, não processar IA
        if (conversationState === 'Encaminhado para Humano') {
          console.log('[Agent] Conversation escalated, skipping AI processing')
          return { success: false, error: 'Conversation escalated' }
        }

        // Reset conversa inativa (>1h sem mensagem para testes, restaurar para 24 em producao)
        const STALE_HOURS = 1
        const lastMessageAt = lead?.last_message_at
        if (lastMessageAt) {
          const hoursSinceLastMessage = (Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastMessage > STALE_HOURS) {
            console.log(`[Agent] Conversation stale (${Math.round(hoursSinceLastMessage)}h inactive). Generating summary.`)

            // Gerar resumo da conversa anterior antes de limpar
            if (convState.collected_facts) {
              const facts = convState.collected_facts as Record<string, unknown>
              const parts: string[] = []
              if (facts.product_model) parts.push(`Modelo: ${facts.product_model}`)
              if (facts.height_cm && facts.width_cm) parts.push(`Medidas: ${facts.width_cm}x${facts.height_cm}cm`)
              if (facts.color) parts.push(`Cor: ${facts.color}`)
              if (facts.glass_type) parts.push(`Vidro: ${facts.glass_type}`)
              if (facts.quantity) parts.push(`Qtd: ${facts.quantity}`)
              if (facts.cep) parts.push(`CEP: ${facts.cep}`)
              if (facts.stage_suggested) parts.push(`Estagio: ${facts.stage_suggested}`)

              if (parts.length > 0) {
                const summary = `Conversa anterior (${new Date(lastMessageAt).toLocaleDateString('pt-BR')}): ${parts.join(', ')}`
                await getSupabase()
                  .from('dc_conversations')
                  .update({ summary, collected_facts: null, conversation_state: null })
                  .eq('id', conversation.id)
                conversationSummary = summary
                console.log(`[Agent] Summary saved: ${summary}`)
              }
            } else if (convState.summary) {
              // Ja tem resumo de uma sessao anterior
              conversationSummary = convState.summary as string
            }

            persistedFacts = undefined
          } else {
            // Passar fatos coletados como JSON string para o prompt
            persistedFacts = convState.collected_facts
              ? JSON.stringify(convState.collected_facts)
              : undefined
          }
        } else {
          persistedFacts = convState.collected_facts
            ? JSON.stringify(convState.collected_facts)
            : undefined
        }
      }
    }

    // Paralelizar todas as queries independentes
    const needsRAG = !shouldSkipRAG(messageContent)
    const needsWhatsAppData = !isML && conversation && lead

    const [historyResult, ordersResult, leadHistoryResult, ragResult] = await Promise.all([
      needsWhatsAppData
        ? getSupabase()
            .from('dc_messages')
            .select('direction, sender_type, content, sent_at')
            .eq('conversation_id', conversation!.id)
            .order('sent_at', { ascending: true })
            .limit(20)
        : Promise.resolve({ data: null }),

      needsWhatsAppData
        ? getSupabase()
            .from('dc_orders')
            .select('*')
            .eq('lead_id', lead!.id)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: null }),

      needsWhatsAppData
        ? getLeadHistory(lead!.id)
        : Promise.resolve(undefined),

      needsRAG
        ? searchSimilarKnowledge(messageContent, 3, 0.7).catch(err => {
            console.warn('[RAG] Error fetching context (non-critical):', err)
            return [] as Awaited<ReturnType<typeof searchSimilarKnowledge>>
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof searchSimilarKnowledge>>)
    ])

    const history = historyResult.data || []
    const orders = (ordersResult.data || []) as Order[]
    const leadHistory = leadHistoryResult as LeadHistory | undefined
    const ragContext = formatRAGContext(ragResult)

    // Montar mensagens para a IA
    const messages: OpenAI.ChatCompletionMessageParam[] = history.map((msg: { direction: string; content: string }) => ({
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

    // ===== CONSTRUIR PROMPT =====
    const systemPrompt = salesAgentPrompt(
      lead || null,
      orders,
      leadHistory,
      context,
      ragContext || undefined,
      persistedFacts || undefined,
      conversationSummary
    )

    // Todas as 4 tools sempre disponíveis (sem filtragem por estado)
    const activeTools = agentTools

    console.log(`[Agent ${context.channel}] Processing message (${messageContent.length} chars) | Tools: [${activeTools.map(t => t.function.name).join(', ')}]`)

    // Chamar GPT-4o com todas as tools
    let response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: isML ? 200 : 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: activeTools.length > 0 ? activeTools : undefined,
      tool_choice: activeTools.length > 0 ? 'auto' : undefined
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

          case 'calculate_shipping': {
            const shippingInput = {
              ...(toolInput as { cep: string; width?: number; height?: number; quantity?: number }),
              source: context.channel as 'whatsapp' | 'mercadolivre' | 'shopify'
            }
            result = await executeCalculateShipping(shippingInput)
            break
          }

          case 'get_product_info':
            result = await executeGetProductInfo(
              toolInput as { model: string; width?: number; height?: number; glass_type?: string; color?: string; orientation?: 'horizontal' | 'vertical'; quantity?: number; channel?: 'whatsapp' | 'mercadolivre' | 'shopify' }
            )
            break

          case 'create_payment_link':
            result = await executeCreatePaymentLink(
              toolInput as { product_name: string; model: string; color?: string; width?: number; height?: number; glass_type?: string; quantity: number; customer_name: string; customer_phone: string; include_kit_acabamento?: boolean }
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
        max_tokens: isML ? 200 : 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: activeTools.length > 0 ? activeTools : undefined,
        tool_choice: activeTools.length > 0 ? 'auto' : undefined
      })

      totalTokens += response.usage?.total_tokens ?? 0
      finalResponse = response.choices[0]?.message?.content || finalResponse
    }

    if (!finalResponse) {
      console.error('No text response from OpenAI')
      return { success: false, error: 'No response generated' }
    }

    // ===== PARSEAR RESPOSTA: separar MENSAGEM do JSON =====
    const { message: customerMessage, crmData } = parseAgentResponse(finalResponse)

    // Formatar resposta conforme canal
    const formattedResponse = isML
      ? formatForML(customerMessage)
      : formatForWhatsApp(customerMessage)

    console.log(`[Agent ${context.channel}] Response generated (${formattedResponse.length} chars)${crmData ? ` | CRM stage: ${crmData.stage_suggested}` : ' | No CRM data'}`)

    // ===== AUTO-UPDATE CRM a partir do JSON =====
    if (!isML && crmData && lead && conversation) {
      try {
        await processCRMOutput(crmData, lead, conversation)
      } catch (err) {
        console.warn('[CRM] Error processing CRM output:', err)
      }
    }

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

    // Dividir por separadores intencionais da IA (---) primeiro, depois por tamanho
    const aiParts = formattedResponse.split(/\n?---\n?/).filter((p: string) => p.trim()).slice(0, 3)
    const messageParts: string[] = []
    for (const part of aiParts) {
      const trimmed = part.trim()
      if (trimmed.length > 300) {
        messageParts.push(...splitLongMessage(trimmed, 250))
      } else {
        messageParts.push(trimmed)
      }
    }
    // Hard limit: nunca mais que 3 mensagens de uma vez
    if (messageParts.length > 3) messageParts.length = 3
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
          await sleep(Math.min(typingTime, 1000))
        }

        await evolution.sendText(lead.phone, part)
        sentParts.push(part)
      }
    } catch (sendError) {
      console.error('Error sending message parts:', sendError)
      for (let i = sentParts.length; i < messageParts.length; i++) {
        try {
          await evolution.sendText(lead.phone, messageParts[i])
          sentParts.push(messageParts[i])
        } catch {
          // Ignora erro em partes individuais
        }
      }
    }

    // Salvar mensagem no banco (sem o JSON, apenas texto)
    if (conversation) {
      await getSupabase().from('dc_messages').insert({
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'outbound',
        sender_type: 'agent',
        content: messageParts.join('\n\n'),
        ai_tokens_used: totalTokens,
        ai_model: 'gpt-4o',
        metadata: {
          iterations,
          response_time_ms: Date.now() - startTime,
          tools_used: toolsUsed,
          crm_data: crmData || undefined,
          message_parts: messageParts.length > 1 ? messageParts.length : undefined
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
    
    const formattedMessage = truncateMessage(formatForML(message), 350)
    
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

