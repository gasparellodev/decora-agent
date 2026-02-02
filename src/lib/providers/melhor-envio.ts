/**
 * Melhor Envio API Provider
 * Documentação: https://docs.melhorenvio.com.br/
 */

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const MELHOR_ENVIO_API = process.env.MELHOR_ENVIO_SANDBOX === 'true'
  ? 'https://sandbox.melhorenvio.com.br/api/v2'
  : 'https://melhorenvio.com.br/api/v2'

function getConfig() {
  return {
    token: process.env.MELHOR_ENVIO_TOKEN!,
    cepOrigem: process.env.MELHOR_ENVIO_CEP_ORIGEM || '01310100'
  }
}

// =====================================================
// TIPOS
// =====================================================

export interface ShippingProduct {
  width: number     // cm
  height: number    // cm
  length: number    // cm
  weight: number    // kg
  quantity: number
}

export interface ShippingQuote {
  id: number
  name: string
  price: string
  discount: string
  currency: string
  delivery_time: number
  delivery_range: {
    min: number
    max: number
  }
  company: {
    id: number
    name: string
    picture: string
  }
  error?: string
}

export interface ShippingCalculation {
  success: boolean
  quotes?: ShippingQuote[]
  bestQuote?: ShippingQuote
  error?: string
}

export interface FreightResult {
  cep: string
  isSP: boolean
  value: number
  estimatedDays: number
  carrier?: string
  error?: string
}

// =====================================================
// TIPOS DE JANELA
// =====================================================

export type WindowType = 'capelinha' | 'capelinha_3v' | '2f' | '2f_grade' | '3f' | '3f_tela' | '3f_grade' | '3f_tela_grade'

// =====================================================
// TABELAS DE PESO REAIS (Altura x Largura em cm -> kg)
// NORMALIZAÇÃO: menor valor = altura (30-60), maior valor = largura (80-180)
// =====================================================

/**
 * Tabela de peso para Capelinha (Pivotante)
 * Altura: 30, 40, 50, 60 cm
 * Largura: 80, 100, 120, 150, 180 cm
 */
const PESO_CAPELINHA: Record<string, Record<string, number>> = {
  '30': { '80': 7, '100': 7, '120': 7, '150': 10, '180': 13 },
  '40': { '80': 7, '100': 7, '120': 8, '150': 11, '180': 14 },
  '50': { '80': 7, '100': 7, '120': 9, '150': 11, '180': 15 },
  '60': { '80': 7, '100': 7, '120': 9, '150': 11, '180': 16 }
}

/**
 * Tabela de peso para 2 Folhas (BASE para outros tipos)
 * Altura: 30, 40, 50, 60 cm
 * Largura: 80, 100, 120, 150, 180 cm
 */
const PESO_2_FOLHAS: Record<string, Record<string, number>> = {
  '30': { '80': 7, '100': 9, '120': 11, '150': 14, '180': 20 },
  '40': { '80': 8, '100': 10, '120': 12, '150': 15, '180': 21 },
  '50': { '80': 8, '100': 10, '120': 12, '150': 15, '180': 22 },
  '60': { '80': 9, '100': 11, '120': 12, '150': 17, '180': 22 }
}

/**
 * Peso adicional por tipo de janela (sobre a base de 2 folhas)
 */
const PESO_ADICIONAL: Record<WindowType, number> = {
  'capelinha': 0,      // Usa tabela própria
  'capelinha_3v': 0,   // Usa tabela própria (mesmo peso)
  '2f': 0,             // Base
  '2f_grade': 1,       // +1kg
  '3f': 1,             // +1kg
  '3f_tela': 2,        // +2kg
  '3f_grade': 3,       // +3kg
  '3f_tela_grade': 3   // +3kg
}

/**
 * Comprimento da embalagem por tipo (cm)
 */
const COMPRIMENTO_EMBALAGEM: Record<WindowType, number> = {
  'capelinha': 7,
  'capelinha_3v': 7,   // Mesmo tamanho da capelinha
  '2f': 10,
  '2f_grade': 13,
  '3f': 13,
  '3f_tela': 13,
  '3f_grade': 14,
  '3f_tela_grade': 14
}

// =====================================================
// CÁLCULO DE PESO PARA JANELAS
// =====================================================

/**
 * Encontra o valor mais próximo em uma lista de opções
 */
function findClosest(value: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  )
}

/**
 * Calcula peso da janela baseado na tabela real
 * NORMALIZA: menor valor = altura, maior valor = largura
 */
