export interface ConversationFacts {
  environment?: string
  measurements?: { width: number; height: number }
  needs?: string[]
  recommendedModel?: string
  glass?: string
  color?: string
  cep?: string
  quantity?: number
  paymentMethod?: string
  wallType?: string
  deliveryRegion?: string
  customerTone?: string
}

interface HistoryMessage {
  direction: string
  content: string
}

const ENVIRONMENTS: Record<string, string> = {
  'cozinha': 'cozinha',
  'banheiro': 'banheiro',
  'lavabo': 'banheiro',
  'sala': 'sala',
  'quarto': 'quarto',
  'lavanderia': 'lavanderia',
  'area de servico': 'lavanderia',
  'área de serviço': 'lavanderia',
  'fachada': 'fachada',
  'varanda': 'varanda',
  'escritorio': 'escritorio',
  'escritório': 'escritorio',
  'area de mato': 'area_externa',
  'área de mato': 'area_externa',
  'area externa': 'area_externa',
  'área externa': 'area_externa',
  'garagem': 'garagem',
  'corredor': 'corredor',
  'sacada': 'sacada',
}

const NEEDS_KEYWORDS: Record<string, string> = {
  'privacidade': 'privacidade',
  'ventilacao': 'ventilacao',
  'ventilação': 'ventilacao',
  'ventilar': 'ventilacao',
  'inseto': 'insetos',
  'mosquito': 'insetos',
  'mosquiteira': 'insetos',
  'seguranca': 'seguranca',
  'segurança': 'seguranca',
  'grade': 'seguranca',
  'limpeza': 'limpeza',
  'facil de limpar': 'limpeza',
  'fácil de limpar': 'limpeza',
  'iluminacao': 'iluminacao',
  'iluminação': 'iluminacao',
  'luz': 'iluminacao',
  'claridade': 'iluminacao',
  'barulho': 'acustico',
  'ruido': 'acustico',
  'ruído': 'acustico',
}

const MODEL_KEYWORDS: Record<string, string> = {
  'capelinha': 'Capelinha',
  'pivotante': 'Capelinha',
  '2 folhas': '2 Folhas',
  '2f': '2 Folhas',
  'duas folhas': '2 Folhas',
  '3 folhas': '3 Folhas',
  '3f': '3 Folhas',
  'tres folhas': '3 Folhas',
  'três folhas': '3 Folhas',
  '3f tela': '3 Folhas com Tela',
  'com tela': '3 Folhas com Tela',
  'tela mosquiteira': '3 Folhas com Tela',
  'com grade': 'Com Grade',
}

const GLASS_KEYWORDS: Record<string, string> = {
  'mini boreal': 'Mini Boreal',
  'boreal': 'Mini Boreal',
  'fume': 'Fumê',
  'fumê': 'Fumê',
  'incolor': 'Incolor',
  'temperado': 'Temperado',
  'transparente': 'Incolor',
}

const COLOR_KEYWORDS: Record<string, string> = {
  'branco': 'Branco',
  'branca': 'Branco',
  'preto': 'Preto',
  'preta': 'Preto',
}

const WALL_KEYWORDS: Record<string, string> = {
  'drywall': 'drywall',
  'dry wall': 'drywall',
  'gesso': 'drywall',
  'alvenaria': 'alvenaria',
  'tijolo': 'alvenaria',
  'concreto': 'alvenaria',
  'container': 'container',
  'contêiner': 'container',
}

const PAYMENT_KEYWORDS: Record<string, string> = {
  'pix': 'pix',
  'cartao': 'cartao',
  'cartão': 'cartao',
  'credito': 'cartao',
  'crédito': 'cartao',
  'debito': 'debito',
  'débito': 'debito',
  'boleto': 'boleto',
  'parcelar': 'cartao',
  'parcela': 'cartao',
  '10x': 'cartao',
}

const REGION_KEYWORDS: Record<string, string> = {
  'rio de janeiro': 'Rio de Janeiro',
  'sao paulo': 'São Paulo',
  'são paulo': 'São Paulo',
  'minas gerais': 'Minas Gerais',
  'belo horizonte': 'Belo Horizonte',
  'curitiba': 'Curitiba',
  'parana': 'Paraná',
  'paraná': 'Paraná',
  'bahia': 'Bahia',
  'salvador': 'Salvador',
  'recife': 'Recife',
  'pernambuco': 'Pernambuco',
  'fortaleza': 'Fortaleza',
  'ceara': 'Ceará',
  'ceará': 'Ceará',
  'brasilia': 'Brasília',
  'brasília': 'Brasília',
  'goiania': 'Goiânia',
  'goiânia': 'Goiânia',
  'porto alegre': 'Porto Alegre',
  'florianopolis': 'Florianópolis',
  'florianópolis': 'Florianópolis',
  'campinas': 'Campinas',
  'interior de sp': 'Interior de SP',
  'litoral': 'Litoral',
  'manaus': 'Manaus',
  'belem': 'Belém',
  'belém': 'Belém',
}

