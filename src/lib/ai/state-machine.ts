/**
 * Maquina de estados para conversas WhatsApp
 *
 * Resolve o problema de "dar voltas" persistindo o estado da conversa
 * e filtrando as tools disponiveis por estado.
 *
 * Inspirado na maquina de estados do Mercado Livre (pos-venda)
 * que ja funciona: active -> waiting_data -> waiting_glass -> complete
 */

// =====================================================
// TIPOS
// =====================================================

export type WhatsAppState =
  | 'greeting'             // Primeiro contato
  | 'identifying_need'     // Entendendo o que precisa
  | 'recommending'         // Recomendando produto
  | 'collecting_measures'  // Aguardando medidas
  | 'collecting_glass'     // Aguardando tipo de vidro
  | 'collecting_color'     // Aguardando cor do aluminio
  | 'quoting'              // Calculando preco
  | 'collecting_cep'       // Aguardando CEP
  | 'shipping'             // Calculando frete
  | 'closing'              // Enviando link de compra
  | 'post_sale'            // Cliente ja comprou
  | 'support'              // Duvida tecnica / FAQ
  | 'escalated'            // Escalado para humano

export interface CollectedFacts {
  model?: string           // '2f', '3f', 'capelinha', etc.
  modelName?: string       // 'Janela 2 Folhas', etc.
  environment?: string     // 'cozinha', 'banheiro', etc.
  measurements?: { width: number; height: number }
  glass?: string           // 'Incolor', 'Mini Boreal', 'Fumê'
  color?: string           // 'Branco', 'Preto'
  cep?: string
  quantity?: number
  needs?: string[]         // ['ventilacao', 'privacidade', etc.]
  wallType?: string        // 'alvenaria', 'drywall', 'container'
  price?: number           // Preco unitario
  priceTotal?: number      // Preco total (com desconto quantidade)
  shippingCost?: number    // Valor do frete
  shippingDays?: number    // Prazo do frete
  productLink?: string     // Link do Shopify
  paymentMethod?: string   // 'pix', 'cartao', 'boleto'
  deliveryRegion?: string  // 'São Paulo', 'Rio de Janeiro', etc.
  customerTone?: string    // 'animado', 'apressado', 'irritado', etc.
  customerNickname?: string // Como o cliente se refere a si mesmo
}

export interface StateDefinition {
  allowedTools: string[]
  requiredFactsToAdvance: string[]  // Quais fatos precisam existir para ir pro proximo estado
  nextState: WhatsAppState
  promptFocus: string               // O que o agente deve fazer NESTE estado
  forbiddenTopics: string[]          // O que NAO mencionar
}

interface TransitionResult {
  newState: WhatsAppState
  reason: string
  skippedStates?: WhatsAppState[]   // Estados pulados (ex: cliente deu tudo de uma vez)
}

// =====================================================
// DEFINICOES DE ESTADO
// =====================================================

