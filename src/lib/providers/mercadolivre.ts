/**
 * Mercado Livre API Provider
 * Documentação: https://developers.mercadolivre.com.br/
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  MLTokenResponse,
  MLTokens,
  MLQuestion,
  MLQuestionsSearchResponse,
  MLMessage,
  MLMessagesResponse,
  MLSendMessagePayload,
  MLOrder,
  MLShipment,
  MLItem,
  MLServiceResponse
} from '@/types/mercadolivre'

const ML_API_URL = 'https://api.mercadolibre.com'
const ML_AUTH_URL = 'https://auth.mercadolivre.com.br'

// =====================================================
// CONFIGURAÇÃO
// =====================================================

function getConfig() {
  return {
    clientId: process.env.ML_CLIENT_ID!,
    clientSecret: process.env.ML_CLIENT_SECRET!,
    redirectUri: process.env.ML_REDIRECT_URI!,
    userId: process.env.ML_USER_ID!
  }
}

// =====================================================
// GERENCIAMENTO DE TOKENS
// =====================================================

let cachedTokens: MLTokens | null = null

/**
 * Obtém tokens do banco de dados
 */
async function getStoredTokens(): Promise<MLTokens | null> {
  if (cachedTokens && cachedTokens.expiresAt > new Date()) {
    return cachedTokens
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('dc_integrations')
    .select('*')
    .eq('provider', 'mercadolivre')
    .single()

  if (!data?.access_token) return null

  cachedTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at),
    userId: data.metadata?.user_id || process.env.ML_USER_ID!
  }

  return cachedTokens
}

/**
 * Salva tokens no banco de dados
 */
async function saveTokens(tokens: MLTokenResponse): Promise<void> {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await supabase
    .from('dc_integrations')
    .upsert({
      provider: 'mercadolivre',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      metadata: { user_id: tokens.user_id.toString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'provider' })

  cachedTokens = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    userId: tokens.user_id.toString()
  }
}

/**
 * Obtém access token válido, renovando se necessário
 */
async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens()

  if (!tokens) {
    throw new Error('Mercado Livre não está conectado. Configure a integração primeiro.')
  }

  // Se o token expira em menos de 5 minutos, renovar
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (tokens.expiresAt < fiveMinutesFromNow) {
    const newTokens = await refreshAccessToken(tokens.refreshToken)
    return newTokens.access_token
  }

  return tokens.accessToken
}

/**
 * Renova o access token usando refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<MLTokenResponse> {
  const config = getConfig()

  const response = await fetch(`${ML_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[ML] Erro ao renovar token:', error)
    throw new Error('Falha ao renovar token do Mercado Livre')
  }

  const tokens = await response.json() as MLTokenResponse
  await saveTokens(tokens)
  return tokens
}

// =====================================================
// OAUTH
// =====================================================

/**
 * Gera URL de autorização OAuth
 */
export function getAuthorizationUrl(): string {
  const config = getConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri
  })
  return `${ML_AUTH_URL}/authorization?${params.toString()}`
}

/**
 * Troca código de autorização por tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<MLTokenResponse> {
  const config = getConfig()

  const response = await fetch(`${ML_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[ML] Erro ao trocar código:', error)
    throw new Error('Falha ao obter tokens do Mercado Livre')
  }

  const tokens = await response.json() as MLTokenResponse
  await saveTokens(tokens)
  return tokens
}

// =====================================================
// REQUISIÇÕES GENÉRICAS
// =====================================================

async function mlFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken()

  const response = await fetch(`${ML_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[ML] Erro em ${endpoint}:`, error)
    throw new Error(`Erro na API do Mercado Livre: ${response.status}`)
  }

  return response.json() as Promise<T>
}

// =====================================================
// PERGUNTAS (PRÉ-VENDA)
// =====================================================

/**
 * Busca perguntas não respondidas
 */
