/**
 * Tipos TypeScript para API do Mercado Livre
 * Documentação: https://developers.mercadolivre.com.br/
 */

// =====================================================
// AUTENTICAÇÃO
// =====================================================

export interface MLTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  user_id: number
  refresh_token: string
}

export interface MLTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  userId: string
}

// =====================================================
// WEBHOOKS / NOTIFICAÇÕES
// =====================================================

export interface MLWebhookNotification {
  _id: string
  resource: string
  user_id: number
  topic: 'questions' | 'orders_v2' | 'messages' | 'shipments' | 'items'
  application_id: number
  attempts: number
  sent: string
  received: string
}

// =====================================================
// PERGUNTAS (PRÉ-VENDA)
// =====================================================

export interface MLQuestion {
  id: number
  seller_id: number
  text: string
  status: 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED' | 'UNDER_REVIEW'
  item_id: string
  date_created: string
  answer?: MLAnswer
  from: {
    id: number
    nickname?: string
  }
}

export interface MLAnswer {
  text: string
  status: 'ACTIVE' | 'DISABLED'
  date_created: string
}

export interface MLQuestionsSearchResponse {
  total: number
  limit: number
  questions: MLQuestion[]
}

// =====================================================
// MENSAGENS (PÓS-VENDA)
// =====================================================

export interface MLMessage {
  id: string
  site_id: string
  client_id: number
  from: {
    user_id: number
    email?: string
    name?: string
  }
  to: {
    user_id: number
    email?: string
    name?: string
  }
  status: 'available' | 'read' | 'moderated'
  subject?: string
  text: string
  message_date: {
    received: string
    available: string
    notified: string
    created: string
    read?: string
  }
  message_attachments?: MLAttachment[]
  message_moderation?: {
    status: string
    reason?: string
    date_moderated?: string
  }
  conversation_first_message: boolean
}

export interface MLAttachment {
  id: string
  filename: string
  original_filename: string
  size: number
  type: string
  status: string
}

export interface MLMessagesResponse {
  paging: {
    total: number
    offset: number
    limit: number
  }
  results: MLMessage[]
  conversation_status: {
    path: string
    status: string
    substatus?: string
    claim_id?: string
    shipping_status?: string
  }
  seller_max_message_length?: number
}

export interface MLSendMessagePayload {
  from: {
    user_id: number
  }
  to: {
    user_id: number
  }
  text: string
}

// =====================================================
// PEDIDOS
// =====================================================

export interface MLOrder {
  id: number
  date_created: string
  date_closed?: string
  last_updated: string
  manufacturing_ending_date?: string
  feedback?: {
    buyer?: object
    seller?: object
  }
  mediations: object[]
  comments?: string
  pack_id?: number
  pickup_id?: number
  order_request?: {
    return?: object
    change?: object
  }
  fulfilled?: boolean
  taxes: {
    amount: number | null
    currency_id: string | null
  }
  order_items: MLOrderItem[]
  currency_id: string
  payments: MLPayment[]
  shipping: {
    id: number
  }
  status: 'confirmed' | 'payment_required' | 'payment_in_process' | 'partially_paid' | 'paid' | 'cancelled'
  status_detail?: {
    code?: string
    description?: string
  }
  tags: string[]
  buyer: {
    id: number
    nickname: string
    first_name?: string
    last_name?: string
    email?: string
  }
  seller: {
    id: number
    nickname: string
  }
  total_amount: number
  paid_amount: number
}

export interface MLOrderItem {
  item: {
    id: string
    title: string
    category_id: string
    variation_id?: number
    seller_custom_field?: string
    variation_attributes?: {
      id: string
      name: string
      value_id?: string
      value_name: string
    }[]
    warranty?: string
    condition: string
    seller_sku?: string
  }
  quantity: number
  unit_price: number
  full_unit_price: number
  currency_id: string
  manufacturing_days?: number
  sale_fee: number
  listing_type_id: string
}

export interface MLPayment {
  id: number
  order_id: number
  payer_id: number
  collector: {
    id: number
  }
  currency_id: string
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'in_mediation' | 'refunded'
  status_detail: string
  transaction_amount: number
  shipping_cost: number
  overpaid_amount: number
  total_paid_amount: number
  marketplace_fee: number
  coupon_amount: number
  date_created: string
  date_last_modified: string
  card_id?: number
  reason: string
  activation_uri?: string
  payment_method_id: string
  installments: number
  issuer_id?: string
  atm_transfer_reference?: {
    company_id?: string
    transaction_id?: string
  }
  coupon_id?: string
  operation_type: string
  payment_type: string
  available_actions: string[]
  installment_amount?: number
  deferred_period?: string
  date_approved?: string
  authorization_code?: string
  transaction_order_id?: string
}

// =====================================================
// ENVIOS (SHIPMENTS)
// =====================================================

