/**
 * Especificações de Produtos - Decora Esquadrias
 * Base de conhecimento oficial para o agente de IA
 */

// =====================================================
// MODELOS DE JANELAS
// =====================================================

export interface ModelSpec {
  id: string
  name: string
  shortName: string
  description: string
  ventilation: 1 | 2 | 3 | 4 | 5 // 1 = menor, 5 = maior
  idealFor: string[]
  features: string[]
  notes?: string
  depthAddition?: number // cm adicionais na profundidade
}

export const MODELS: Record<string, ModelSpec> = {
  '2f': {
    id: '2f',
    name: 'Janela de Correr 2 Folhas',
    shortName: '2 Folhas',
    description: 'Duas folhas móveis com trilho duplo. Modelo mais compacto e clean.',
    ventilation: 3,
    idealFor: ['cozinha', 'banheiro', 'lavanderia'],
    features: [
      'Duas folhas móveis',
      'Trilho duplo',
      'Modelo mais compacto',
      'Excelente vedação',
      'Abertura média'
    ]
  },
  '3f': {
    id: '3f',
    name: 'Janela de Correr 3 Folhas',
    shortName: '3 Folhas',
    description: 'Três folhas móveis com três trilhos independentes. Maior ventilação.',
    ventilation: 4,
    idealFor: ['sala', 'quarto', 'cozinha grande'],
    features: [
      'Três folhas móveis',
      'Três trilhos independentes',
      'Abertura muito maior (2/3 do vão)',
      'Ideal para janelas largas (120cm+)',
      'Estrutura mais robusta'
    ]
  },
  '2f_tela': {
    id: '2f_tela',
    name: 'Janela 2 Folhas com Tela Mosquiteira',
    shortName: '2 Folhas + Tela',
    description: 'Estrutura de 3 folhas com tela mosquiteira fixa no lado interno esquerdo.',
    ventilation: 3,
    idealFor: ['cozinha', 'quarto', 'área com insetos'],
    features: [
      'Tela sempre no lado interno esquerdo',
      'Proteção contra insetos',
      'Mesma estrutura da 3 folhas',
      'Excelente para regiões com mosquitos'
    ],
    notes: 'A tela reduz levemente a ventilação mas mantém proteção total contra insetos.'
  },
  '3f_tela': {
    id: '3f_tela',
    name: 'Janela 3 Folhas com Tela Mosquiteira',
    shortName: '3 Folhas + Tela',
    description: 'Três folhas com tela mosquiteira integrada.',
    ventilation: 3,
    idealFor: ['sala', 'quarto', 'área com insetos'],
    features: [
      'Tela no lado interno esquerdo',
      'Máxima ventilação com proteção',
      'Ideal para áreas rurais ou com muitos insetos'
    ]
  },
  // NOTA: 'grade' genérico foi substituído por '2f_grade', '3f_grade', '3f_tela_grade'
  // Mantido apenas para compatibilidade, usar os tipos específicos
  'grade': {
    id: 'grade',
    name: 'Janela com Grade de Proteção',
    shortName: 'Com Grade',
    description: 'Use 2f_grade, 3f_grade ou 3f_tela_grade para tipos específicos.',
    ventilation: 3,
    idealFor: ['térreo', 'área de risco', 'quarto de criança'],
    features: [
      'Grade de alumínio embutida',
      'Mesma pintura da janela (preta ou branca)',
      'Design elegante e discreto'
    ],
    depthAddition: 1.5,
    notes: 'DEPRECADO: Usar 2f_grade, 3f_grade ou 3f_tela_grade.'
  },
  'capelinha': {
    id: 'capelinha',
    name: 'Vitrô Pivotante (Capelinha)',
    shortName: 'Capelinha',
    description: 'Abre 90º no próprio eixo. Maior ventilação de todas. Linha 25.',
    ventilation: 5,
    idealFor: ['banheiro', 'lavanderia', 'fachada alta'],
    features: [
      'Abre 90º no próprio eixo',
      'Maior ventilação de todos os modelos',
      'Pode ser instalado vertical ou horizontal',
      'Medidas podem ser invertidas conforme orientação',
      'Ideal para locais altos'
    ],
    notes: 'ALERTA: Em chuva muito forte com vento lateral, pode entrar um pouco de água. Para regiões muito chuvosas, recomendar janela de correr.'
  },
  'capelinha_3v': {
    id: 'capelinha_3v',
    name: 'Vitrô Pivotante Três Vidros',
    shortName: 'Capelinha 3V',
    description: 'Vitrô pivotante com três divisões de vidro para maior sofisticação. Linha 25.',
    ventilation: 5,
    idealFor: ['banheiro', 'lavanderia', 'fachada'],
    features: [
      'Três divisões de vidro decorativas',
      'Abre 90º no próprio eixo',
      'Pode ser instalado vertical ou horizontal',
      'Design diferenciado e elegante'
    ],
    notes: 'Mesmo alerta de chuva da capelinha comum. Preço um pouco maior devido ao design.'
  },
  '2f_grade': {
    id: '2f_grade',
    name: 'Janela 2 Folhas com Grade',
    shortName: '2F + Grade',
    description: 'Janela de correr 2 folhas com grade de proteção embutida. Linha Suprema.',
    ventilation: 3,
    idealFor: ['térreo', 'área de risco', 'quarto de criança'],
    features: [
      'Grade de alumínio embutida',
      'Mesma pintura da janela',
      'Duas folhas móveis',
      'Segurança sem perder estética'
    ],
    depthAddition: 1.5,
    notes: 'Grade embutida adiciona +1,5cm na profundidade.'
  },
  '3f_grade': {
    id: '3f_grade',
    name: 'Janela 3 Folhas com Grade',
    shortName: '3F + Grade',
    description: 'Janela de correr 3 folhas com grade de proteção embutida. Linha Suprema.',
    ventilation: 3,
    idealFor: ['térreo', 'área de risco', 'sala'],
    features: [
      'Grade de alumínio embutida',
      'Três folhas móveis',
      'Maior abertura com segurança',
      'Disponível apenas em larguras 120cm+'
    ],
    depthAddition: 1.5,
    notes: 'Grade embutida adiciona +1,5cm na profundidade. Só disponível em larguras 120, 150, 180cm.'
  },
  '3f_tela_grade': {
    id: '3f_tela_grade',
    name: 'Janela 3 Folhas com Tela e Grade',
    shortName: '3F + Tela + Grade',
    description: 'Proteção completa: tela mosquiteira e grade de segurança. Linha Suprema.',
    ventilation: 3,
    idealFor: ['térreo com insetos', 'área rural', 'quarto de criança'],
    features: [
      'Tela mosquiteira integrada',
      'Grade de alumínio embutida',
      'Máxima proteção',
      'Três folhas móveis'
    ],
    depthAddition: 1.5,
    notes: 'Modelo mais completo em termos de proteção.'
  }
}

