/**
 * Tipos para o Agente Unificado (WhatsApp + Mercado Livre)
 */

export type AgentChannel = 'whatsapp' | 'mercadolivre'

export interface AgentContext {
  channel: AgentChannel
  
  // Identificação (opcional para ML pré-venda)
  leadId?: string
  conversationId?: string
  
  // ML específico
  mlQuestionId?: string
  mlItemId?: string
  mlBuyerId?: string
  
  // Contexto do produto (ML)
  productTitle?: string
  productDimensions?: { 
    width: number
    height: number 
  }
  
  // Frete pré-calculado (ML)
  freightInfo?: {
    cep: string
    value: number
    isSP: boolean
    estimatedDays: number
    carrier?: string
    unitPrice?: number   // Preço unitário (para fora de SP)
    quantity?: number    // Quantidade calculada
  }
  
  // Quantidade solicitada na pergunta
  quantity?: number
}

export interface ProcessMessageResult {
  success: boolean
  response: string
  toolsUsed?: string[]
  error?: string
}