export function calculateWindowWeight(
  dim1Cm: number,
  dim2Cm: number,
  windowType: WindowType = '2f'
): number {
  // Normalizar: menor valor = altura (30-60), maior valor = largura (80-180)
  const altura = Math.min(dim1Cm, dim2Cm)
  const largura = Math.max(dim1Cm, dim2Cm)
  
  // Determinar tabela base (capelinha usa tabela própria, outros usam 2 folhas como base)
  const baseTable = windowType === 'capelinha' ? PESO_CAPELINHA : PESO_2_FOLHAS
  
  // Encontrar altura mais próxima (30, 40, 50, 60)
  const alturas = [30, 40, 50, 60]
  const alturaProxima = findClosest(altura, alturas)
  
  // Encontrar largura mais próxima (80, 100, 120, 150, 180)
  const larguras = [80, 100, 120, 150, 180]
  const larguraProxima = findClosest(largura, larguras)
  
  // Buscar peso base na tabela
  const pesoBase = baseTable[alturaProxima.toString()]?.[larguraProxima.toString()] || 10
  
  // Adicionar peso extra por tipo (capelinha não adiciona pois tem tabela própria)
  const adicional = windowType === 'capelinha' ? 0 : PESO_ADICIONAL[windowType]
  
  const pesoFinal = pesoBase + adicional
  
  console.log(`[Peso] ${dim1Cm}x${dim2Cm} (${windowType}) -> normalizado ${alturaProxima}x${larguraProxima} = ${pesoBase}kg base + ${adicional}kg adicional = ${pesoFinal}kg`)
  
  return pesoFinal
}

/**
 * Calcula dimensões do pacote para envio
 * Usa comprimento específico por tipo de janela
 */
export function calculatePackageDimensions(
  dim1Cm: number,
  dim2Cm: number,
  windowType: WindowType = '2f'
): { width: number; height: number; length: number } {
  // Normalizar dimensões
  const altura = Math.min(dim1Cm, dim2Cm)
  const largura = Math.max(dim1Cm, dim2Cm)
  
  const comprimento = COMPRIMENTO_EMBALAGEM[windowType] || 10
  
  return {
    width: largura + 5,   // Margem para embalagem
    height: altura + 5,
    length: comprimento
  }
}

// =====================================================
// API DE CÁLCULO
// =====================================================

/**
 * Calcula frete via API do Melhor Envio
 */