// Ordem de ventilação (maior para menor)
export const VENTILATION_ORDER = ['capelinha', 'capelinha_3v', '3f', '3f_tela', '3f_grade', '3f_tela_grade', '2f', '2f_grade', '2f_tela']

// Lista de todos os tipos de produto
export const ALL_PRODUCT_TYPES = [
  'capelinha',
  'capelinha_3v',
  '2f',
  '2f_grade',
  '3f',
  '3f_grade',
  '3f_tela',
  '3f_tela_grade',
  'arremate'
] as const

export type ProductTypeId = typeof ALL_PRODUCT_TYPES[number]

// =====================================================
// VIDROS
// =====================================================

export interface GlassSpec {
  id: string
  name: string
  privacy: 1 | 2 | 3 | 4 | 5 // 1 = transparente, 5 = máxima privacidade
  light: 1 | 2 | 3 | 4 | 5 // 1 = pouca luz, 5 = máxima luz
  description: string
  idealFor: string[]
  thickness: number // mm
}

export const GLASSES: Record<string, GlassSpec> = {
  'incolor': {
    id: 'incolor',
    name: 'Vidro Incolor',
    privacy: 1,
    light: 5,
    description: 'Máxima iluminação, totalmente transparente.',
    idealFor: ['cozinha', 'lavanderia', 'sala'],
    thickness: 4
  },
  'comum': {
    id: 'comum',
    name: 'Vidro Comum',
    privacy: 1,
    light: 5,
    description: 'Vidro padrão, transparente e econômico.',
    idealFor: ['cozinha', 'lavanderia'],
    thickness: 4
  },
  'mini_boreal': {
    id: 'mini_boreal',
    name: 'Vidro Mini Boreal',
    privacy: 5,
    light: 4,
    description: 'Máxima privacidade, deixa entrar bastante luz.',
    idealFor: ['banheiro', 'quarto', 'escritório'],
    thickness: 4
  },
  'fume': {
    id: 'fume',
    name: 'Vidro Fumê',
    privacy: 3,
    light: 3,
    description: 'Reduz intensidade da luz, estética moderna. Não é muito escuro.',
    idealFor: ['fachada', 'cozinha moderna', 'sala'],
    thickness: 4
  },
  'temperado': {
    id: 'temperado',
    name: 'Vidro Temperado',
    privacy: 1,
    light: 5,
    description: 'Mais resistente a impactos, não estilhaça em farpas.',
    idealFor: ['área de risco', 'quarto de criança'],
    thickness: 4
  }
}

// =====================================================
// CORES
// =====================================================

export interface ColorSpec {
  id: string
  name: string
  hexCode: string
}

export const COLORS: Record<string, ColorSpec> = {
  'branco': { id: 'branco', name: 'Branco', hexCode: '#FFFFFF' },
  'preto': { id: 'preto', name: 'Preto', hexCode: '#1a1a1a' },
  'bronze': { id: 'bronze', name: 'Bronze', hexCode: '#614E1A' }
}