export interface MLShipment {
  id: number
  status: 'pending' | 'handling' | 'ready_to_ship' | 'shipped' | 'delivered' | 'not_delivered' | 'cancelled'
  substatus?: string
  status_history: {
    date_cancelled?: string
    date_delivered?: string
    date_first_visit?: string
    date_handling?: string
    date_not_delivered?: string
    date_ready_to_ship?: string
    date_shipped?: string
  }
  date_created: string
  last_updated: string
  tracking_number?: string
  tracking_method?: string
  service_id: number
  carrier_info?: {
    name?: string
    url?: string
  }
  sender_id: number
  sender_address: MLAddress
  receiver_id: number
  receiver_address: MLAddress
  shipping_items: {
    id: string
    description: string
    quantity: number
    dimensions?: string
  }[]
  shipping_option: {
    id: number
    shipping_method_id: number
    name: string
    currency_id: string
    cost: number
    estimated_delivery_time: {
      date?: string
      unit: string
      offset: {
        date?: string
        shipping?: number
      }
    }
  }
  order_cost: number
  base_cost: number
  logistic_type?: string
  mode: string
}

export interface MLAddress {
  id?: number
  address_line: string
  street_name?: string
  street_number?: string
  comment?: string
  zip_code: string
  city: {
    id?: string
    name: string
  }
  state: {
    id: string
    name: string
  }
  country: {
    id: string
    name: string
  }
  neighborhood?: {
    id?: string
    name: string
  }
  latitude?: number
  longitude?: number
  receiver_name?: string
  receiver_phone?: string
}

// =====================================================
// ITENS (PRODUTOS)
// =====================================================

export interface MLItem {
  id: string
  site_id: string
  title: string
  subtitle?: string
  seller_id: number
  category_id: string
  official_store_id?: number
  price: number
  base_price: number
  original_price?: number
  currency_id: string
  initial_quantity: number
  available_quantity: number
  sold_quantity: number
  sale_terms: {
    id: string
    name: string
    value_id?: string
    value_name: string
  }[]
  buying_mode: 'buy_it_now' | 'auction'
  listing_type_id: string
  start_time: string
  stop_time: string
  condition: 'new' | 'used' | 'not_specified'
  permalink: string
  thumbnail: string
  secure_thumbnail: string
  pictures: {
    id: string
    url: string
    secure_url: string
    size: string
    max_size: string
    quality: string
  }[]
  video_id?: string
  descriptions: {
    id: string
  }[]
  accepts_mercadopago: boolean
  non_mercado_pago_payment_methods: object[]
  shipping: {
    mode: string
    methods: object[]
    tags: string[]
    dimensions?: string
    local_pick_up: boolean
    free_shipping: boolean
    logistic_type?: string
    store_pick_up: boolean
  }
  international_delivery_mode: string
  seller_address: {
    city: { id?: string; name: string }
    state: { id: string; name: string }
    country: { id: string; name: string }
    id?: number
  }
  seller_contact?: string
  location: object
  geolocation?: {
    latitude: number
    longitude: number
  }
  coverage_areas: object[]
  attributes: {
    id: string
    name: string
    value_id?: string
    value_name: string
    attribute_group_id: string
    attribute_group_name: string
  }[]
  warnings: object[]
  listing_source: string
  variations: {
    id: number
    price: number
    attribute_combinations: {
      id: string
      name: string
      value_id?: string
      value_name: string
    }[]
    available_quantity: number
    sold_quantity: number
    picture_ids: string[]
    catalog_product_id?: string
  }[]
  status: 'active' | 'paused' | 'closed' | 'under_review' | 'inactive'
  sub_status: string[]
  tags: string[]
  warranty?: string
  catalog_product_id?: string
  domain_id: string
  parent_item_id?: string
  differential_pricing?: {
    id: number
  }
  deal_ids: string[]
  automatic_relist: boolean
  date_created: string
  last_updated: string
  health?: number
  catalog_listing: boolean
}

// =====================================================
// TIPOS INTERNOS DO SISTEMA
// =====================================================

export interface MLConversationData {
  packId: string
  orderId?: string
  buyerId: string
  buyerName?: string
  freightPaid: boolean
  freightValue?: number
  dataCollected: {
    name?: string
    address?: string
    cep?: string
    cpf?: string
    email?: string
    whatsapp?: string
  }
  glassChoice?: 'incolor' | 'mini_boreal' | 'fume'
  status: 'waiting_data' | 'waiting_glass' | 'complete' | 'active'
}

export interface MLQuestionData {
  questionId: string
  itemId: string
  questionText: string
  cepExtracted?: string
  freightCalculated?: number
  answered: boolean
}

// =====================================================
// TIPOS DE RESPOSTA DO SERVIÇO
// =====================================================

export interface MLServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface MLFreightCalculation {
  cep: string
  isSP: boolean
  value: number
  estimatedDays: number
  carrier?: string
}
