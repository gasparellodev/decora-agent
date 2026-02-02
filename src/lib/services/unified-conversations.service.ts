/**
 * Serviço de Conversas Unificado
 * Gerencia conversas de WhatsApp e Mercado Livre em uma interface única
 */

import { createClient } from '@/lib/supabase/client'
import type {
  UnifiedConversation,
  UnifiedMessage,
  Conversation,
  Message,
  Lead,
  MLConversation,
  MLMessage,
  MLQuestion,
  ChannelType,
  ConversationSubtype
} from '@/types/database'

// =====================================================
// TIPOS INTERNOS
// =====================================================

interface ConversationWithLead extends Conversation {
  lead: Lead
}

type StatusFilter = 'all' | 'active' | 'waiting'
type ChannelFilter = 'all' | 'whatsapp' | 'mercadolivre'

// =====================================================
// CONVERSÃO DE DADOS
// =====================================================

/**
 * Converte conversa do WhatsApp para formato unificado
 */
function convertWhatsAppConversation(conv: ConversationWithLead): UnifiedConversation {
  return {
    id: conv.id,
    channel: 'whatsapp',
    status: conv.status,
    leadId: conv.lead_id,
    leadName: conv.lead?.name || null,
    leadPhone: conv.lead?.phone || null,
    lastMessageAt: conv.lead?.last_message_at || conv.created_at,
    createdAt: conv.created_at,
    original: conv,
    lead: conv.lead
  }
}

/**
 * Converte conversa do Mercado Livre para formato unificado
 */
function convertMLConversation(conv: MLConversation): UnifiedConversation {
  return {
    id: conv.id,
    channel: 'mercadolivre',
    subtype: 'conversation',
    status: conv.status,
    buyerId: conv.buyer_id,
    buyerName: conv.buyer_name,
    packId: conv.pack_id,
    leadName: conv.buyer_name || conv.data_collected?.name || null,
    leadPhone: conv.data_collected?.whatsapp || null,
    lastMessageAt: conv.last_message_at || conv.created_at,
    createdAt: conv.created_at,
    original: conv,
    aiEnabled: conv.ai_enabled ?? true
  }
}

/**
 * Converte pergunta do Mercado Livre para formato unificado
 */
function convertMLQuestion(q: MLQuestion): UnifiedConversation {
  return {
    id: q.id,
    channel: 'mercadolivre',
    subtype: 'question',
    status: q.needs_human_review ? 'needs_review' : q.status,
    buyerId: q.buyer_id || undefined,
    buyerName: q.buyer_nickname,
    itemId: q.item_id,
    itemTitle: q.item_title,
    questionId: q.question_id,
    leadName: q.buyer_nickname,
    leadPhone: null,
    lastMessageAt: q.created_at,
    lastMessagePreview: q.question_text.length > 50 
      ? q.question_text.substring(0, 50) + '...' 
      : q.question_text,
    createdAt: q.created_at,
    original: q,
    needsHumanReview: q.needs_human_review,
    aiEnabled: true
  }
}

/**
 * Converte mensagem do WhatsApp para formato unificado
 */
function convertWhatsAppMessage(msg: Message): UnifiedMessage {
  return {
    id: msg.id,
    channel: 'whatsapp',
    conversationId: msg.conversation_id,
    direction: msg.direction,
    senderType: msg.sender_type,
    content: msg.content,
    sentAt: msg.sent_at,
    original: msg
  }
}

/**
 * Converte mensagem do Mercado Livre para formato unificado
 */
function convertMLMessage(msg: MLMessage): UnifiedMessage {
  return {
    id: msg.id,
    channel: 'mercadolivre',
    conversationId: msg.conversation_id || msg.pack_id,
    direction: msg.direction,
    senderType: msg.sender_type,
    content: msg.content,
    sentAt: msg.created_at,
    original: msg
  }
}

// =====================================================
// FUNÇÕES DE BUSCA
// =====================================================

/**
 * Busca conversas unificadas de todos os canais
 */
