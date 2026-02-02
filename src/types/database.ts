export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LeadStage = 
  | 'novo' 
  | 'qualificando' 
  | 'orcamento' 
  | 'comprou' 
  | 'producao' 
  | 'entregue' 
  | 'pos_venda' 
  | 'inativo'

export type MessageDirection = 'inbound' | 'outbound'
export type SenderType = 'lead' | 'agent' | 'human' | 'system'
export type ConversationStatus = 'active' | 'waiting_human' | 'closed' | 'archived'
export type FollowUpType = 'abandoned_cart' | 'post_delivery' | 'installation' | 'reactivation' | 'review' | 'custom'
export type FollowUpStatus = 'pending' | 'sent' | 'responded' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      dc_leads: {
        Row: {
          id: string
          phone: string
          name: string | null
          email: string | null
          cpf: string | null
          cnpj: string | null
          address_json: Json | null
          cep: string | null
          stage: LeadStage
          source: string | null
          tags: string[] | null
          profile_type: string | null
          is_company: boolean
          assigned_to: string | null
          notes: string | null
          metadata: Json
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          name?: string | null
          email?: string | null
          cpf?: string | null
          cnpj?: string | null
          address_json?: Json | null
          cep?: string | null
          stage?: LeadStage
          source?: string | null
          tags?: string[] | null
          profile_type?: string | null
          is_company?: boolean
          assigned_to?: string | null
          notes?: string | null
          metadata?: Json
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          name?: string | null
          email?: string | null
          cpf?: string | null
          cnpj?: string | null
          address_json?: Json | null
          cep?: string | null
          stage?: LeadStage
          source?: string | null
          tags?: string[] | null
          profile_type?: string | null
          is_company?: boolean
          assigned_to?: string | null
          notes?: string | null
          metadata?: Json
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dc_conversations: {
        Row: {
          id: string
          lead_id: string
          channel: string
          status: ConversationStatus
          intent: string | null
          context_json: Json
          summary: string | null
          started_at: string
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          channel?: string
          status?: ConversationStatus
          intent?: string | null
          context_json?: Json
          summary?: string | null
          started_at?: string
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          channel?: string
          status?: ConversationStatus
          intent?: string | null
          context_json?: Json
          summary?: string | null
          started_at?: string
          closed_at?: string | null
          created_at?: string
        }
      }
      dc_messages: {
        Row: {
          id: string
          conversation_id: string
          lead_id: string
          direction: MessageDirection
          sender_type: SenderType
          content: string
          media_url: string | null
          media_type: string | null
          wpp_message_id: string | null
          ai_tokens_used: number | null
          ai_model: string | null
          metadata: Json
          sent_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          lead_id: string
          direction: MessageDirection
          sender_type: SenderType
          content: string
          media_url?: string | null
          media_type?: string | null
          wpp_message_id?: string | null
          ai_tokens_used?: number | null
          ai_model?: string | null
          metadata?: Json
          sent_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          lead_id?: string
          direction?: MessageDirection
          sender_type?: SenderType
          content?: string
          media_url?: string | null
          media_type?: string | null
          wpp_message_id?: string | null
          ai_tokens_used?: number | null
          ai_model?: string | null
          metadata?: Json
          sent_at?: string
        }
      }
      dc_whatsapp_connections: {
        Row: {
          id: string
          instance_name: string
          instance_id: string | null
          api_key: string | null
          phone_number: string | null
          status: string
          qr_code: string | null
          webhook_url: string | null
          is_primary: boolean
          connected_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          instance_name: string
          instance_id?: string | null
          api_key?: string | null
          phone_number?: string | null
          status?: string
          qr_code?: string | null
          webhook_url?: string | null
          is_primary?: boolean
          connected_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          instance_name?: string
          instance_id?: string | null
          api_key?: string | null
          phone_number?: string | null
          status?: string
          qr_code?: string | null
          webhook_url?: string | null
          is_primary?: boolean
          connected_at?: string | null
          created_at?: string
        }
      }
      dc_orders: {
        Row: {
          id: string
          lead_id: string | null
          external_id: string | null
          source: string
          order_number: string | null
          total: number | null
          status: string
          production_status: string
          tracking_code: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          external_id?: string | null
          source: string
          order_number?: string | null
          total?: number | null
          status?: string
          production_status?: string
          tracking_code?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          external_id?: string | null
          source?: string
          order_number?: string | null
          total?: number | null
          status?: string
          production_status?: string
          tracking_code?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      dc_follow_ups: {
        Row: {
          id: string
          lead_id: string
          order_id: string | null
          type: FollowUpType
          scheduled_for: string
          message_template: string | null
          status: FollowUpStatus
          attempt_count: number
          max_attempts: number
          context_json: Json
          created_at: string
          executed_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          order_id?: string | null
          type: FollowUpType
          scheduled_for: string
          message_template?: string | null
          status?: FollowUpStatus
          attempt_count?: number
          max_attempts?: number
          context_json?: Json
          created_at?: string
          executed_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          order_id?: string | null
          type?: FollowUpType
          scheduled_for?: string
          message_template?: string | null
          status?: FollowUpStatus
          attempt_count?: number
          max_attempts?: number
          context_json?: Json
          created_at?: string
          executed_at?: string | null
        }
      }
      dc_integrations: {
        Row: {
          id: string
          provider: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          metadata: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dc_agent_metrics: {
        Row: {
          id: string
          date: string
          total_messages_in: number
          total_messages_out: number
          total_conversations: number
          total_leads_created: number
          total_conversions: number
          total_followups_sent: number
          total_followups_responded: number
          total_escalations: number
          avg_response_time_sec: number
          total_tokens_used: number
          total_ai_cost_usd: number
        }
        Insert: {
          id?: string
          date: string
          total_messages_in?: number
          total_messages_out?: number
          total_conversations?: number
          total_leads_created?: number
          total_conversions?: number
          total_followups_sent?: number
          total_followups_responded?: number
          total_escalations?: number
          avg_response_time_sec?: number
          total_tokens_used?: number
          total_ai_cost_usd?: number
        }
        Update: {
          id?: string
          date?: string
          total_messages_in?: number
          total_messages_out?: number
          total_conversations?: number
          total_leads_created?: number
          total_conversions?: number
          total_followups_sent?: number
          total_followups_responded?: number
          total_escalations?: number
          avg_response_time_sec?: number
          total_tokens_used?: number
          total_ai_cost_usd?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      dc_lead_stage: LeadStage
      dc_message_direction: MessageDirection
      dc_sender_type: SenderType
    }
  }
}

// Helper types
export type Lead = Database['public']['Tables']['dc_leads']['Row']
export type LeadInsert = Database['public']['Tables']['dc_leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['dc_leads']['Update']

export type Conversation = Database['public']['Tables']['dc_conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['dc_conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['dc_conversations']['Update']

export type Message = Database['public']['Tables']['dc_messages']['Row']
export type MessageInsert = Database['public']['Tables']['dc_messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['dc_messages']['Update']

export type Order = Database['public']['Tables']['dc_orders']['Row']
export type OrderInsert = Database['public']['Tables']['dc_orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['dc_orders']['Update']

export type FollowUp = Database['public']['Tables']['dc_follow_ups']['Row']
export type FollowUpInsert = Database['public']['Tables']['dc_follow_ups']['Insert']
export type FollowUpUpdate = Database['public']['Tables']['dc_follow_ups']['Update']

export type WhatsAppConnection = Database['public']['Tables']['dc_whatsapp_connections']['Row']
export type Integration = Database['public']['Tables']['dc_integrations']['Row']
export type AgentMetrics = Database['public']['Tables']['dc_agent_metrics']['Row']

// =====================================================
// MERCADO LIVRE TYPES
// =====================================================

export type MLConversationStatus = 'active' | 'waiting_data' | 'waiting_glass' | 'complete' | 'closed'
export type MLQuestionStatus = 'pending' | 'answered' | 'failed' | 'skipped'
export type MLGlassChoice = 'incolor' | 'mini_boreal' | 'fume'

export interface MLConversation {
  id: string
  pack_id: string
  order_id: string | null
  buyer_id: string
  buyer_name: string | null
  lead_id: string | null
  order_internal_id: string | null
  status: MLConversationStatus
  freight_paid: boolean
  freight_value: number | null
  data_collected: {
    name?: string
    address?: string
    cep?: string
    cpf?: string
    email?: string
    whatsapp?: string
  }
  glass_choice: MLGlassChoice | null
  welcome_sent: boolean
  chapatex_sent: boolean
  cintas_sent: boolean
  data_request_sent: boolean
  glass_request_sent: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string
  // Controle de IA
  ai_enabled: boolean
}

export interface MLQuestion {
  id: string
  question_id: string
  item_id: string
  question_text: string
  buyer_id: string | null
  buyer_nickname: string | null
  lead_id: string | null
  cep_extracted: string | null
  freight_calculated: number | null
  freight_is_sp: boolean | null
  answer_text: string | null
  status: MLQuestionStatus
  answered_at: string | null
  ml_created_at: string | null
  created_at: string
  updated_at: string
  // Novos campos para controle de IA
  needs_human_review: boolean
  ai_disabled_reason: string | null
  item_title: string | null
}

export interface MLMessage {
  id: string
  conversation_id: string | null
  ml_message_id: string | null
  pack_id: string
  direction: 'inbound' | 'outbound'
  sender_type: 'buyer' | 'agent' | 'human' | 'system'
  content: string
  ml_created_at: string | null
  created_at: string
}

// =====================================================
// UNIFIED TYPES (WhatsApp + Mercado Livre)
// =====================================================

export type ChannelType = 'whatsapp' | 'mercadolivre'

export type ConversationSubtype = 'conversation' | 'question'

export interface UnifiedConversation {
  id: string
  channel: ChannelType
  status: string
  // Subtipo para diferenciar conversas de perguntas
  subtype?: ConversationSubtype
  // Lead data (WhatsApp)
  leadId?: string
  leadName: string | null
  leadPhone: string | null
  // Buyer data (Mercado Livre)
  buyerId?: string
  buyerName?: string | null
  packId?: string
  // Question specific (ML pre-venda)
  itemId?: string
  itemTitle?: string | null
  questionId?: string
  // Controle de IA
  needsHumanReview?: boolean
  aiEnabled?: boolean
  // Common
  lastMessageAt: string | null
  lastMessagePreview?: string
  createdAt: string
  // Original data
  original: Conversation | MLConversation | MLQuestion
  // WhatsApp specific
  lead?: Lead
}

export interface UnifiedMessage {
  id: string
  channel: ChannelType
  conversationId: string
  direction: 'inbound' | 'outbound'
  senderType: string
  content: string
  sentAt: string
  // Original data
  original: Message | MLMessage
}