export async function getUnansweredQuestions(): Promise<MLQuestionsSearchResponse> {
  const tokens = await getStoredTokens()
  if (!tokens) throw new Error('Não conectado ao Mercado Livre')

  return mlFetch<MLQuestionsSearchResponse>(
    `/questions/search?seller_id=${tokens.userId}&status=UNANSWERED`
  )
}

/**
 * Busca detalhes de uma pergunta
 */
export async function getQuestion(questionId: string): Promise<MLQuestion> {
  return mlFetch<MLQuestion>(`/questions/${questionId}`)
}

/**
 * Responde uma pergunta
 */
export async function answerQuestion(
  questionId: string,
  answerText: string
): Promise<MLServiceResponse> {
  try {
    await mlFetch(`/answers`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: parseInt(questionId),
        text: answerText
      })
    })

    return { success: true }
  } catch (error) {
    console.error('[ML] Erro ao responder pergunta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// =====================================================
// MENSAGENS (PÓS-VENDA)
// =====================================================

/**
 * Busca mensagens de uma conversa (pack)
 */
export async function getPackMessages(packId: string): Promise<MLMessagesResponse> {
  const tokens = await getStoredTokens()
  if (!tokens) throw new Error('Não conectado ao Mercado Livre')

  return mlFetch<MLMessagesResponse>(
    `/messages/packs/${packId}/sellers/${tokens.userId}?tag=post_sale`
  )
}

/**
 * Busca mensagens não lidas
 */
export async function getUnreadMessages(): Promise<{ results: { pack_id: string }[] }> {
  return mlFetch(`/messages/unread?role=seller&tag=post_sale`)
}

/**
 * Envia mensagem para um comprador
 */
export async function sendMessage(
  packId: string,
  buyerId: string,
  text: string
): Promise<MLServiceResponse<MLMessage>> {
  try {
    const tokens = await getStoredTokens()
    if (!tokens) throw new Error('Não conectado ao Mercado Livre')

    const payload: MLSendMessagePayload = {
      from: { user_id: parseInt(tokens.userId) },
      to: { user_id: parseInt(buyerId) },
      text
    }

    const message = await mlFetch<MLMessage>(
      `/messages/packs/${packId}/sellers/${tokens.userId}?tag=post_sale`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    )

    return { success: true, data: message }
  } catch (error) {
    console.error('[ML] Erro ao enviar mensagem:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Envia múltiplas mensagens sequencialmente com delay
 */
export async function sendSequentialMessages(
  packId: string,
  buyerId: string,
  messages: string[],
  delayMs: number = 2000
): Promise<MLServiceResponse> {
  try {
    for (let i = 0; i < messages.length; i++) {
      const result = await sendMessage(packId, buyerId, messages[i])
      if (!result.success) {
        return result
      }

      // Aguarda entre mensagens (exceto na última)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[ML] Erro ao enviar mensagens sequenciais:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// =====================================================
// PEDIDOS
// =====================================================

/**
 * Busca detalhes de um pedido
 */
export async function getOrder(orderId: string): Promise<MLOrder> {
  return mlFetch<MLOrder>(`/orders/${orderId}`)
}

/**
 * Busca pedidos recentes
 */
export async function getRecentOrders(limit: number = 20): Promise<{ results: MLOrder[] }> {
  const tokens = await getStoredTokens()
  if (!tokens) throw new Error('Não conectado ao Mercado Livre')

  return mlFetch(`/orders/search?seller=${tokens.userId}&sort=date_desc&limit=${limit}`)
}

// =====================================================
// ENVIOS (SHIPMENTS)
// =====================================================

/**
 * Busca detalhes de um envio
 */
export async function getShipment(shipmentId: string): Promise<MLShipment> {
  return mlFetch<MLShipment>(`/shipments/${shipmentId}`)
}

/**
 * Busca informações de rastreio
 */
export async function getShipmentTracking(shipmentId: string): Promise<{
  tracking_number?: string
  tracking_url?: string
  carrier_name?: string
}> {
  const shipment = await getShipment(shipmentId)
  return {
    tracking_number: shipment.tracking_number,
    tracking_url: shipment.carrier_info?.url,
    carrier_name: shipment.carrier_info?.name
  }
}

// =====================================================
// ITENS (PRODUTOS)
// =====================================================

/**
 * Busca detalhes de um item
 */
export async function getItem(itemId: string): Promise<MLItem> {
  return mlFetch<MLItem>(`/items/${itemId}`)
}

/**
 * Busca descrição de um item
 */
export async function getItemDescription(itemId: string): Promise<{ plain_text: string }> {
  return mlFetch(`/items/${itemId}/description`)
}

// =====================================================
// USUÁRIO
// =====================================================

/**
 * Busca informações do usuário autenticado
 */
export async function getMe(): Promise<{
  id: number
  nickname: string
  site_id: string
}> {
  return mlFetch('/users/me')
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Verifica se está conectado ao Mercado Livre
 */
export async function isConnected(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens()
    return tokens !== null
  } catch {
    return false
  }
}

/**
 * Desconecta do Mercado Livre
 */
export async function disconnect(): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('dc_integrations')
    .delete()
    .eq('provider', 'mercadolivre')

  cachedTokens = null
}

/**
 * Extrai pack_id de uma notificação de mensagem
 */
export function extractPackIdFromResource(resource: string): string | null {
  // resource format: /messages/packs/{packId}/...
  const match = resource.match(/\/packs\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Extrai order_id de uma notificação de pedido
 */
export function extractOrderIdFromResource(resource: string): string | null {
  // resource format: /orders/{orderId}
  const match = resource.match(/\/orders\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Extrai question_id de uma notificação de pergunta
 */
export function extractQuestionIdFromResource(resource: string): string | null {
  // resource format: /questions/{questionId}
  const match = resource.match(/\/questions\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Extrai shipment_id de uma notificação de envio
 */
export function extractShipmentIdFromResource(resource: string): string | null {
  // resource format: /shipments/{shipmentId}
  const match = resource.match(/\/shipments\/(\d+)/)
  return match ? match[1] : null
}

// =====================================================
// EXTRAÇÃO DE DIMENSÕES DO PRODUTO
// =====================================================

export interface ProductDimensions {
  width: number  // cm
  height: number // cm
  source: 'title' | 'attributes' | 'default'
}

/**
 * Extrai dimensões do título do produto
 * Padrões suportados: "100x50", "100 x 50", "100X50cm", etc.
 */
export function extractDimensionsFromTitle(title: string): ProductDimensions | null {
  // Padrões comuns de dimensões em títulos
  const patterns = [
    // 100x50, 100X50, 100 x 50
    /(\d{2,3})\s*[xX]\s*(\d{2,3})/,
    // 100cm x 50cm
    /(\d{2,3})\s*cm?\s*[xX]\s*(\d{2,3})\s*cm?/i,
    // Largura 100 Altura 50
    /largura\s*:?\s*(\d{2,3}).*altura\s*:?\s*(\d{2,3})/i,
    // L100 A50
    /[lL]\s*(\d{2,3}).*[aA]\s*(\d{2,3})/
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      const dim1 = parseInt(match[1])
      const dim2 = parseInt(match[2])
      
      // A maior dimensão geralmente é a largura
      const width = Math.max(dim1, dim2)
      const height = Math.min(dim1, dim2)
      
      // Validar dimensões razoáveis para janelas (20-300cm)
      if (width >= 20 && width <= 300 && height >= 20 && height <= 300) {
        return { width, height, source: 'title' }
      }
    }
  }

  return null
}

/**
 * Extrai dimensões dos atributos do produto
 */
export function extractDimensionsFromAttributes(attributes: MLItem['attributes']): ProductDimensions | null {
  let width: number | null = null
  let height: number | null = null

  // Atributos comuns para dimensões
  const widthIds = ['WIDTH', 'PACKAGE_WIDTH', 'PRODUCT_WIDTH', 'LARGURA']
  const heightIds = ['HEIGHT', 'PACKAGE_HEIGHT', 'PRODUCT_HEIGHT', 'ALTURA']

  for (const attr of attributes) {
    const attrIdUpper = attr.id.toUpperCase()
    const attrNameUpper = attr.name.toUpperCase()

    // Verificar largura
    if (widthIds.some(id => attrIdUpper.includes(id) || attrNameUpper.includes(id))) {
      const value = parseFloat(attr.value_name?.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
      if (value > 0) width = value
    }

    // Verificar altura
    if (heightIds.some(id => attrIdUpper.includes(id) || attrNameUpper.includes(id))) {
      const value = parseFloat(attr.value_name?.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
      if (value > 0) height = value
    }
  }

  if (width && height) {
    // Converter para cm se parecer estar em metros
    if (width < 5) width *= 100
    if (height < 5) height *= 100

    return { width, height, source: 'attributes' }
  }

  return null
}

/**
 * Busca dimensões do produto de um anúncio
 * Tenta extrair do título primeiro, depois dos atributos
 */
export async function getItemDimensions(itemId: string): Promise<ProductDimensions> {
  try {
    const item = await getItem(itemId)

    // Tentar extrair do título primeiro (mais confiável para janelas)
    const fromTitle = extractDimensionsFromTitle(item.title)
    if (fromTitle) {
      console.log(`[ML] Dimensões extraídas do título: ${fromTitle.width}x${fromTitle.height}cm`)
      return fromTitle
    }

    // Tentar extrair dos atributos
    const fromAttributes = extractDimensionsFromAttributes(item.attributes)
    if (fromAttributes) {
      console.log(`[ML] Dimensões extraídas dos atributos: ${fromAttributes.width}x${fromAttributes.height}cm`)
      return fromAttributes
    }

    // Usar dimensões padrão se não encontrar
    console.log(`[ML] Usando dimensões padrão para item ${itemId}`)
    return { width: 100, height: 50, source: 'default' }
  } catch (error) {
    console.error(`[ML] Erro ao buscar dimensões do item ${itemId}:`, error)
    return { width: 100, height: 50, source: 'default' }
  }
}

// =====================================================
// EXTRAÇÃO DE TIPO DE JANELA
// =====================================================

/**
 * Tipo de janela (alinhado com shopify-prices.ts)
 */
export type WindowType = 'capelinha' | 'capelinha_3v' | '2f' | '2f_grade' | '3f' | '3f_tela' | '3f_grade' | '3f_tela_grade'

/**
 * Cor do produto
 */
export type ProductColor = 'branco' | 'preto'

/**
 * Orientação (para capelinha)
 */
export type ProductOrientation = 'horizontal' | 'vertical'

/**
 * Resultado da extração de informações do título ML
 */
export interface ExtractedProductInfo {
  tipo: WindowType
  cor: ProductColor
  orientacao?: ProductOrientation
  linha?: 'linha25' | 'suprema'
  tem3Vidros: boolean
  temTela: boolean
  temGrade: boolean
}

/**
 * Extrai informações completas do produto a partir do título ML
 * Inclui tipo, cor, orientação, etc.
 */
export function extractProductInfoFromTitle(title: string): ExtractedProductInfo {
  const t = title.toLowerCase()
  
  // Detectar cor
  const cor: ProductColor = t.includes('pret') ? 'preto' : 'branco'
  
  // Detectar orientação
  const orientacao: ProductOrientation | undefined = 
    t.includes('vertical') ? 'vertical' :
    t.includes('horizontal') ? 'horizontal' : undefined
  
  // Detectar linha
  const linha = t.includes('suprema') ? 'suprema' as const :
                t.includes('linha 25') ? 'linha25' as const : undefined
  
  // Detectar características
  const tem3Vidros = /três\s*vidros|3\s*vidros/.test(t)
  const temTela = /tela|mosquit/.test(t)
  const temGrade = /grade/.test(t)
  
  // Determinar tipo
  let tipo: WindowType = '2f'
  
  if (/capelinha|pivotante|vitr[oô]/.test(t)) {
    tipo = tem3Vidros ? 'capelinha_3v' : 'capelinha'
  } else if (/3\s*folhas|três\s*folhas/.test(t)) {
    if (temTela && temGrade) {
      tipo = '3f_tela_grade'
    } else if (temGrade) {
      tipo = '3f_grade'
    } else if (temTela) {
      tipo = '3f_tela'
    } else {
      tipo = '3f'
    }
  } else if (/2\s*folhas|duas\s*folhas/.test(t)) {
    tipo = temGrade ? '2f_grade' : '2f'
  }
  
  console.log(`[ML] Produto extraído do título "${title}":`, { tipo, cor, orientacao, tem3Vidros, temTela, temGrade })
  
  return {
    tipo,
    cor,
    orientacao,
    linha,
    tem3Vidros,
    temTela,
    temGrade
  }
}

/**
 * Extrai apenas o tipo de janela do título do anúncio ML
 * Mantido para compatibilidade com código existente
 */
export function extractWindowTypeFromTitle(title: string): WindowType {
  return extractProductInfoFromTitle(title).tipo
}

/**
 * Extrai tipo de janela e dimensões de um item ML
 */
export async function getItemTypeAndDimensions(itemId: string): Promise<{
  windowType: WindowType
  dimensions: ProductDimensions
  title: string
}> {
  try {
    const item = await getItem(itemId)
    const windowType = extractWindowTypeFromTitle(item.title)
    const dimensions = await getItemDimensions(itemId)
    
    return {
      windowType,
      dimensions,
      title: item.title
    }
  } catch (error) {
    console.error(`[ML] Erro ao buscar tipo/dimensões do item ${itemId}:`, error)
    return {
      windowType: '2f',
      dimensions: { width: 100, height: 50, source: 'default' },
      title: 'Janela'
    }
  }
}

// =====================================================
// DIAGNÓSTICO
// =====================================================

export interface MLDiagnostic {
  connected: boolean
  userId?: string
  tokenValid?: boolean
  tokenExpiresAt?: string
  configValid: {
    clientId: boolean
    clientSecret: boolean
    redirectUri: boolean
    userId: boolean
  }
  errors: string[]
}

/**
 * Verifica configuração e conexão com o Mercado Livre
 */
export async function diagnose(): Promise<MLDiagnostic> {
  const errors: string[] = []
  const config = getConfig()

  const configValid = {
    clientId: !!config.clientId,
    clientSecret: !!config.clientSecret,
    redirectUri: !!config.redirectUri,
    userId: !!config.userId
  }

  if (!configValid.clientId) errors.push('ML_CLIENT_ID não configurado')
  if (!configValid.clientSecret) errors.push('ML_CLIENT_SECRET não configurado')
  if (!configValid.redirectUri) errors.push('ML_REDIRECT_URI não configurado')
  if (!configValid.userId) errors.push('ML_USER_ID não configurado')

  let connected = false
  let userId: string | undefined
  let tokenValid = false
  let tokenExpiresAt: string | undefined

  try {
    const tokens = await getStoredTokens()
    if (tokens) {
      connected = true
      userId = tokens.userId
      tokenExpiresAt = tokens.expiresAt.toISOString()
      tokenValid = tokens.expiresAt > new Date()

      if (!tokenValid) {
        errors.push('Token expirado - necessário renovar')
      }

      // Testar conexão real
      try {
        const me = await getMe()
        userId = me.id.toString()
      } catch (e) {
        errors.push('Erro ao validar token com API do ML')
        tokenValid = false
      }
    } else {
      errors.push('Nenhum token encontrado - necessário autorizar app')
    }
  } catch (e) {
    errors.push('Erro ao verificar conexão: ' + (e instanceof Error ? e.message : 'desconhecido'))
  }

  return {
    connected,
    userId,
    tokenValid,
    tokenExpiresAt,
    configValid,
    errors
  }
}