export const STATE_DEFINITIONS: Record<WhatsAppState, StateDefinition> = {
  greeting: {
    allowedTools: ['recommend_product', 'check_order_status', 'update_lead_info', 'search_faq'],
    requiredFactsToAdvance: [],
    nextState: 'identifying_need',
    promptFocus: `ESTADO: SAUDACAO
Cumprimente brevemente. Pergunte como pode ajudar.
Se o cliente ja disse o que quer (modelo, ambiente, duvida), va direto ao ponto sem repetir.
Se mencionou pedido ou problema, trate imediatamente.`,
    forbiddenTopics: []
  },

  identifying_need: {
    allowedTools: ['recommend_product', 'check_order_status', 'update_lead_info', 'search_faq'],
    requiredFactsToAdvance: ['model'],
    nextState: 'collecting_measures',
    promptFocus: `ESTADO: IDENTIFICANDO NECESSIDADE
Descubra o que o cliente precisa. Se disse o ambiente, use recommend_product.
Se ja disse o modelo, confirme e avance.
Pergunte de forma natural: "pra qual comodo seria?" ou "ja sabe qual modelo?".
NAO pergunte medidas, vidro, cor ou preco ainda.`,
    forbiddenTopics: ['preco', 'frete', 'pagamento', 'vidro', 'cor']
  },

  recommending: {
    allowedTools: ['recommend_product', 'update_lead_info'],
    requiredFactsToAdvance: ['model'],
    nextState: 'collecting_measures',
    promptFocus: `ESTADO: RECOMENDANDO
Voce recomendou um modelo. Aguarde o cliente aceitar ou pedir outra opcao.
Se aceitou, avance para medidas. Se pediu algo diferente, recomende de novo.`,
    forbiddenTopics: ['preco', 'frete', 'pagamento']
  },

  collecting_measures: {
    allowedTools: ['validate_measurement', 'recommend_product', 'update_lead_info'],
    requiredFactsToAdvance: ['measurements'],
    nextState: 'collecting_glass',
    promptFocus: `ESTADO: COLETANDO MEDIDAS
Pergunte as medidas do vao (largura x altura em cm).
Se o cliente informar, use validate_measurement para validar.
Se tiver duvida sobre como medir, explique brevemente.
Dica: "qual a largura e altura do vao onde vai instalar?"`,
    forbiddenTopics: ['preco', 'frete', 'pagamento']
  },

  collecting_glass: {
    allowedTools: ['update_lead_info'],
    requiredFactsToAdvance: ['glass'],
    nextState: 'collecting_color',
    promptFocus: `ESTADO: COLETANDO VIDRO
Pergunte qual vidro prefere: Incolor, Mini Boreal ou Fume.
Se pedir explicacao:
- Incolor: transparente, maxima visibilidade
- Mini Boreal: privacidade, deixa passar luz mas nao ve detalhes
- Fume: escurece, privacidade + estetica moderna
Responda de forma curta e natural.`,
    forbiddenTopics: ['preco', 'frete', 'pagamento']
  },

  collecting_color: {
    allowedTools: ['update_lead_info'],
    requiredFactsToAdvance: ['color'],
    nextState: 'quoting',
    promptFocus: `ESTADO: COLETANDO COR
Pergunte a cor do aluminio: Branco ou Preto.
Mencione que Preto tem um acrescimo no valor.
Responda de forma curta.`,
    forbiddenTopics: ['preco exato', 'frete', 'pagamento']
  },

  quoting: {
    allowedTools: ['get_product_info', 'update_lead_info'],
    requiredFactsToAdvance: ['price'],
    nextState: 'collecting_cep',
    promptFocus: `ESTADO: CALCULANDO PRECO
Use get_product_info com: modelo, largura, altura, vidro, cor, quantidade.
Apresente o preco de forma natural.
Depois pergunte o CEP para calcular o frete.
Se o preco ja foi informado, pergunte o CEP direto.`,
    forbiddenTopics: ['pagamento']
  },

  collecting_cep: {
    allowedTools: ['calculate_shipping', 'update_lead_info'],
    requiredFactsToAdvance: ['cep'],
    nextState: 'shipping',
    promptFocus: `ESTADO: COLETANDO CEP
Pergunte o CEP para calcular o frete.
Se o cliente ja informou o CEP, use calculate_shipping imediatamente.
Se nao sabe o CEP, pergunte a cidade/estado para ajudar.`,
    forbiddenTopics: []
  },

  shipping: {
    allowedTools: ['calculate_shipping', 'update_lead_info', 'get_payment_info'],
    requiredFactsToAdvance: ['shippingCost'],
    nextState: 'closing',
    promptFocus: `ESTADO: CALCULANDO FRETE
Apresente o valor e prazo do frete de forma natural.
SP: frete fixo R$55, entrega as quintas. Gratis acima de R$500.
Fora SP: Melhor Envio + producao.
Depois de informar o frete, pergunte se quer fechar o pedido.`,
    forbiddenTopics: []
  },

  closing: {
    allowedTools: ['get_product_info', 'get_payment_info', 'create_payment_link', 'schedule_followup', 'update_lead_info', 'manage_referral'],
    requiredFactsToAdvance: [],
    nextState: 'post_sale',
    promptFocus: `ESTADO: FECHAMENTO
Envie o link do produto (retornado pelo get_product_info) para finalizar pelo site.
Se perguntar sobre pagamento, use get_payment_info.
Se quiser comprar mais de um modelo, volte pro fluxo.
Se disser que vai pensar, respeite e agende follow-up.
Pergunte se precisa de janela pra mais algum comodo (upsell natural).`,
    forbiddenTopics: []
  },

  post_sale: {
    allowedTools: ['check_order_status', 'schedule_followup', 'escalate_to_human', 'search_faq', 'manage_referral', 'update_lead_info'],
    requiredFactsToAdvance: [],
    nextState: 'post_sale',
    promptFocus: `ESTADO: POS-VENDA
O cliente ja comprou. Foco em:
- Acompanhamento do pedido (use check_order_status)
- Duvidas sobre instalacao (use search_faq)
- Indicacao para amigos (use manage_referral se pedir)
- Problemas ou reclamacoes (escale se necessario)
Seja prestativa e acolhedora. Nao tente vender de novo, a menos que o cliente peca.`,
    forbiddenTopics: []
  },

  support: {
    allowedTools: ['search_faq', 'check_order_status', 'escalate_to_human', 'update_lead_info', 'recommend_product'],
    requiredFactsToAdvance: [],
    nextState: 'support',
    promptFocus: `ESTADO: SUPORTE / DUVIDA
O cliente tem uma duvida tecnica ou precisa de ajuda.
Use search_faq para buscar na base de conhecimento.
Responda de forma clara e objetiva.
Se a duvida for resolvida e o cliente demonstrar interesse em comprar,
pergunte naturalmente se quer um orcamento.
Se nao souber responder, diga que vai verificar e escale.`,
    forbiddenTopics: ['preco', 'frete']
  },

  escalated: {
    allowedTools: [],
    requiredFactsToAdvance: [],
    nextState: 'escalated',
    promptFocus: `ESTADO: ESCALADO
A conversa foi transferida para atendimento humano.
NAO responda mais mensagens automaticamente.`,
    forbiddenTopics: []
  }
}