const MEASUREMENT_PATTERNS = [
  /(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*(?:x|por)\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i,
  /(\d+(?:[.,]\d+)?)\s*(?:cm|centimetros|centímetros)\s*(?:de\s*)?(?:altura|alt)\s*(?:x|por|e)?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|centimetros|centímetros)?\s*(?:de\s*)?(?:largura|larg)?/i,
  /(\d+(?:[.,]\d+)?)\s*(?:cm|centimetros|centímetros)\s*(?:de\s*)?(?:largura|larg)\s*(?:x|por|e)?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|centimetros|centímetros)?\s*(?:de\s*)?(?:altura|alt)?/i,
  /(\d+(?:[.,]\d+)?)\s*(?:m|metro|metros)\s*(?:de\s*)?(?:largura|larg)?\s*(?:x|por|e)?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|centimetros|centímetros)\s*(?:de\s*)?(?:altura|alt)?/i,
  /(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*(?:de\s*)?(?:altura|alt)\s*(?:x|por|e)?\s*(\d+(?:[.,]\d+)?)\s*(?:m|metro|metros)\s*(?:de\s*)?(?:largura|larg)?/i,
]

const QUANTITY_PATTERN = /(\d+)\s*(?:janelas?|unidades?|pecas?|peças?)/i

const CEP_PATTERN = /\b(\d{5})-?(\d{3})\b/

function parseNumber(str: string): number {
  const cleaned = str.replace(',', '.')
  const num = parseFloat(cleaned)
  if (num > 0 && num <= 5) return num * 100
  return num
}

function findKeyword(text: string, keywords: Record<string, string>): string | undefined {
  const lower = text.toLowerCase()
  for (const [keyword, value] of Object.entries(keywords)) {
    if (lower.includes(keyword)) return value
  }
  return undefined
}

function findAllKeywords(text: string, keywords: Record<string, string>): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const [keyword, value] of Object.entries(keywords)) {
    if (lower.includes(keyword)) found.add(value)
  }
  return [...found]
}

export function extractConversationFacts(history: HistoryMessage[]): ConversationFacts {
  const facts: ConversationFacts = {}
  const allNeeds = new Set<string>()

  for (const msg of history) {
    const content = msg.content || ''
    const isClient = msg.direction === 'inbound'

    // Modelo: detectar de AMBAS as direcoes (cliente pode dizer "duas folhas", agente pode recomendar)
    if (!facts.recommendedModel) {
      facts.recommendedModel = findKeyword(content, MODEL_KEYWORDS)
    }

    if (isClient) {
      if (!facts.environment) {
        facts.environment = findKeyword(content, ENVIRONMENTS)
      }

      if (!facts.quantity) {
        const qtyMatch = content.match(QUANTITY_PATTERN)
        if (qtyMatch) facts.quantity = parseInt(qtyMatch[1], 10)
      }

      if (!facts.measurements) {
        for (const pattern of MEASUREMENT_PATTERNS) {
          const match = content.match(pattern)
          if (match) {
            const val1 = parseNumber(match[1])
            const val2 = parseNumber(match[2])
            const lower = content.toLowerCase()

            if (lower.includes('altura') && lower.includes('largura') && lower.indexOf('altura') < lower.indexOf('largura')) {
              facts.measurements = { width: val2, height: val1 }
            } else if (lower.includes('largura') && lower.includes('altura') && lower.indexOf('largura') < lower.indexOf('altura')) {
              facts.measurements = { width: val1, height: val2 }
            } else {
              const [smaller, larger] = val1 < val2 ? [val1, val2] : [val2, val1]
              facts.measurements = { width: larger, height: smaller }
            }
            break
          }
        }
      }

      const clientNeeds = findAllKeywords(content, NEEDS_KEYWORDS)
      clientNeeds.forEach(n => allNeeds.add(n))

      if (!facts.glass) facts.glass = findKeyword(content, GLASS_KEYWORDS)
      if (!facts.color) facts.color = findKeyword(content, COLOR_KEYWORDS)
      if (!facts.wallType) facts.wallType = findKeyword(content, WALL_KEYWORDS)
      if (!facts.paymentMethod) facts.paymentMethod = findKeyword(content, PAYMENT_KEYWORDS)

      if (!facts.cep) {
        const cepMatch = content.match(CEP_PATTERN)
        if (cepMatch) facts.cep = `${cepMatch[1]}-${cepMatch[2]}`
      }

      if (!facts.deliveryRegion && !facts.cep) {
        facts.deliveryRegion = findKeyword(content, REGION_KEYWORDS)
      }
    }
  }

  if (allNeeds.size > 0) facts.needs = [...allNeeds]

  // ===== DETECCAO DE TOM DO CLIENTE (para humanizacao) =====
  const lastClientMessages = history.filter(m => m.direction === 'inbound').slice(-3)
  if (lastClientMessages.length > 0) {
    facts.customerTone = detectCustomerTone(lastClientMessages.map(m => m.content))
  }

  return facts
}

/**
 * Detecta o tom emocional do cliente baseado nas ultimas mensagens
 */