export async function loadUnifiedConversations(
  statusFilter: StatusFilter = 'all',
  search: string = '',
  channelFilter: ChannelFilter = 'all'
): Promise<UnifiedConversation[]> {
  const supabase = createClient()
  const conversations: UnifiedConversation[] = []

  // Buscar conversas do WhatsApp
  if (channelFilter === 'all' || channelFilter === 'whatsapp') {
    let waQuery = supabase
      .from('dc_conversations')
      .select('*, lead:dc_leads(*)')
      .order('created_at', { ascending: false })

    // Filtro de status
    if (statusFilter === 'active') {
      waQuery = waQuery.eq('status', 'active')
    } else if (statusFilter === 'waiting') {
      waQuery = waQuery.eq('status', 'waiting_human')
    }

    const { data: waConversations, error: waError } = await waQuery

    if (waError) {
      console.error('Erro ao buscar conversas WhatsApp:', waError)
    } else if (waConversations) {
      const filtered = search
        ? waConversations.filter((c: ConversationWithLead) =>
            c.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.lead?.phone?.includes(search)
          )
        : waConversations

      conversations.push(...filtered.map((c: ConversationWithLead) => convertWhatsAppConversation(c)))
    }
  }

  // Buscar conversas do Mercado Livre (pós-venda)
  if (channelFilter === 'all' || channelFilter === 'mercadolivre') {
    let mlQuery = supabase
      .from('dc_ml_conversations')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtro de status
    if (statusFilter === 'active') {
      mlQuery = mlQuery.in('status', ['active', 'waiting_data', 'waiting_glass'])
    } else if (statusFilter === 'waiting') {
      mlQuery = mlQuery.in('status', ['waiting_data', 'waiting_glass'])
    }

    const { data: mlConversations, error: mlError } = await mlQuery

    if (mlError) {
      console.error('Erro ao buscar conversas ML:', mlError)
    } else if (mlConversations) {
      // Filtrar conversas que não são apenas controle de IA (pack_id não começa com buyer_)
      const realConversations = mlConversations.filter((c: MLConversation) => 
        !c.pack_id.startsWith('buyer_')
      )
      
      const filtered = search
        ? realConversations.filter((c: MLConversation) =>
            c.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.pack_id?.includes(search)
          )
        : realConversations

      conversations.push(...filtered.map((c: MLConversation) => convertMLConversation(c)))
    }

    // Buscar perguntas do Mercado Livre (pré-venda)
    let questionsQuery = supabase
      .from('dc_ml_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limitar para performance

    // Filtro de status para perguntas
    if (statusFilter === 'waiting') {
      questionsQuery = questionsQuery.or('status.eq.pending,needs_human_review.eq.true')
    }

    const { data: mlQuestions, error: questionsError } = await questionsQuery

    if (questionsError) {
      console.error('Erro ao buscar perguntas ML:', questionsError)
    } else if (mlQuestions) {
      const filtered = search
        ? mlQuestions.filter((q: MLQuestion) =>
            q.buyer_nickname?.toLowerCase().includes(search.toLowerCase()) ||
            q.question_text?.toLowerCase().includes(search.toLowerCase()) ||
            q.item_title?.toLowerCase().includes(search.toLowerCase())
          )
        : mlQuestions

      conversations.push(...filtered.map((q: MLQuestion) => convertMLQuestion(q)))
    }
  }

  // Ordenar por última mensagem (mais recente primeiro)
  conversations.sort((a, b) => {
    const dateA = new Date(a.lastMessageAt || a.createdAt).getTime()
    const dateB = new Date(b.lastMessageAt || b.createdAt).getTime()
    return dateB - dateA
  })

  return conversations
}

/**
 * Busca mensagens de uma conversa específica
 */
export async function loadUnifiedMessages(
  conversationId: string,
  channel: ChannelType,
  subtype?: ConversationSubtype
): Promise<UnifiedMessage[]> {
  const supabase = createClient()

  if (channel === 'whatsapp') {
    const { data, error } = await supabase
      .from('dc_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar mensagens WhatsApp:', error)
      return []
    }

    return (data || []).map((msg: Message) => convertWhatsAppMessage(msg))
  } else if (subtype === 'question') {
    // Mercado Livre - Pergunta pré-venda
    return loadMLQuestionMessages(conversationId)
  } else {
    // Mercado Livre - Conversa pós-venda
    const { data, error } = await supabase
      .from('dc_ml_messages')
      .select('*')
      .or(`conversation_id.eq.${conversationId},pack_id.eq.${conversationId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar mensagens ML:', error)
      return []
    }

    return (data || []).map((msg: MLMessage) => convertMLMessage(msg))
  }
}

/**
 * Carrega mensagens de uma pergunta ML (pergunta + resposta)
 */
export async function loadMLQuestionMessages(questionId: string): Promise<UnifiedMessage[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('dc_ml_questions')
    .select('*')
    .eq('id', questionId)
    .single()
  
  if (error || !data) {
    console.error('Erro ao buscar pergunta ML:', error)
    return []
  }

  const question = data as MLQuestion
  const messages: UnifiedMessage[] = []

  // Mensagem da pergunta (inbound)
  messages.push({
    id: `${question.id}-q`,
    channel: 'mercadolivre',
    conversationId: question.id,
    direction: 'inbound',
    senderType: 'buyer',
    content: question.question_text,
    sentAt: question.ml_created_at || question.created_at,
    original: question as unknown as MLMessage
  })

  // Mensagem da resposta (outbound) se existir
  if (question.answer_text) {
    messages.push({
      id: `${question.id}-a`,
      channel: 'mercadolivre',
      conversationId: question.id,
      direction: 'outbound',
      senderType: 'agent',
      content: question.answer_text,
      sentAt: question.answered_at || question.created_at,
      original: question as unknown as MLMessage
    })
  }

  return messages
}

/**
 * Busca uma conversa específica
 */
export async function getUnifiedConversation(
  conversationId: string,
  channel: ChannelType,
  subtype?: ConversationSubtype
): Promise<UnifiedConversation | null> {
  const supabase = createClient()

  if (channel === 'whatsapp') {
    const { data, error } = await supabase
      .from('dc_conversations')
      .select('*, lead:dc_leads(*)')
      .eq('id', conversationId)
      .single()

    if (error || !data) {
      console.error('Erro ao buscar conversa WhatsApp:', error)
      return null
    }

    return convertWhatsAppConversation(data as ConversationWithLead)
  } else if (subtype === 'question') {
    // Buscar pergunta ML
    const { data, error } = await supabase
      .from('dc_ml_questions')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error || !data) {
      console.error('Erro ao buscar pergunta ML:', error)
      return null
    }

    return convertMLQuestion(data as MLQuestion)
  } else {
    const { data, error } = await supabase
      .from('dc_ml_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error || !data) {
      console.error('Erro ao buscar conversa ML:', error)
      return null
    }

    return convertMLConversation(data as MLConversation)
  }
}

// =====================================================
// FUNÇÕES DE ENVIO
// =====================================================

/**
 * Envia mensagem para uma conversa
 */
export async function sendUnifiedMessage(
  conversationId: string,
  channel: ChannelType,
  content: string,
  metadata?: {
    packId?: string
    buyerId?: string
    phone?: string
    leadId?: string
  }
): Promise<{ success: boolean; error?: string }> {
  if (channel === 'whatsapp') {
    // Enviar via API do WhatsApp
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: metadata?.phone,
        message: content,
        lead_id: metadata?.leadId
      })
    })

    if (!response.ok) {
      return { success: false, error: 'Erro ao enviar mensagem WhatsApp' }
    }

    return { success: true }
  } else {
    // Enviar via API do Mercado Livre
    const response = await fetch('/api/mercadolivre/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId: metadata?.packId,
        buyerId: metadata?.buyerId,
        message: content,
        conversationId
      })
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Erro ao enviar mensagem ML' }
    }

    return { success: true }
  }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Retorna o label de status formatado
 */
export function getStatusLabel(status: string, channel: ChannelType, subtype?: ConversationSubtype): string {
  if (channel === 'whatsapp') {
    const labels: Record<string, string> = {
      'active': 'Ativa',
      'waiting_human': 'Aguardando Humano',
      'closed': 'Fechada',
      'archived': 'Arquivada'
    }
    return labels[status] || status
  } else if (subtype === 'question') {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'answered': 'Respondida',
      'failed': 'Falhou',
      'skipped': 'Ignorada',
      'needs_review': 'Revisão Necessária'
    }
    return labels[status] || status
  } else {
    const labels: Record<string, string> = {
      'active': 'Ativa',
      'waiting_data': 'Aguardando Dados',
      'waiting_glass': 'Aguardando Vidro',
      'complete': 'Completa',
      'closed': 'Fechada'
    }
    return labels[status] || status
  }
}

/**
 * Retorna a cor do badge de status
 */
export function getStatusColor(status: string, channel: ChannelType): string {
  if (channel === 'whatsapp') {
    const colors: Record<string, string> = {
      'active': 'bg-green-500',
      'waiting_human': 'bg-yellow-500',
      'closed': 'bg-gray-500',
      'archived': 'bg-gray-400'
    }
    return colors[status] || 'bg-gray-500'
  } else {
    const colors: Record<string, string> = {
      'active': 'bg-yellow-500',
      'waiting_data': 'bg-orange-500',
      'waiting_glass': 'bg-orange-400',
      'complete': 'bg-green-500',
      'closed': 'bg-gray-500'
    }
    return colors[status] || 'bg-gray-500'
  }
}

/**
 * Retorna o ícone do canal
 */
export function getChannelIcon(channel: ChannelType): string {
  return channel === 'whatsapp' ? '📱' : '🛒'
}

/**
 * Limite de caracteres para o Mercado Livre
 */
export const ML_MAX_CHARS = 350

// =====================================================
// FUNÇÕES PARA PERGUNTAS ML
// =====================================================

/**
 * Responde uma pergunta ML manualmente
 */
export async function answerMLQuestion(
  questionId: string,
  answerText: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/mercadolivre/answer-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, answerText })
  })

  if (!response.ok) {
    const data = await response.json()
    return { success: false, error: data.error || 'Erro ao responder pergunta' }
  }

  return { success: true }
}

/**
 * Toggle IA para um buyer ML
 */
export async function toggleMLAI(
  buyerId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/mercadolivre/toggle-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerId, enabled })
  })

  if (!response.ok) {
    const data = await response.json()
    return { success: false, error: data.error || 'Erro ao alterar configuração de IA' }
  }

  return { success: true }
}

/**
 * Busca status de IA para um buyer
 */
export async function getMLAIStatus(buyerId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('dc_ml_conversations')
    .select('ai_enabled')
    .eq('buyer_id', buyerId)
    .single()

  return data?.ai_enabled ?? true
}