// =====================================================
// LOGICA DE TRANSICAO
// =====================================================

/**
 * Determina se a conversa deve mudar de estado
 * baseado nos fatos coletados e na mensagem atual
 */
export function determineTransition(
  currentState: WhatsAppState,
  facts: CollectedFacts,
  messageContent: string,
  detectedIntent?: string
): TransitionResult {
  // Se esta escalado, nao muda
  if (currentState === 'escalated') {
    return { newState: 'escalated', reason: 'Conversa escalada para humano' }
  }

  // Se esta no greeting e a intencao foi classificada, vai direto pro estado certo
  if (currentState === 'greeting' && detectedIntent) {
    const intentMapping: Partial<Record<string, WhatsAppState>> = {
      'technical_doubt': 'support',
      'installation_help': 'support',
      'order_status': 'post_sale',
      'complaint': 'escalated',
      'return_exchange': 'escalated',
      'general_question': 'support',
      'buy_window': 'identifying_need',
      'get_quote': 'identifying_need',
      'returning_customer': 'greeting'
    }
    const targetState = intentMapping[detectedIntent]
    if (targetState && targetState !== 'greeting') {
      return { newState: targetState, reason: `Intencao detectada: ${detectedIntent}` }
    }
  }

  // Logica de avanco baseada nos fatos
  const skippedStates: WhatsAppState[] = []
  let targetState = currentState

  // Se tem modelo e ainda nao passou de identifying_need
  if (facts.model && isStateBefore(currentState, 'collecting_measures')) {
    if (currentState !== 'collecting_measures') skippedStates.push(currentState)
    targetState = 'collecting_measures'
  }

  // Se tem medidas e ainda nao passou de collecting_measures
  if (facts.measurements && isStateBefore(targetState, 'collecting_glass')) {
    if (targetState !== 'collecting_glass') skippedStates.push(targetState)
    targetState = 'collecting_glass'
  }

  // Se tem vidro e ainda nao passou de collecting_glass
  if (facts.glass && isStateBefore(targetState, 'collecting_color')) {
    if (targetState !== 'collecting_color') skippedStates.push(targetState)
    targetState = 'collecting_color'
  }

  // Se tem cor e ainda nao passou de collecting_color
  if (facts.color && isStateBefore(targetState, 'quoting')) {
    if (targetState !== 'quoting') skippedStates.push(targetState)
    targetState = 'quoting'
  }

  // Se tem preco e ainda nao passou de quoting
  if (facts.price && isStateBefore(targetState, 'collecting_cep')) {
    if (targetState !== 'collecting_cep') skippedStates.push(targetState)
    targetState = 'collecting_cep'
  }

  // Se tem CEP e ainda nao passou de collecting_cep
  if (facts.cep && isStateBefore(targetState, 'shipping')) {
    if (targetState !== 'shipping') skippedStates.push(targetState)
    targetState = 'shipping'
  }

  // Se tem frete e ainda nao passou de shipping
  if (facts.shippingCost !== undefined && isStateBefore(targetState, 'closing')) {
    if (targetState !== 'closing') skippedStates.push(targetState)
    targetState = 'closing'
  }

  if (targetState !== currentState) {
    return {
      newState: targetState,
      reason: `Fatos suficientes para avancar: ${skippedStates.length > 0 ? `pulou ${skippedStates.join(' -> ')}` : 'avanco normal'}`,
      skippedStates: skippedStates.length > 0 ? skippedStates : undefined
    }
  }

  return { newState: currentState, reason: 'Sem mudanca - fatos insuficientes para avancar' }
}

