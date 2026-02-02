/**
 * Serviço de Feedback via Reações WhatsApp
 * 
 * Processa feedbacks negativos (❌) e positivos (✅) dos clientes,
 * analisa erros com IA e sugere correções no prompt/knowledge base.
 */

import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { formatForWhatsApp, calculateTypingTime, sleep } from '@/lib/utils/whatsapp-formatter'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

function getSupabase() {
  return createAdminClient()
}

// =====================================================
// TIPOS
// =====================================================

export interface FeedbackAnalysis {
  correctedMessage: string
  errorType: 'factual' | 'tone' | 'information' | 'product_info' | 'measurement' | 'other'
  errorDescription: string
  suggestedPromptChanges: string | null
  suggestedKBUpdates: string | null
  confidence: number
}

export interface Feedback {
  id: string
  message_id: string
  conversation_id: string
  lead_id: string
  reaction: 'negative' | 'positive'
  reaction_emoji: string
  original_content: string
  corrected_content: string | null
  feedback_text: string | null
  error_type: string | null
  ai_analysis: FeedbackAnalysis | null
  status: string
  created_at: string
}

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * Processa a resposta do cliente explicando o erro
 * Chamado quando o cliente responde à pergunta "o que estava errado?"
 */
export async function processFeedbackResponse(
  conversationId: string,
  feedbackText: string
): Promise<{
  success: boolean
  correctedMessage?: string
  error?: string
}> {
  try {
    // 1. Buscar feedback pendente mais recente da conversa
    const { data: feedback, error: feedbackError } = await getSupabase()
      .from('dc_message_feedback')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'awaiting_response')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (feedbackError || !feedback) {
      console.log('No pending feedback found for conversation:', conversationId)
      return { success: false, error: 'No pending feedback' }
    }

    // 2. Atualizar feedback com o texto recebido
    await getSupabase()
      .from('dc_message_feedback')
      .update({
        feedback_text: feedbackText,
        responded_at: new Date().toISOString(),
        status: 'in_review'
      })
      .eq('id', feedback.id)

    // 3. Analisar e gerar correção com IA
    const analysis = await analyzeAndCorrect(feedback.original_content, feedbackText)

    // 4. Atualizar feedback com análise
    await getSupabase()
      .from('dc_message_feedback')
      .update({
        corrected_content: analysis.correctedMessage,
        error_type: analysis.errorType,
        ai_analysis: analysis,
        suggested_prompt_changes: analysis.suggestedPromptChanges,
        suggested_kb_updates: analysis.suggestedKBUpdates,
        status: analysis.confidence > 0.7 ? 'applied' : 'in_review',
        resolved_at: analysis.confidence > 0.7 ? new Date().toISOString() : null
      })
      .eq('id', feedback.id)

    // 5. Buscar lead para enviar resposta corrigida
    const { data: lead } = await getSupabase()
      .from('dc_leads')
      .select('phone, name')
      .eq('id', feedback.lead_id)
      .single()

    if (lead?.phone && analysis.correctedMessage) {
      const evolution = getEvolutionProvider()
      const formattedResponse = formatForWhatsApp(analysis.correctedMessage)

      // Enviar mensagem corrigida
      try {
        const typingTime = calculateTypingTime(formattedResponse)
        await evolution.sendPresence(lead.phone, 'composing', typingTime)
        await sleep(typingTime)
        
        await evolution.sendText(
          lead.phone,
          `Entendi! Deixa eu corrigir:\n\n${formattedResponse}`
        )

        // Salvar mensagem corrigida
        await getSupabase().from('dc_messages').insert({
          conversation_id: conversationId,
          lead_id: feedback.lead_id,
          direction: 'outbound',
          sender_type: 'agent',
          content: `Entendi! Deixa eu corrigir:\n\n${formattedResponse}`,
          metadata: {
            is_correction: true,
            original_feedback_id: feedback.id
          }
        })
      } catch (sendError) {
        console.error('Error sending corrected message:', sendError)
      }

      // Restaurar status da conversa
      await getSupabase()
        .from('dc_conversations')
        .update({ status: 'active' })
        .eq('id', conversationId)
    }

    return {
      success: true,
      correctedMessage: analysis.correctedMessage
    }

  } catch (error) {
    console.error('Error processing feedback response:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Analisa o erro e gera uma mensagem corrigida usando IA
 */
async function analyzeAndCorrect(
  originalMessage: string,
  feedbackText: string
): Promise<FeedbackAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um analista de qualidade da Decora Esquadrias. O cliente reagiu negativamente a uma mensagem do nosso agente de vendas.

Sua tarefa:
1. Analisar o que estava errado na mensagem original
2. Gerar uma mensagem CORRIGIDA e adequada
3. Identificar o tipo de erro
4. Sugerir mudanças no prompt do sistema se necessário
5. Sugerir atualizações na base de conhecimento se necessário

REGRAS DA MENSAGEM CORRIGIDA:
- Máximo 350 caracteres
- Tom amigável e profissional
- Nunca mencionar aspectos negativos dos produtos
- Focar em benefícios, não limitações
- Ser direta e clara

TIPOS DE ERRO:
- factual: informação factualmente incorreta (preço, medida, prazo errado)
- tone: tom inadequado (muito formal, robótico, ou rude)
- information: informação incompleta ou confusa
- product_info: informação errada sobre produtos
- measurement: erro relacionado a medidas/dimensões
- other: outros tipos de erro

Responda em JSON:
{
  "correctedMessage": "mensagem corrigida aqui",
  "errorType": "tipo do erro",
  "errorDescription": "descrição breve do erro",
  "suggestedPromptChanges": "sugestão de mudança no prompt ou null",
  "suggestedKBUpdates": "sugestão de update na KB ou null",
  "confidence": 0.0 a 1.0 (confiança na correção)
}`
        },
        {
          role: 'user',
          content: `MENSAGEM ORIGINAL DO AGENTE:
${originalMessage}

FEEDBACK DO CLIENTE (o que estava errado):
${feedbackText}`
        }
      ]
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content) as FeedbackAnalysis

    // Garantir que a mensagem corrigida não seja muito longa
    if (parsed.correctedMessage && parsed.correctedMessage.length > 500) {
      parsed.correctedMessage = parsed.correctedMessage.substring(0, 497) + '...'
    }

    return {
      correctedMessage: parsed.correctedMessage || originalMessage,
      errorType: parsed.errorType || 'other',
      errorDescription: parsed.errorDescription || 'Erro não identificado',
      suggestedPromptChanges: parsed.suggestedPromptChanges || null,
      suggestedKBUpdates: parsed.suggestedKBUpdates || null,
      confidence: parsed.confidence || 0.5
    }

  } catch (error) {
    console.error('Error analyzing feedback:', error)
    
    // Retorno padrão em caso de erro
    return {
      correctedMessage: originalMessage,
      errorType: 'other',
      errorDescription: 'Erro ao analisar feedback',
      suggestedPromptChanges: null,
      suggestedKBUpdates: null,
      confidence: 0
    }
  }
}

/**
 * Verifica se uma conversa está aguardando feedback
 */
export async function isAwaitingFeedback(conversationId: string): Promise<boolean> {
  const { data: conversation } = await getSupabase()
    .from('dc_conversations')
    .select('status')
    .eq('id', conversationId)
    .single()

  return conversation?.status === 'awaiting_feedback'
}

/**
 * Busca feedbacks pendentes de revisão
 */
export async function getPendingFeedbacks(): Promise<Feedback[]> {
  const { data, error } = await getSupabase()
    .from('dc_message_feedback')
    .select('*')
    .in('status', ['pending', 'in_review', 'awaiting_response'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching pending feedbacks:', error)
    return []
  }

  return data as Feedback[]
}

/**
 * Busca estatísticas de feedback
 */
export async function getFeedbackStats(daysBack: number = 30): Promise<{
  total: number
  negative: number
  positive: number
  applied: number
  pending: number
  satisfactionRate: number
  mostCommonError: string | null
}> {
  const { data, error } = await getSupabase()
    .rpc('get_feedback_stats', { days_back: daysBack })

  if (error || !data || data.length === 0) {
    return {
      total: 0,
      negative: 0,
      positive: 0,
      applied: 0,
      pending: 0,
      satisfactionRate: 100,
      mostCommonError: null
    }
  }

  const stats = data[0]
  return {
    total: stats.total_feedbacks || 0,
    negative: stats.negative_feedbacks || 0,
    positive: stats.positive_feedbacks || 0,
    applied: stats.applied_corrections || 0,
    pending: stats.pending_reviews || 0,
    satisfactionRate: stats.satisfaction_rate || 100,
    mostCommonError: stats.most_common_error || null
  }
}

/**
 * Aplica uma correção sugerida ao prompt
 */
export async function applyPromptCorrection(
  feedbackId: string,
  correctionType: string,
  description: string,
  afterText: string,
  beforeText?: string,
  promptSection?: string
): Promise<boolean> {
  try {
    // Registrar a correção aplicada
    const { error } = await getSupabase()
      .from('dc_prompt_corrections')
      .insert({
        feedback_id: feedbackId,
        correction_type: correctionType,
        description,
        before_text: beforeText,
        after_text: afterText,
        prompt_section: promptSection,
        is_active: true
      })

    if (error) {
      console.error('Error saving prompt correction:', error)
      return false
    }

    // Atualizar status do feedback
    await getSupabase()
      .from('dc_message_feedback')
      .update({
        status: 'applied',
        applied_to: ['prompt'],
        resolved_at: new Date().toISOString()
      })
      .eq('id', feedbackId)

    return true

  } catch (error) {
    console.error('Error applying prompt correction:', error)
    return false
  }
}

/**
 * Descarta um feedback (marca como dismissed)
 */
export async function dismissFeedback(
  feedbackId: string,
  reason?: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from('dc_message_feedback')
    .update({
      status: 'dismissed',
      review_notes: reason,
      resolved_at: new Date().toISOString()
    })
    .eq('id', feedbackId)

  return !error
}

/**
 * Busca histórico de correções aplicadas
 */
export async function getAppliedCorrections(): Promise<{
  id: string
  correction_type: string
  description: string
  applied_at: string
  is_active: boolean
}[]> {
  const { data, error } = await getSupabase()
    .from('dc_prompt_corrections')
    .select('id, correction_type, description, applied_at, is_active')
    .order('applied_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching corrections:', error)
    return []
  }

  return data
}

/**
 * Reverte uma correção aplicada
 */
export async function revertCorrection(correctionId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('dc_prompt_corrections')
    .update({
      is_active: false,
      reverted_at: new Date().toISOString()
    })
    .eq('id', correctionId)

  return !error
}