function detectCustomerTone(messages: string[]): string | undefined {
  const combined = messages.join(' ').toLowerCase()

  // Irritado / Frustrado
  if (/(!{2,}|absurdo|vergonha|p[eé]ssim|hor[rí]vel|lixo|porcaria|raiva|irritad|frustra|cansei|n[aã]o aguento)/i.test(combined)) {
    return 'irritado'
  }

  // Apressado / Urgente
  if (/\b(urgente|urgência|rapid|logo|agora|hoje|preciso (pra |para )?(já|hoje|amanha)|depressa|correndo)\b/i.test(combined)) {
    return 'apressado'
  }

  // Confuso / Com duvidas
  if (/\b(n[aã]o (entendi|sei|entendo)|confus|como assim|qual a diferença|me explica|nao entendi|desculpa|me perdi)\b/i.test(combined)) {
    return 'confuso'
  }

  // Indeciso
  if (/\b(n[aã]o sei (se|qual)|sera que|será que|talvez|sei l[aá]|depende|vou pensar|deixa eu ver|estou em duvida)\b/i.test(combined)) {
    return 'indeciso'
  }

  // Animado / Feliz
  if (/\b(amei|adorei|perfeito|maravilh|incrível|otimo|show|top|sensacional|lindo|😍|❤️|🔥)\b/i.test(combined)) {
    return 'animado'
  }

  // Mensagens muito curtas = objetivo
  const avgLength = messages.reduce((sum, m) => sum + m.length, 0) / messages.length
  if (avgLength < 20) {
    return 'objetivo'
  }

  return undefined
}

export function getNextStep(facts: ConversationFacts): string {
  const hasModel = !!facts.recommendedModel
  const hasMeasures = !!facts.measurements
  const hasGlass = !!facts.glass
  const hasColor = !!facts.color
  const hasCep = !!facts.cep

  // 1. Modelo
  if (!hasModel) {
    if (facts.environment && facts.needs?.length) {
      return `USE recommend_product (environment: "${facts.environment}", needs: [${facts.needs!.map(n => `"${n}"`).join(', ')}])`
    }
    return 'Pergunte qual modelo de janela precisa, ou o que precisa pra poder recomendar'
  }

  // 2. Medidas
  if (!hasMeasures) {
    return `Modelo: ${facts.recommendedModel}. Pergunte as medidas do vao (largura x altura em cm)`
  }

  // 3. Vidro
  if (!hasGlass) {
    return `Pergunte qual vidro prefere: Incolor, Mini Boreal ou Fume`
  }

  // 4. Cor
  if (!hasColor) {
    return `Pergunte a cor do aluminio: Branco ou Preto`
  }

  // 5. Preco (tem modelo + medidas + vidro + cor)
  if (!hasCep) {
    return `Tem tudo pra dar preco. USE get_product_info (model, width, height, glass, color${facts.quantity ? `, quantity: ${facts.quantity}` : ''}). Depois pergunte o CEP pro frete`
  }

  // 6. Frete (tem tudo)
  return `Tem tudo. USE get_product_info e calculate_shipping juntos`
}

export function formatFactsForPrompt(facts: ConversationFacts): string {
  const lines: string[] = []
  const hasAnyFact = facts.environment || facts.measurements || facts.needs?.length ||
    facts.recommendedModel || facts.glass || facts.color || facts.cep ||
    facts.paymentMethod || facts.wallType || facts.quantity || facts.deliveryRegion

  if (!hasAnyFact) return ''

  lines.push('## INFORMACOES JA COLETADAS (NAO pergunte de novo)')

  if (facts.recommendedModel) lines.push(`- Modelo: ${facts.recommendedModel}`)
  if (facts.quantity) lines.push(`- Quantidade: ${facts.quantity}`)
  if (facts.measurements) lines.push(`- Medidas: ${facts.measurements.width}x${facts.measurements.height}cm`)
  if (facts.environment) lines.push(`- Ambiente: ${facts.environment}`)
  if (facts.needs?.length) lines.push(`- Necessidades: ${facts.needs.join(', ')}`)
  if (facts.glass) lines.push(`- Vidro: ${facts.glass}`)
  if (facts.color) lines.push(`- Cor: ${facts.color}`)
  if (facts.cep) lines.push(`- CEP: ${facts.cep}`)
  if (facts.deliveryRegion && !facts.cep) lines.push(`- Regiao de entrega: ${facts.deliveryRegion} (falta CEP exato)`)
  if (facts.paymentMethod) lines.push(`- Pagamento: ${facts.paymentMethod}`)
  if (facts.wallType) lines.push(`- Parede: ${facts.wallType}`)

  // Listar o que FALTA coletar
  const missing: string[] = []
  if (!facts.recommendedModel) missing.push('modelo')
  if (!facts.measurements) missing.push('medidas')
  if (!facts.glass) missing.push('vidro')
  if (!facts.color) missing.push('cor')
  if (missing.length > 0) {
    lines.push(`\nFALTA COLETAR: ${missing.join(', ')}`)
  }

  const nextStep = getNextStep(facts)
  if (nextStep) {
    lines.push(`\nPROXIMO PASSO: ${nextStep}`)
  }

  return lines.join('\n')
}