export async function calculateShipping(
  cepDestino: string,
  products: ShippingProduct[]
): Promise<ShippingCalculation> {
  const config = getConfig()

  console.log('[MelhorEnvio] ========== CÁLCULO DE FRETE ==========')
  console.log('[MelhorEnvio] API URL:', MELHOR_ENVIO_API)
  console.log('[MelhorEnvio] Sandbox:', process.env.MELHOR_ENVIO_SANDBOX === 'true')
  console.log('[MelhorEnvio] Token configurado:', !!config.token)
  console.log('[MelhorEnvio] CEP Origem:', config.cepOrigem)
  console.log('[MelhorEnvio] CEP Destino:', cepDestino)
  console.log('[MelhorEnvio] Produtos:', JSON.stringify(products, null, 2))

  if (!config.token) {
    console.error('[MelhorEnvio] ❌ Token não configurado!')
    return {
      success: false,
      error: 'Token do Melhor Envio não configurado'
    }
  }

  const payload = {
    from: { postal_code: config.cepOrigem.replace(/\D/g, '') },
    to: { postal_code: cepDestino.replace(/\D/g, '') },
    products: products.map(p => ({
      width: p.width,
      height: p.height,
      length: p.length,
      weight: p.weight,
      quantity: p.quantity,
      insurance_value: 0
    })),
    options: {
      receipt: false,
      own_hand: false
    },
    services: '1,2,3,4,17' // PAC, SEDEX, Mini Envios, .Package
  }

  console.log('[MelhorEnvio] Payload:', JSON.stringify(payload, null, 2))

  try {
    console.log('[MelhorEnvio] Enviando requisição para API...')
    const startTime = Date.now()
    
    const response = await fetch(`${MELHOR_ENVIO_API}/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
        'User-Agent': 'Decora Agent (contato@decora.com.br)'
      },
      body: JSON.stringify(payload)
    })

    const elapsed = Date.now() - startTime
    console.log(`[MelhorEnvio] Resposta recebida em ${elapsed}ms - Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[MelhorEnvio] ❌ Erro na API:', response.status)
      console.error('[MelhorEnvio] ❌ Resposta de erro:', errorText)
      return {
        success: false,
        error: `Erro na API: ${response.status} - ${errorText}`
      }
    }

    const quotes = await response.json() as ShippingQuote[]
    console.log('[MelhorEnvio] Cotações recebidas:', quotes.length)

    // Mostrar todas as cotações (válidas e inválidas)
    quotes.forEach((q, i) => {
      if (q.error) {
        console.log(`[MelhorEnvio] Cotação ${i + 1}: ${q.name} - ❌ ERRO: ${q.error}`)
      } else {
        console.log(`[MelhorEnvio] Cotação ${i + 1}: ${q.name} - R$ ${q.price} (${q.delivery_time} dias)`)
      }
    })

    // Filtrar cotações válidas (sem erro)
    const validQuotes = quotes.filter(q => !q.error)
    console.log('[MelhorEnvio] Cotações válidas:', validQuotes.length)

    if (validQuotes.length === 0) {
      const errors = quotes.filter(q => q.error).map(q => `${q.name}: ${q.error}`)
      console.error('[MelhorEnvio] ❌ Nenhuma cotação válida. Erros:', errors)
      return {
        success: false,
        error: `Nenhuma transportadora disponível. Erros: ${errors.join('; ')}`
      }
    }

    // Ordenar por preço
    validQuotes.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
    
    console.log('[MelhorEnvio] ✅ Melhor cotação:', validQuotes[0].name, '-', validQuotes[0].price)
    console.log('[MelhorEnvio] ========== FIM ==========')

    return {
      success: true,
      quotes: validQuotes,
      bestQuote: validQuotes[0]
    }
  } catch (error) {
    console.error('[MelhorEnvio] ❌ Erro ao calcular frete:', error)
    console.error('[MelhorEnvio] ❌ Stack:', error instanceof Error ? error.stack : 'N/A')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// =====================================================
// CÁLCULO DE FRETE PARA JANELAS
// =====================================================

/**
 * Frete fixo para São Paulo (CEP começa com 0)
 * SEMPRE R$55, independente da quantidade de janelas
 */
const SP_FIXED_FREIGHT = 55.00

/**
 * Taxa adicional por unidade para fora de SP (CEP NÃO começa com 0)
 */
const TAXA_ADICIONAL_FORA_SP = 20.00

/**
 * Dias ÚTEIS adicionais de produção para fora de SP
 */
const DIAS_UTEIS_PRODUCAO_FORA_SP = 4

/**
 * Converte dias úteis em dias corridos (estimativa)
 * 5 dias úteis = ~7 dias corridos
 */
function businessDaysToCalendarDays(businessDays: number): number {
  // Cada 5 dias úteis = 7 dias corridos aproximadamente
  return Math.ceil(businessDays * 1.4)
}

/**
 * Interface estendida do resultado de frete com informações adicionais
 */
export interface FreightResultExtended extends FreightResult {
  unitPrice?: number      // Preço unitário (para fora de SP)
  quantity?: number       // Quantidade calculada
  mePrice?: number        // Preço original do Melhor Envio
  businessDays?: number   // Dias úteis (antes de converter)
}

/**
 * Calcula frete para janela(s) considerando regras de negócio
 * 
 * REGRAS:
 * - SP (CEP 0*): R$55 FIXO independente da quantidade
 * - Fora de SP: (Melhor Envio + R$20) x QUANTIDADE + 4 dias ÚTEIS
 */
export async function calculateWindowFreight(
  cepDestino: string,
  dim1Cm: number,
  dim2Cm: number,
  quantity: number = 1,
  windowType: WindowType = '2f'
): Promise<FreightResultExtended> {
  console.log('[MelhorEnvio] ========== CÁLCULO DE FRETE JANELA ==========')
  console.log('[MelhorEnvio] Parâmetros:', { cepDestino, dim1Cm, dim2Cm, quantity, windowType })
  
  const cep = cepDestino.replace(/\D/g, '')
  const isSP = cep.startsWith('0')

  console.log('[MelhorEnvio] CEP limpo:', cep, '| É SP (começa com 0)?', isSP)

  // ===== SP: FRETE FIXO R$55 =====
  if (isSP) {
    console.log('[MelhorEnvio] ✅ SP - Frete FIXO R$55 (independente de quantidade)')
    return {
      cep,
      isSP: true,
      value: SP_FIXED_FREIGHT, // SEMPRE R$55, não multiplica
      estimatedDays: 7,
      carrier: 'Entrega Própria Decora',
      quantity
    }
  }

  // ===== FORA DE SP (CEP não começa com 0) =====
  // Calcular dimensões e peso usando tabelas reais
  const dimensions = calculatePackageDimensions(dim1Cm, dim2Cm, windowType)
  const weightPerUnit = calculateWindowWeight(dim1Cm, dim2Cm, windowType)

  console.log('[MelhorEnvio] Tipo janela:', windowType)
  console.log('[MelhorEnvio] Dimensões embalagem:', dimensions)
  console.log('[MelhorEnvio] Peso por unidade:', weightPerUnit, 'kg')

  // Calcular frete via Melhor Envio para 1 UNIDADE
  const result = await calculateShipping(cep, [{
    width: dimensions.width,
    height: dimensions.height,
    length: dimensions.length,
    weight: weightPerUnit,
    quantity: 1
  }])

  if (!result.success || !result.bestQuote) {
    console.error('[MelhorEnvio] ❌ Falha no cálculo:', result.error)
    return {
      cep,
      isSP: false,
      value: 0,
      estimatedDays: 0,
      error: result.error || 'Não foi possível calcular o frete'
    }
  }

  // Aplicar regras de negócio para fora de SP:
  const valorMEUnitario = parseFloat(result.bestQuote.price)
  const prazoMEDias = result.bestQuote.delivery_range.max
  
  // Valor: (ME + R$20) x quantidade
  const valorUnitarioFinal = valorMEUnitario + TAXA_ADICIONAL_FORA_SP
  const valorTotal = valorUnitarioFinal * quantity
  
  // Prazo: ME + 4 dias ÚTEIS (convertido para corridos)
  const diasUteisTotal = prazoMEDias + DIAS_UTEIS_PRODUCAO_FORA_SP
  const diasCorridosTotal = businessDaysToCalendarDays(diasUteisTotal)

  console.log('[MelhorEnvio] ===== CÁLCULO FORA SP =====')
  console.log('[MelhorEnvio] Melhor Envio unitário: R$', valorMEUnitario.toFixed(2), 'via', result.bestQuote.company.name)
  console.log('[MelhorEnvio] Taxa adicional: + R$', TAXA_ADICIONAL_FORA_SP.toFixed(2))
  console.log('[MelhorEnvio] Valor unitário final: R$', valorUnitarioFinal.toFixed(2))
  console.log('[MelhorEnvio] Quantidade:', quantity)
  console.log('[MelhorEnvio] ✅ VALOR TOTAL: R$', valorTotal.toFixed(2), '(', valorUnitarioFinal.toFixed(2), 'x', quantity, ')')
  console.log('[MelhorEnvio] Prazo ME:', prazoMEDias, 'dias')
  console.log('[MelhorEnvio] + Produção:', DIAS_UTEIS_PRODUCAO_FORA_SP, 'dias ÚTEIS')
  console.log('[MelhorEnvio] ✅ PRAZO TOTAL:', diasCorridosTotal, 'dias corridos (~', diasUteisTotal, 'dias úteis)')
  console.log('[MelhorEnvio] ========================================')

  return {
    cep,
    isSP: false,
    value: valorTotal,
    estimatedDays: diasCorridosTotal,
    carrier: result.bestQuote.company.name,
    // Informações adicionais
    unitPrice: valorUnitarioFinal,
    quantity,
    mePrice: valorMEUnitario,
    businessDays: diasUteisTotal
  }
}

/**
 * Calcula frete simplificado para pré-venda ML
 * Usa medidas padrão se não fornecidas
 */
export async function calculateFreightForPreSale(
  cepDestino: string,
  dim1Cm?: number,
  dim2Cm?: number,
  quantity: number = 1,
  windowType: WindowType = '2f'
): Promise<FreightResultExtended> {
  // Se não tiver medidas, usar padrão médio (100x50)
  const d1 = dim1Cm || 100
  const d2 = dim2Cm || 50

  return calculateWindowFreight(cepDestino, d1, d2, quantity, windowType)
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Formata valor de frete para exibição
 */
export function formatFreightValue(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

/**
 * Formata prazo de entrega
 */
export function formatDeliveryTime(days: number, isSP: boolean): string {
  if (isSP) {
    return 'Entrega às quintas-feiras'
  }
  return `${days} dias úteis`
}

/**
 * Verifica se CEP é válido
 */
export function isValidCep(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.length === 8
}

/**
 * Extrai CEP de uma string (mensagem do cliente)
 */
export function extractCepFromText(text: string): string | null {
  // Padrões comuns de CEP
  const patterns = [
    /\b(\d{5})-?(\d{3})\b/,           // 01310-100 ou 01310100
    /cep[:\s]*(\d{5})-?(\d{3})/i,     // CEP: 01310-100
    /\b(\d{8})\b/                      // 01310100
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Retorna apenas números
      return match[0].replace(/\D/g, '').slice(0, 8)
    }
  }

  return null
}