// =====================================================
// QUALIDADE E DIFERENCIAL
// =====================================================

export const QUALITY_INFO = {
  linha: {
    name: 'Linha 25 (Suprema)',
    description: 'Superior às linhas 15, 16 e 17 vendidas em home centers',
    benefits: [
      'Alumínio mais espesso e resistente',
      'Não empena com o tempo',
      'Vida útil muito maior',
      'Estrutura rígida e bonita'
    ]
  },
  pintura: {
    name: 'Pintura Eletrostática em Pó',
    description: 'Processo que fixa a tinta no metal a altas temperaturas',
    benefits: [
      'Não descasca',
      'Não desbota',
      'Resistente a UV, calor e chuva',
      'Mesma tecnologia de indústrias premium'
    ]
  },
  roldanas: {
    name: 'Roldanas com Rolamento Interno',
    description: 'Movimento suave e silencioso',
    benefits: [
      'Deslizamento perfeito',
      'Sem necessidade de lubrificação',
      'Vida útil prolongada'
    ]
  },
  fecho: {
    name: 'Fecho Antifurto',
    description: 'Trava internamente, não permite abertura externa',
    benefits: [
      'Segurança superior',
      'Só abre por dentro apertando o botão'
    ]
  },
  vedacao: {
    name: 'Borrachas de Vedação Premium',
    description: 'Vedação superior contra água e vento',
    benefits: [
      'Não ressecam facilmente',
      'Excelente vedação contra chuva',
      'Reduzem ruído externo'
    ]
  }
}

// =====================================================
// COMPARAÇÃO COM CONCORRENTES
// =====================================================

export const COMPARISON = {
  homeCenter: {
    linhas: ['15', '16', '17'],
    problems: [
      'Muito finas e frágeis',
      'Empenam com o tempo',
      'Fecham mal',
      'Pintura inferior',
      'Roldanas fracas',
      'Trilhos rasos (facilita vazamento)',
      'Vida útil menor'
    ]
  },
  decora: {
    linha: '25 (Suprema)',
    advantages: [
      'Alumínio espesso (linha 25)',
      'Vidro de 4mm',
      'Roldanas de alta qualidade',
      'Borrachas de vedação premium',
      'Trilhos profundos',
      'Fecho antifurto',
      'Regulagem completa antes do envio'
    ]
  }
}

// =====================================================
// ACESSÓRIOS
// =====================================================

export const ACCESSORIES = {
  arremate: {
    name: 'Kit Arremate',
    priceNormal: 180,
    priceOrderBump: 117, // Preço promocional quando oferecido
    description: 'Acabamento premium com corte em 45º para instalação perfeita',
    channels: ['whatsapp', 'shopify'], // NÃO vende no Mercado Livre
    offerRule: 'Um kit por pedido completo, independente da quantidade de janelas',
    notes: 'SEMPRE oferecer pelo preço order bump de R$117. Não disponível no ML.'
  },
  fechoAviao: {
    name: 'Fecho-Avião',
    price: 50.00,
    description: 'Permite abrir e fechar sem alcançar a folha',
    compatibleWith: ['capelinha', 'capelinha_3v'],
    notes: 'Somente para Capelinha horizontal'
  }
}

// =====================================================
// REGRAS DE DESCONTO
// =====================================================

export const DISCOUNT_RULES = {
  // Descontos aplicam em Shopify e WhatsApp (Yampi), NÃO no Mercado Livre
  channels: ['shopify', 'whatsapp'],
  quantity: {
    2: 0.05, // 2 janelas: 5%
    3: 0.10, // 3+ janelas: 10%
  },
  pix: 0.05, // +5% adicional no Pix
  description: '2 janelas: 5% | 3+ janelas: 10% | Pix: +5% adicional'
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getModelById(id: string): ModelSpec | undefined {
  return MODELS[id]
}

export function getGlassById(id: string): GlassSpec | undefined {
  return GLASSES[id]
}

export function getRecommendedGlassForEnvironment(environment: string): string {
  const recommendations: Record<string, string> = {
    'banheiro': 'mini_boreal',
    'cozinha': 'incolor',
    'lavanderia': 'incolor',
    'quarto': 'mini_boreal',
    'sala': 'incolor',
    'fachada': 'fume'
  }
  return recommendations[environment] || 'incolor'
}

export function getRecommendedModelForEnvironment(environment: string): string[] {
  const recommendations: Record<string, string[]> = {
    'banheiro': ['capelinha', '2f'],
    'cozinha': ['3f', '2f', '2f_tela'],
    'lavanderia': ['capelinha', '2f'],
    'quarto': ['3f', '2f_tela'],
    'sala': ['3f', '3f_tela'],
    'area_com_insetos': ['2f_tela', '3f_tela']
  }
  return recommendations[environment] || ['2f', '3f']
}
