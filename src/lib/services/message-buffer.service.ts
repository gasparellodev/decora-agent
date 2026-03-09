import type { Lead, Conversation } from '@/types/database'
import type { AgentContext, IncomingProductContext } from '@/types/agent'
import { processMessage } from './agent.service'

/**
 * Serviço de buffer de mensagens
 * 
 * Quando o cliente envia várias mensagens seguidas, este serviço
 * aguarda um tempo (debounce) antes de processar todas juntas.
 */

interface BufferedMessage {
  content: string
  mediaType?: string
  receivedAt: Date
  productContext?: IncomingProductContext
}

interface MessageBuffer {
  lead: Lead
  conversation: Conversation
  messages: BufferedMessage[]
  timeoutId: NodeJS.Timeout | null
  productContext?: IncomingProductContext
}

// Map de buffers por leadId
const messageBuffers = new Map<string, MessageBuffer>()

// Configurações
const BUFFER_TIMEOUT_MS = 8000 // 8 segundos - simula tempo de leitura humano
const TYPING_STOPPED_MS = 3000 // 3 segundos após parar de digitar
const MAX_BUFFER_SIZE = 10     // Máximo de mensagens no buffer
const MAX_BUFFER_AGE_MS = 30000 // Máximo de 30 segundos de buffer total

/**
 * Adiciona uma mensagem ao buffer
 * Se o timeout expirar, processa todas as mensagens acumuladas
 */
export function bufferMessage(
  lead: Lead,
  conversation: Conversation,
  content: string,
  mediaType?: string,
  productContext?: IncomingProductContext
): void {
  const leadId = lead.id
  
  // Verificar se já existe um buffer para este lead
  let buffer = messageBuffers.get(leadId)
  
  if (buffer) {
    // Limpar timeout anterior
    if (buffer.timeoutId) {
      clearTimeout(buffer.timeoutId)
    }
    
    // Verificar se o buffer está muito antigo
    const firstMessageAge = Date.now() - buffer.messages[0].receivedAt.getTime()
    if (firstMessageAge > MAX_BUFFER_AGE_MS) {
      // Buffer muito antigo, processar imediatamente e criar novo
      processBufferedMessages(leadId)
      buffer = undefined
    }
  }
  
  if (!buffer) {
    // Criar novo buffer
    buffer = {
      lead,
      conversation,
      messages: [],
      timeoutId: null
    }
    messageBuffers.set(leadId, buffer)
  }
  
  // Salvar contexto do produto se presente
  if (productContext) {
    buffer.productContext = productContext
  }

  // Adicionar mensagem ao buffer
  buffer.messages.push({
    content,
    mediaType,
    receivedAt: new Date(),
    productContext
  })
  
  // Se atingiu o máximo, processar imediatamente
  if (buffer.messages.length >= MAX_BUFFER_SIZE) {
    processBufferedMessages(leadId)
    return
  }
  
  // Configurar novo timeout
  buffer.timeoutId = setTimeout(() => {
    processBufferedMessages(leadId)
  }, BUFFER_TIMEOUT_MS)
}

/**
 * Processa todas as mensagens acumuladas no buffer
 */
async function processBufferedMessages(leadId: string): Promise<void> {
  const buffer = messageBuffers.get(leadId)
  
  if (!buffer || buffer.messages.length === 0) {
    messageBuffers.delete(leadId)
    return
  }
  
  // Limpar timeout se existir
  if (buffer.timeoutId) {
    clearTimeout(buffer.timeoutId)
  }
  
  // Remover buffer do Map antes de processar
  messageBuffers.delete(leadId)
  
  // Combinar todas as mensagens em uma única string
  const combinedContent = buffer.messages
    .map(m => m.content)
    .filter(c => c && c.trim())
    .join('\n\n')
  
  if (!combinedContent.trim()) {
    console.log(`Buffer for lead ${leadId} was empty after combining, skipping`)
    return
  }
  
  console.log(`Processing ${buffer.messages.length} buffered messages for lead ${leadId}`)
  console.log(`Combined content: ${combinedContent.substring(0, 100)}...`)
  
  try {
    const context: AgentContext = {
      channel: 'whatsapp',
      leadId: buffer.lead.id,
      conversationId: buffer.conversation.id,
      incomingProductContext: buffer.productContext
    }
    await processMessage(combinedContent, context, buffer.lead, buffer.conversation)
  } catch (error) {
    console.error('Error processing buffered messages:', error)
  }
}

/**
 * Chamada quando o cliente começa a digitar (PRESENCE_UPDATE: composing)
 * Reseta o timer para dar mais tempo ao cliente
 */
export function onTypingStarted(leadId: string): void {
  const buffer = messageBuffers.get(leadId)
  if (buffer?.timeoutId) {
    clearTimeout(buffer.timeoutId)
    buffer.timeoutId = setTimeout(() => {
      processBufferedMessages(leadId)
    }, BUFFER_TIMEOUT_MS)
  }
}

/**
 * Chamada quando o cliente para de digitar (PRESENCE_UPDATE: paused/available)
 * Reduz o timer para processar mais rápido
 */
export function onTypingStopped(leadId: string): void {
  const buffer = messageBuffers.get(leadId)
  if (buffer?.timeoutId) {
    clearTimeout(buffer.timeoutId)
    buffer.timeoutId = setTimeout(() => {
      processBufferedMessages(leadId)
    }, TYPING_STOPPED_MS)
  }
}

/**
 * Força o processamento imediato do buffer de um lead
 * Útil para quando precisamos garantir que a resposta seja enviada
 */
export function flushBuffer(leadId: string): void {
  const buffer = messageBuffers.get(leadId)
  if (buffer) {
    if (buffer.timeoutId) {
      clearTimeout(buffer.timeoutId)
    }
    processBufferedMessages(leadId)
  }
}

/**
 * Verifica se existe um buffer ativo para o lead
 */
export function hasActiveBuffer(leadId: string): boolean {
  return messageBuffers.has(leadId)
}

/**
 * Retorna o número de mensagens no buffer do lead
 */
export function getBufferSize(leadId: string): number {
  const buffer = messageBuffers.get(leadId)
  return buffer?.messages.length || 0
}

/**
 * Limpa todos os buffers (útil para shutdown)
 */
export function clearAllBuffers(): void {
  for (const [leadId, buffer] of messageBuffers) {
    if (buffer.timeoutId) {
      clearTimeout(buffer.timeoutId)
    }
    // Tenta processar antes de limpar
    processBufferedMessages(leadId)
  }
  messageBuffers.clear()
}