// Ordem dos estados no fluxo de vendas
const SALES_FLOW_ORDER: WhatsAppState[] = [
  'greeting',
  'identifying_need',
  'recommending',
  'collecting_measures',
  'collecting_glass',
  'collecting_color',
  'quoting',
  'collecting_cep',
  'shipping',
  'closing',
  'post_sale'
]

function isStateBefore(state: WhatsAppState, target: WhatsAppState): boolean {
  const stateIndex = SALES_FLOW_ORDER.indexOf(state)
  const targetIndex = SALES_FLOW_ORDER.indexOf(target)
  // Se o estado nao esta no fluxo de vendas (support, escalated), nunca e "before"
  if (stateIndex === -1) return false
  return stateIndex < targetIndex
}

// =====================================================
// MERGE DE FATOS
// =====================================================

/**
 * Faz merge de fatos novos com fatos persistidos
 * Regra: fatos persistidos NUNCA sao sobrescritos por valores vazios/undefined
 * Fatos novos preenchem lacunas ou atualizam valores de tools (preco, link, frete)
 */
export function mergeFacts(
  persisted: CollectedFacts,
  extracted: Partial<CollectedFacts>
): CollectedFacts {
  const merged = { ...persisted }

  // Para cada campo, so atualiza se o novo valor existe e nao e vazio
  if (extracted.model) merged.model = extracted.model
  if (extracted.modelName) merged.modelName = extracted.modelName
  if (extracted.environment) merged.environment = extracted.environment
  if (extracted.measurements) merged.measurements = extracted.measurements
  if (extracted.glass) merged.glass = extracted.glass
  if (extracted.color) merged.color = extracted.color
  if (extracted.cep) merged.cep = extracted.cep
  if (extracted.quantity) merged.quantity = extracted.quantity
  if (extracted.needs?.length) {
    // Merge needs sem duplicar
    const existingNeeds = new Set(merged.needs || [])
    extracted.needs.forEach(n => existingNeeds.add(n))
    merged.needs = [...existingNeeds]
  }
  if (extracted.wallType) merged.wallType = extracted.wallType
  if (extracted.deliveryRegion) merged.deliveryRegion = extracted.deliveryRegion
  if (extracted.paymentMethod) merged.paymentMethod = extracted.paymentMethod
  if (extracted.customerTone) merged.customerTone = extracted.customerTone
  if (extracted.customerNickname) merged.customerNickname = extracted.customerNickname

  // Tool results SEMPRE atualizam (mesmo que sobrescrevam)
  if (extracted.price !== undefined) merged.price = extracted.price
  if (extracted.priceTotal !== undefined) merged.priceTotal = extracted.priceTotal
  if (extracted.shippingCost !== undefined) merged.shippingCost = extracted.shippingCost
  if (extracted.shippingDays !== undefined) merged.shippingDays = extracted.shippingDays
  if (extracted.productLink) merged.productLink = extracted.productLink

  return merged
}

/**
 * Extrai fatos dos resultados de tools executadas
 */
