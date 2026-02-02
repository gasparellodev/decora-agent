import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getQuestion,
  answerQuestion,
  extractQuestionIdFromResource,
  getItemDimensions,
  getItem,
  extractWindowTypeFromTitle,
  type WindowType
} from '@/lib/providers/mercadolivre'
import {
  calculateWindowFreight,
  extractCepFromText
} from '@/lib/providers/melhor-envio'
import { processMessage, detectNonStandardMeasurement } from '@/lib/services/agent.service'
import { formatForML } from '@/lib/utils/ml-formatter'
import type { MLWebhookNotification } from '@/types/mercadolivre'
import type { AgentContext } from '@/types/agent'

/**
 * Extrai quantidade mencionada na pergunta
 * Ex: "duas janelas", "3 unidades", "quero 2"
 */
function extractQuantityFromText(text: string): number {
  const lower = text.toLowerCase()
  
  // Números por extenso
  const numberWords: Record<string, number> = {
    'uma': 1, 'um': 1,
    'duas': 2, 'dois': 2,
    'três': 3, 'tres': 3,
    'quatro': 4,
    'cinco': 5,
    'seis': 6,
    'sete': 7,
    'oito': 8,
    'nove': 9,
    'dez': 10
  }
  
  for (const [word, num] of Object.entries(numberWords)) {
    if (lower.includes(word + ' janela') || lower.includes(word + ' unidade') || 
        lower.includes(word + ' peça') || lower.includes(word + ' peca')) {
      return num
    }
  }
  
  // Números digitados
  const patterns = [
    /(\d+)\s*(?:janelas?|unidades?|peças?|pecas?)/i,
    /(?:quero|preciso|comprar)\s*(\d+)/i,
    /(\d+)\s*(?:x|vezes)/i
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const num = parseInt(match[1], 10)
      if (num > 0 && num <= 100) return num
    }
  }
  
  return 1 // Default: 1 unidade
}

