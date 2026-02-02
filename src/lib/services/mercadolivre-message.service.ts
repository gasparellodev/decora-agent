/**
 * Serviço de Mensagens do Mercado Livre
 * Funções utilitárias para gerenciar conversas e mensagens
 * 
 * NOTA: Templates fixos foram removidos.
 * Mensagens são geradas pelo agente unificado em agent.service.ts
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { MLConversationData } from '@/types/mercadolivre'

// =====================================================
// CONSTANTES
// =====================================================

const ML_MAX_CHARS = 350

// =====================================================
// FUNÇÕES DE UTILIDADE
// =====================================================

/**
 * Divide mensagem longa em partes de até 350 caracteres
 * Tenta quebrar em pontos naturais (., !, ?)
 */
export function splitMessageFor350Chars(message: string): string[] {
  if (message.length <= ML_MAX_CHARS) {
    return [message]
  }

  const parts: string[] = []
  let remaining = message

  while (remaining.length > 0) {
    if (remaining.length <= ML_MAX_CHARS) {
      parts.push(remaining.trim())
      break
    }

    // Procura ponto de quebra natural
    let breakPoint = ML_MAX_CHARS
    const punctuation = ['. ', '! ', '? ', '\n', ', ']
    
    for (const punct of punctuation) {
      const lastPunct = remaining.lastIndexOf(punct, ML_MAX_CHARS)
      if (lastPunct > ML_MAX_CHARS * 0.5) { // Pelo menos metade da mensagem
        breakPoint = lastPunct + punct.length
        break
      }
    }

    // Se não encontrou, quebra no espaço mais próximo
    if (breakPoint === ML_MAX_CHARS) {
      const lastSpace = remaining.lastIndexOf(' ', ML_MAX_CHARS)
      if (lastSpace > ML_MAX_CHARS * 0.5) {
        breakPoint = lastSpace + 1
      }
    }

    parts.push(remaining.slice(0, breakPoint).trim())
    remaining = remaining.slice(breakPoint).trim()
  }

  return parts
}

// =====================================================
// GERENCIAMENTO DE CONVERSAS
// =====================================================

function getSupabase() {
  return createAdminClient()
}

/**
 * Busca ou cria conversa para um pack
 */
export async function getOrCreateMLConversation(
  packId: string,
  orderId?: string,
  buyerId?: string,
  buyerName?: string
): Promise<MLConversationData & { id: string }> {
  const supabase = getSupabase()

  // Tenta buscar conversa existente
  const { data: existing } = await supabase
    .from('dc_ml_conversations')
    .select('*')
    .eq('pack_id', packId)
    .single()

  if (existing) {
    return {
      id: existing.id,
      packId: existing.pack_id,
      orderId: existing.order_id,
      buyerId: existing.buyer_id,
      buyerName: existing.buyer_name,
      freightPaid: existing.freight_paid,
      freightValue: existing.freight_value,
      dataCollected: existing.data_collected || {},
      glassChoice: existing.glass_choice,
      status: existing.status
    }
  }

  // Cria nova conversa
  const { data: newConv, error } = await supabase
    .from('dc_ml_conversations')
    .insert({
      pack_id: packId,
      order_id: orderId,
      buyer_id: buyerId || '',
      buyer_name: buyerName,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: newConv.id,
    packId: newConv.pack_id,
    orderId: newConv.order_id,
    buyerId: newConv.buyer_id,
    buyerName: newConv.buyer_name,
    freightPaid: false,
    freightValue: undefined,
    dataCollected: {},
    glassChoice: undefined,
    status: 'active'
  }
}

/**
 * Atualiza conversa
 */
export async function updateMLConversation(
  packId: string,
  updates: Partial<{
    status: string
    freight_paid: boolean
    freight_value: number
    data_collected: Record<string, string>
    glass_choice: string
    welcome_sent: boolean
    chapatex_sent: boolean
    cintas_sent: boolean
    data_request_sent: boolean
    glass_request_sent: boolean
    last_message_at: string
  }>
): Promise<void> {
  const supabase = getSupabase()
  
  await supabase
    .from('dc_ml_conversations')
    .update(updates)
    .eq('pack_id', packId)
}

/**
 * Salva mensagem no histórico
 */
export async function saveMLMessage(
  packId: string,
  conversationId: string,
  direction: 'inbound' | 'outbound',
  senderType: 'buyer' | 'agent' | 'human' | 'system',
  content: string,
  mlMessageId?: string
): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from('dc_ml_messages')
    .insert({
      conversation_id: conversationId,
      pack_id: packId,
      ml_message_id: mlMessageId,
      direction,
      sender_type: senderType,
      content
    })
}

// =====================================================
// NOTA: Funções de fluxo de pós-venda foram movidas para agent.service.ts
// - sendWelcomeSequence -> generatePostSaleSequence
// - processClientDataResponse -> processClientResponse  
// - processGlassChoice -> processClientResponse
// - sendStatusNotification -> generateStatusNotification
// =====================================================