export function extractFactsFromToolResults(
  toolsUsed: string[],
  toolResults: Record<string, unknown>[]
): Partial<CollectedFacts> {
  const facts: Partial<CollectedFacts> = {}

  for (let i = 0; i < toolsUsed.length; i++) {
    const toolName = toolsUsed[i]
    const result = toolResults[i] as Record<string, unknown>

    if (toolName === 'get_product_info' && result) {
      if (result.price) facts.price = result.price as number
      if (result.priceTotal || result.priceFinal) {
        facts.priceTotal = (result.priceFinal || result.priceTotal) as number
      }
      if (result.link) facts.productLink = result.link as string
      if (result.model) facts.modelName = result.model as string
    }

    if (toolName === 'calculate_shipping' && result) {
      if (result.shipping_cost !== undefined) facts.shippingCost = result.shipping_cost as number
      if (result.estimated_days) facts.shippingDays = result.estimated_days as number
      if (result.cep) facts.cep = result.cep as string
    }

    if (toolName === 'validate_measurement' && result) {
      const w = result.normalizedWidth as number
      const h = result.normalizedHeight as number
      if (w && h) facts.measurements = { width: w, height: h }
    }

    if (toolName === 'recommend_product' && result) {
      if (result.recommendedModel) facts.model = result.recommendedModel as string
      if (result.modelName) facts.modelName = result.modelName as string
    }

    if (toolName === 'update_lead_info' && result) {
      // CEP pode vir de update_lead_info tambem
      const updatedFields = result.updated_fields as string[]
      if (updatedFields?.includes('CEP') && result.cep) {
        facts.cep = result.cep as string
      }
    }
  }

  return facts
}

// =====================================================
// FILTRAGEM DE TOOLS
// =====================================================

/**
 * Retorna apenas as tools permitidas no estado atual
 */
export function getFilteredToolNames(state: WhatsAppState): string[] {
  const definition = STATE_DEFINITIONS[state]
  if (!definition) return []
  return definition.allowedTools
}

// =====================================================
// FORMATACAO DE FATOS PARA PROMPT
// =====================================================

/**
 * Formata os fatos coletados para incluir no prompt
 * Usa linguagem imperativa para ENFORCAR que o agente nao re-pergunte
 */
export function formatCollectedFactsForPrompt(facts: CollectedFacts): string {
  const lines: string[] = []
  const hasAny = facts.model || facts.measurements || facts.glass ||
    facts.color || facts.cep || facts.environment || facts.needs?.length ||
    facts.price || facts.shippingCost

  if (!hasAny) return ''

  lines.push('## INFORMACOES JA COLETADAS (NUNCA pergunte de novo!)')

  if (facts.model || facts.modelName) {
    lines.push(`- Modelo: ${facts.modelName || facts.model}`)
  }
  if (facts.quantity && facts.quantity > 1) {
    lines.push(`- Quantidade: ${facts.quantity}`)
  }
  if (facts.measurements) {
    lines.push(`- Medidas: ${facts.measurements.width}x${facts.measurements.height}cm`)
  }
  if (facts.environment) {
    lines.push(`- Ambiente: ${facts.environment}`)
  }
  if (facts.needs?.length) {
    lines.push(`- Necessidades: ${facts.needs.join(', ')}`)
  }
  if (facts.glass) {
    lines.push(`- Vidro: ${facts.glass}`)
  }
  if (facts.color) {
    lines.push(`- Cor: ${facts.color}`)
  }
  if (facts.cep) {
    lines.push(`- CEP: ${facts.cep}`)
  }
  if (facts.deliveryRegion && !facts.cep) {
    lines.push(`- Regiao: ${facts.deliveryRegion} (falta CEP exato)`)
  }
  if (facts.price) {
    lines.push(`- Preco unitario: R$ ${facts.price.toFixed(2).replace('.', ',')}`)
  }
  if (facts.priceTotal && facts.priceTotal !== facts.price) {
    lines.push(`- Preco total: R$ ${facts.priceTotal.toFixed(2).replace('.', ',')}`)
  }
  if (facts.shippingCost !== undefined) {
    lines.push(`- Frete: R$ ${facts.shippingCost.toFixed(2).replace('.', ',')}${facts.shippingDays ? ` (${facts.shippingDays} dias)` : ''}`)
  }
  if (facts.productLink) {
    lines.push(`- Link do produto: ${facts.productLink}`)
  }
  if (facts.wallType) {
    lines.push(`- Parede: ${facts.wallType}`)
  }
  if (facts.paymentMethod) {
    lines.push(`- Pagamento preferido: ${facts.paymentMethod}`)
  }

  // O que falta
  const missing: string[] = []
  if (!facts.model) missing.push('modelo')
  if (!facts.measurements) missing.push('medidas')
  if (!facts.glass) missing.push('vidro')
  if (!facts.color) missing.push('cor')

  if (missing.length > 0) {
    lines.push(`\nFALTA COLETAR: ${missing.join(', ')}`)
  }

  return lines.join('\n')
}