/**
 * POST /api/webhooks/mercadolivre/questions
 * Webhook para perguntas de pré-venda do Mercado Livre
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.text()
    console.log('[ML Questions Webhook] ========== NOVA NOTIFICAÇÃO ==========')
    console.log('[ML Questions Webhook] Body recebido:', body)
    
    let notification: MLWebhookNotification
    try {
      notification = JSON.parse(body)
    } catch (parseError) {
      console.error('[ML Questions Webhook] Erro ao parsear JSON:', parseError)
      return NextResponse.json({ status: 'error', reason: 'invalid_json' }, { status: 400 })
    }

    console.log('[ML Questions Webhook] Topic:', notification.topic)
    console.log('[ML Questions Webhook] Resource:', notification.resource)
    console.log('[ML Questions Webhook] User ID:', notification.user_id)

    // Verifica se é uma notificação de pergunta
    if (notification.topic !== 'questions') {
      console.log('[ML Questions Webhook] Ignorando - não é pergunta')
      return NextResponse.json({ status: 'ignored', reason: 'not_question' })
    }

    // Extrai ID da pergunta
    const questionId = extractQuestionIdFromResource(notification.resource)
    if (!questionId) {
      console.error('[ML Questions Webhook] Não foi possível extrair ID da pergunta:', notification.resource)
      return NextResponse.json({ status: 'error', reason: 'invalid_resource' }, { status: 400 })
    }

    console.log('[ML Questions Webhook] Question ID extraído:', questionId)

    // Busca detalhes da pergunta
    console.log('[ML Questions Webhook] Buscando detalhes da pergunta...')
    const question = await getQuestion(questionId)
    console.log('[ML Questions Webhook] Pergunta encontrada:', {
      id: question.id,
      text: question.text,
      status: question.status,
      item_id: question.item_id,
      from: question.from
    })

    // Ignora se já foi respondida
    if (question.status !== 'UNANSWERED') {
      console.log('[ML Questions Webhook] Pergunta já respondida, ignorando')
      return NextResponse.json({ status: 'ignored', reason: 'already_answered' })
    }

    // Tenta extrair CEP da pergunta
    const cep = extractCepFromText(question.text)
    console.log('[ML Questions Webhook] CEP extraído:', cep || 'NÃO ENCONTRADO')
    
    const supabase = createAdminClient()
    const buyerId = question.from.id.toString()
    
    let answerText: string
    let freightValue: number | null = null
    let freightIsSP = false
    let dimensions = { width: 100, height: 50, source: 'default' as const }
    let tokensUsed = 0
    let needsHumanReview = false
    let aiDisabledReason: string | null = null
    let toolsUsed: string[] = []

    // Extrair quantidade da pergunta
    const quantity = extractQuantityFromText(question.text)
    console.log('[ML Questions Webhook] Quantidade detectada:', quantity)

    // Buscar dados do produto
    console.log('[ML Questions Webhook] Buscando dados do item:', question.item_id)
    let productTitle = 'Janela de Correr'
    let windowType: WindowType = '2f'
    try {
      const item = await getItem(question.item_id)
      productTitle = item.title
      windowType = extractWindowTypeFromTitle(item.title)
      console.log('[ML Questions Webhook] Título do produto:', productTitle)
      console.log('[ML Questions Webhook] Tipo de janela detectado:', windowType)
    } catch (e) {
      console.log('[ML Questions Webhook] Não conseguiu buscar item, usando título padrão')
    }

    // Buscar dimensões do produto no anúncio
    dimensions = await getItemDimensions(question.item_id)
    console.log('[ML Questions Webhook] Dimensões obtidas:', dimensions)

    // ===== VERIFICAR SE IA ESTÁ DESATIVADA PARA ESTE BUYER =====
    const { data: aiControl } = await supabase
      .from('dc_ml_conversations')
      .select('ai_enabled')
      .eq('buyer_id', buyerId)
      .single()

    const isAIEnabled = aiControl?.ai_enabled ?? true
    console.log('[ML Questions Webhook] IA habilitada para buyer:', isAIEnabled)

    // Calcular frete se tiver CEP
    let freight: { value: number; isSP: boolean; estimatedDays: number; carrier?: string; error?: string; unitPrice?: number; quantity?: number } | null = null
    if (cep) {
      console.log('[ML Questions Webhook] Calculando frete para CEP:', cep, '| Tipo:', windowType, '| Qtd:', quantity)
      freight = await calculateWindowFreight(cep, dimensions.width, dimensions.height, quantity, windowType)
      console.log('[ML Questions Webhook] Resultado do frete:', freight)
      
      if (!freight.error) {
        freightValue = freight.value
        freightIsSP = freight.isSP
      }
    }

    // ===== PROCESSAR COM IA OU DEIXAR PENDENTE =====
    if (!isAIEnabled) {
      // IA desativada - salvar pergunta como pendente para resposta manual
      console.log('[ML Questions Webhook] ⚠️ IA desativada para este buyer - pergunta ficará pendente')
      
      await supabase.from('dc_ml_questions').insert({
        question_id: questionId,
        item_id: question.item_id,
        question_text: question.text,
        buyer_id: buyerId,
        buyer_nickname: question.from.nickname,
        cep_extracted: cep,
        freight_calculated: freightValue,
        freight_is_sp: freightIsSP,
        answer_text: null,
        status: 'pending',
        item_title: productTitle,
        needs_human_review: true,
        ai_disabled_reason: 'IA desativada pelo operador',
        ml_created_at: question.date_created
      })

      const elapsed = Date.now() - startTime
      console.log(`[ML Questions Webhook] ========== FIM - PENDENTE HUMANO (${elapsed}ms) ==========`)

      return NextResponse.json({
        status: 'pending_human',
        questionId,
        reason: 'AI disabled for this buyer',
        elapsedMs: elapsed
      })
    }

    // Gerar resposta humanizada com IA usando AGENTE UNIFICADO
    console.log('[ML Questions Webhook] Gerando resposta com AGENTE UNIFICADO...')
    
    // Montar contexto do agente para ML
    const agentContext: AgentContext = {
      channel: 'mercadolivre',
      mlQuestionId: questionId,
      mlItemId: question.item_id,
      mlBuyerId: buyerId,
      productTitle,
      productDimensions: {
        width: dimensions.width,
        height: dimensions.height
      },
      freightInfo: freight && !freight.error ? {
        cep: cep!,
        value: freight.value,
        isSP: freight.isSP,
        estimatedDays: freight.estimatedDays,
        carrier: freight.carrier,
        unitPrice: freight.unitPrice,
        quantity: freight.quantity || quantity
      } : undefined,
      quantity // Quantidade solicitada na pergunta
    }

    // Chamar agente unificado (sem lead, sem conversation - é pré-venda)
    const aiResponse = await processMessage(question.text, agentContext, null, null)

    if (aiResponse.success && aiResponse.response) {
      answerText = aiResponse.response
      tokensUsed = aiResponse.tokensUsed || 0
      toolsUsed = aiResponse.toolsUsed || []
      console.log('[ML Questions Webhook] ✅ Resposta AGENTE UNIFICADO:', answerText)
      console.log('[ML Questions Webhook] Tokens usados:', tokensUsed)
      console.log('[ML Questions Webhook] Tools usadas:', toolsUsed)

      // ===== DETECTAR MEDIDAS NÃO PADRÃO =====
      const nonStandardCheck = detectNonStandardMeasurement(answerText, toolsUsed)
      if (nonStandardCheck.isNonStandard) {
        console.log('[ML Questions Webhook] ⚠️ MEDIDA NÃO PADRÃO DETECTADA:', nonStandardCheck.reason)
        needsHumanReview = true
        aiDisabledReason = nonStandardCheck.reason || 'Medida não padrão detectada'

        // Desativar IA para este buyer
        await supabase.from('dc_ml_conversations').upsert({
          pack_id: `buyer_${buyerId}`,
          buyer_id: buyerId,
          buyer_name: question.from.nickname,
          ai_enabled: false,
          status: 'active'
        }, { onConflict: 'buyer_id' })

        console.log('[ML Questions Webhook] IA desativada para buyer:', buyerId)
      }
    } else {
      // Fallback para template se IA falhar
      console.log('[ML Questions Webhook] ⚠️ Agente falhou, usando fallback')
      answerText = generateFallbackResponse(cep, freight)
    }

    console.log('[ML Questions Webhook] Resposta final:', answerText)
    console.log('[ML Questions Webhook] Caracteres:', answerText.length)

    // Salva no banco com novos campos
    console.log('[ML Questions Webhook] Salvando pergunta no banco...')
    const { error: insertError } = await supabase.from('dc_ml_questions').insert({
      question_id: questionId,
      item_id: question.item_id,
      question_text: question.text,
      buyer_id: buyerId,
      buyer_nickname: question.from.nickname,
      cep_extracted: cep,
      freight_calculated: freightValue,
      freight_is_sp: freightIsSP,
      answer_text: answerText,
      status: 'pending',
      item_title: productTitle,
      needs_human_review: needsHumanReview,
      ai_disabled_reason: aiDisabledReason,
      ml_created_at: question.date_created
    })
    
    if (insertError) {
      console.error('[ML Questions Webhook] Erro ao salvar no banco:', insertError)
    } else {
      console.log('[ML Questions Webhook] Pergunta salva no banco com sucesso')
    }

    // Responde a pergunta
    console.log('[ML Questions Webhook] Enviando resposta para o ML...')
    const result = await answerQuestion(questionId, answerText)

    if (result.success) {
      // Atualiza status para respondida
      await supabase
        .from('dc_ml_questions')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('question_id', questionId)

      console.log('[ML Questions Webhook] ✅ Pergunta respondida com sucesso!')
    } else {
      // Marca como falha
      await supabase
        .from('dc_ml_questions')
        .update({ status: 'failed' })
        .eq('question_id', questionId)

      console.error('[ML Questions Webhook] ❌ Falha ao responder pergunta:', result.error)
    }

    const elapsed = Date.now() - startTime
    console.log(`[ML Questions Webhook] ========== FIM (${elapsed}ms) ==========`)

    return NextResponse.json({
      status: 'processed',
      questionId,
      cepFound: !!cep,
      dimensions: `${dimensions.width}x${dimensions.height}cm (${dimensions.source})`,
      freightCalculated: freightValue,
      answered: result.success,
      needsHumanReview,
      aiDisabledReason,
      elapsedMs: elapsed
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('[ML Questions Webhook] ❌ ERRO FATAL:', error)
    console.error('[ML Questions Webhook] Stack:', error instanceof Error ? error.stack : 'N/A')
    console.log(`[ML Questions Webhook] ========== ERRO (${elapsed}ms) ==========`)
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Internal server error',
        elapsedMs: elapsed
      },
      { status: 500 }
    )
  }
}

/**
 * Gera resposta de fallback caso o agente falhe
 */
function generateFallbackResponse(
  cep: string | null, 
  freight: { value: number; isSP: boolean; estimatedDays: number; carrier?: string; error?: string } | null
): string {
  if (cep && freight && !freight.error) {
    if (freight.isSP) {
      return `Boa tarde! Para o CEP ${cep} em SP, o frete fica R$ ${freight.value.toFixed(2).replace('.', ',')}. Entregas às quintas-feiras. Para pagar: finalize a compra, vá em Minhas Compras e clique em Adicionar Taxa de Envio. Qualquer dúvida, estou à disposição!`
    } else {
      return `Boa tarde! Para o CEP ${cep}, o frete fica R$ ${freight.value.toFixed(2).replace('.', ',')} com prazo de ${freight.estimatedDays} dias. Para pagar: finalize a compra, vá em Minhas Compras e clique em Adicionar Taxa de Envio. Qualquer dúvida, estou à disposição!`
    }
  }
  
  return 'Boa tarde! Obrigada pelo interesse. Para calcular o frete, por favor informe seu CEP. Trabalhamos com janelas sob medida, entrega para todo Brasil. Qualquer dúvida, estou à disposição!'
}

/**
 * GET para verificação do webhook pelo ML
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'mercadolivre-questions' })
}
