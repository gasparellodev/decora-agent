/**
 * Regras de Medidas - Decora Esquadrias
 * Base de conhecimento oficial para o agente de IA
 */

// =====================================================
// MEDIDAS PADRÃO
// =====================================================

// Alturas disponíveis (em cm)
export const STANDARD_HEIGHTS = [30, 40, 50, 60]

// Larguras disponíveis (em cm)
export const STANDARD_WIDTHS = [80, 100, 120, 150, 180]

// Todas as combinações padrão
export const STANDARD_SIZES = STANDARD_HEIGHTS.flatMap(h => 
  STANDARD_WIDTHS.map(w => ({ height: h, width: w }))
)

// =====================================================
// LIMITES DE FABRICAÇÃO
// =====================================================

export const LIMITS = {
  // Medidas mínimas
  min: {
    width: 30,  // cm
    height: 60  // cm - Menor tamanho fabricado: 30x60
  },
  
  // Máximo para FORA de São Paulo (limitação de transporte)
  maxOutsideSP: {
    width: 180,  // cm
    height: 60   // cm
  },
  
  // Máximo para Grande São Paulo
  maxSP: {
    width: 200,  // cm (apenas quando solicitado)
    height: 60   // cm
  }
}

// =====================================================
// FOLGAS OBRIGATÓRIAS PARA INSTALAÇÃO
// =====================================================

export const INSTALLATION_CLEARANCE = {
  lateral: 5,  // mm totais (divididos entre esquerdo e direito)
  topo: 3      // mm na parte superior
}

// =====================================================
// REGRAS DE NORMALIZAÇÃO
// =====================================================

/**
 * Normaliza uma medida para o múltiplo de 0.5cm mais próximo (arredondando para baixo)
 * Exemplo: 37.6 → 37.5, 104.3 → 104, 41.7 → 41.5
 */
export function normalizeToHalfCm(value: number): number {
  return Math.floor(value * 2) / 2
}

/**
 * Normaliza para múltiplo de 10cm (arredondando para baixo)
 * Usado para encontrar medida padrão mais próxima
 */
export function normalizeToTenCm(value: number): number {
  return Math.floor(value / 10) * 10
}

/**
 * Encontra a medida padrão mais próxima (para baixo)
 */
export function findNearestStandardSize(width: number, height: number): { width: number; height: number } {
  const nearestHeight = STANDARD_HEIGHTS.filter(h => h <= height).pop() || STANDARD_HEIGHTS[0]
  const nearestWidth = STANDARD_WIDTHS.filter(w => w <= width).pop() || STANDARD_WIDTHS[0]
  
  return { width: nearestWidth, height: nearestHeight }
}

// =====================================================
// VALIDAÇÃO DE MEDIDAS
// =====================================================

export interface MeasurementValidation {
  isValid: boolean
  normalizedWidth: number
  normalizedHeight: number
  nearestStandard: { width: number; height: number }
  errors: string[]
  warnings: string[]
  message: string
}

/**
 * Valida e normaliza medidas completas
 */
export function validateMeasurement(
  width: number,
  height: number,
  cep?: string
): MeasurementValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Normalizar para múltiplo de 0.5cm
  const normalizedWidth = normalizeToHalfCm(width)
  const normalizedHeight = normalizeToHalfCm(height)
  
  // Verificar se é SP ou fora
  const isSP = cep?.startsWith('0') || false
  const maxWidth = isSP ? LIMITS.maxSP.width : LIMITS.maxOutsideSP.width
  
  // Validar mínimos
  if (width < LIMITS.min.width) {
    errors.push(`Largura muito pequena. Mínimo: ${LIMITS.min.width}cm`)
  }
  if (height < LIMITS.min.height) {
    errors.push(`Altura muito pequena. Mínimo: ${LIMITS.min.height}cm`)
  }
  
  // Validar máximos
  if (width > maxWidth) {
    if (isSP) {
      errors.push(`Largura acima do máximo para SP (${maxWidth}cm). Precisa avaliação especial.`)
    } else {
      errors.push(`Largura acima do limite para transporte fora de SP (${maxWidth}cm). Não é possível enviar.`)
    }
  }
  
  // Warnings para medidas não padrão
  if (!STANDARD_HEIGHTS.includes(normalizedHeight)) {
    warnings.push(`Altura ${normalizedHeight}cm não é padrão. Padrões: ${STANDARD_HEIGHTS.join(', ')}cm`)
  }
  if (!STANDARD_WIDTHS.includes(normalizedWidth)) {
    warnings.push(`Largura ${normalizedWidth}cm não é padrão. Padrões: ${STANDARD_WIDTHS.join(', ')}cm`)
  }
  
  // Encontrar medida padrão mais próxima
  const nearestStandard = findNearestStandardSize(normalizedWidth, normalizedHeight)
  
  // Construir mensagem
  let message = ''
  if (errors.length > 0) {
    message = errors.join(' ')
  } else if (width !== normalizedWidth || height !== normalizedHeight) {
    message = `Medida ajustada: ${normalizedWidth}x${normalizedHeight}cm (arredondada para múltiplo de 0.5cm). `
    if (nearestStandard.width !== normalizedWidth || nearestStandard.height !== normalizedHeight) {
      message += `Medida padrão mais próxima: ${nearestStandard.width}x${nearestStandard.height}cm.`
    }
  } else {
    message = `Medida ${normalizedWidth}x${normalizedHeight}cm válida.`
  }
  
  return {
    isValid: errors.length === 0,
    normalizedWidth,
    normalizedHeight,
    nearestStandard,
    errors,
    warnings,
    message
  }
}

// =====================================================
// MEDIDAS RECOMENDADAS POR AMBIENTE
// =====================================================

export interface RecommendedSize {
  width: number
  height: number
  description: string
}

export const RECOMMENDED_SIZES: Record<string, RecommendedSize[]> = {
  banheiro: [
    { width: 80, height: 40, description: 'Mais comum para banheiros pequenos' },
    { width: 80, height: 50, description: 'Boa ventilação' },
    { width: 100, height: 40, description: 'Banheiros médios' },
    { width: 100, height: 50, description: 'Máxima ventilação para banheiro' },
    { width: 80, height: 30, description: 'Vãos muito pequenos' }
  ],
  cozinha: [
    { width: 150, height: 60, description: 'Ideal para cozinhas' },
    { width: 180, height: 60, description: 'Máxima ventilação' },
    { width: 180, height: 40, description: 'Cozinhas com armários altos' },
    { width: 120, height: 40, description: 'Acima de armários (janela estreita)' },
    { width: 120, height: 30, description: 'Acima de armários (mínima)' }
  ],
  lavanderia: [
    { width: 100, height: 50, description: 'Lavanderias pequenas' },
    { width: 120, height: 60, description: 'Lavanderias médias' },
    { width: 80, height: 40, description: 'Vãos pequenos' }
  ],
  sala: [
    { width: 150, height: 60, description: 'Salas médias' },
    { width: 180, height: 60, description: 'Máxima iluminação' },
    { width: 120, height: 60, description: 'Salas pequenas' }
  ],
  quarto: [
    { width: 120, height: 60, description: 'Quartos padrão' },
    { width: 150, height: 60, description: 'Quartos grandes' },
    { width: 100, height: 50, description: 'Quartos pequenos' }
  ]
}

// =====================================================
// ALERTAS IMPORTANTES
// =====================================================

export const MEASUREMENT_ALERTS = {
  confirmOrder: 'Você está me passando ALTURA x LARGURA, certo? A medida deve ser da abertura interna do vão.',
  clearanceNote: `Lembre-se: é necessário ${INSTALLATION_CLEARANCE.lateral}mm de folga lateral e ${INSTALLATION_CLEARANCE.topo}mm no topo para instalação perfeita.`,
  notRecommended30x30: 'Medida 30x30 não é recomendada - passa pouca luz.',
  customSizeNote: 'Trabalhamos com medidas precisas em múltiplos de 0,5cm. Sua medida será ajustada automaticamente.',
  outsideSPLimit: 'Para fora de SP, o máximo é 180cm de largura (limitação de transporte).',
  spLimit: 'Para SP, podemos produzir até 200cm mediante solicitação especial.'
}

// =====================================================
// DIMENSÕES VÁLIDAS POR TIPO DE PRODUTO
// =====================================================

export type ProductOrientation = 'horizontal' | 'vertical'

export interface ValidDimensions {
  alturas: number[]
  larguras: number[]
  orientacoes?: ProductOrientation[]
}

/**
 * Dimensões válidas para cada tipo de produto
 * IMPORTANTE: Estes valores refletem o catálogo real do Shopify
 */
export const VALID_DIMENSIONS: Record<string, ValidDimensions> = {
  // Capelinha (1 vidro) - Linha 25
  // Horizontal: altura [30-60], largura [80-180]
  // Vertical: altura [80-180], largura [30-60]
  'capelinha': {
    alturas: [30, 40, 50, 60, 80, 100, 120, 150, 180],
    larguras: [30, 40, 50, 60, 80, 100, 120, 150, 180],
    orientacoes: ['horizontal', 'vertical']
  },
  
  // Capelinha 3 Vidros - Linha 25 (mesmas dimensões da capelinha)
  'capelinha_3v': {
    alturas: [30, 40, 50, 60, 80, 100, 120, 150, 180],
    larguras: [30, 40, 50, 60, 80, 100, 120, 150, 180],
    orientacoes: ['horizontal', 'vertical']
  },
  
  // Janela 2 Folhas - Linha Suprema
  '2f': {
    alturas: [30, 40, 50, 60],
    larguras: [80, 100, 120, 150, 180]
  },
  
  // Janela 2 Folhas com Grade - Linha Suprema
  '2f_grade': {
    alturas: [30, 40, 50, 60],
    larguras: [80, 100, 120, 150, 180]
  },
  
  // Janela 3 Folhas - Linha Suprema
  // NOTA: SÓ tem larguras 120, 150, 180 (não tem 80 e 100)
  '3f': {
    alturas: [30, 40, 50, 60],
    larguras: [120, 150, 180] // NÃO tem 80 e 100!
  },
  
  // Janela 3 Folhas com Grade - Linha Suprema
  // NOTA: SÓ tem larguras 120, 150, 180
  '3f_grade': {
    alturas: [30, 40, 50, 60],
    larguras: [120, 150, 180]
  },
  
  // Janela 3 Folhas com Tela - Linha Suprema
  '3f_tela': {
    alturas: [30, 40, 50, 60],
    larguras: [80, 100, 120, 150, 180]
  },
  
  // Janela 3 Folhas com Tela e Grade - Linha Suprema
  '3f_tela_grade': {
    alturas: [30, 40, 50, 60],
    larguras: [80, 100, 120, 150, 180]
  }
}

/**
 * Valida dimensões para um tipo específico de produto
 */
export function validateDimensionsForType(
  tipo: string,
  altura: number,
  largura: number,
  orientacao?: ProductOrientation
): { isValid: boolean; error?: string; suggestion?: string } {
  const dims = VALID_DIMENSIONS[tipo]
  if (!dims) {
    return { isValid: false, error: `Tipo de produto desconhecido: ${tipo}` }
  }
  
  // Capelinha: verificar orientação
  if ((tipo === 'capelinha' || tipo === 'capelinha_3v') && dims.orientacoes) {
    const orient = orientacao || (altura > largura ? 'vertical' : 'horizontal')
    
    if (orient === 'horizontal') {
      // Horizontal: altura até 60, largura a partir de 80
      const alturasValidas = [30, 40, 50, 60]
      const largurasValidas = [80, 100, 120, 150, 180]
      
      if (!alturasValidas.includes(altura)) {
        return {
          isValid: false,
          error: `Capelinha horizontal: altura inválida (${altura}cm).`,
          suggestion: `Alturas válidas: ${alturasValidas.join(', ')}cm. Talvez você queira a versão vertical?`
        }
      }
      if (!largurasValidas.includes(largura)) {
        return {
          isValid: false,
          error: `Capelinha horizontal: largura inválida (${largura}cm).`,
          suggestion: `Larguras válidas: ${largurasValidas.join(', ')}cm`
        }
      }
    } else {
      // Vertical: altura a partir de 80, largura até 60
      const alturasValidas = [80, 100, 120, 150, 180]
      const largurasValidas = [30, 40, 50, 60]
      
      if (!alturasValidas.includes(altura)) {
        return {
          isValid: false,
          error: `Capelinha vertical: altura inválida (${altura}cm).`,
          suggestion: `Alturas válidas: ${alturasValidas.join(', ')}cm. Talvez você queira a versão horizontal?`
        }
      }
      if (!largurasValidas.includes(largura)) {
        return {
          isValid: false,
          error: `Capelinha vertical: largura inválida (${largura}cm).`,
          suggestion: `Larguras válidas: ${largurasValidas.join(', ')}cm`
        }
      }
    }
    
    return { isValid: true }
  }
  
  // Demais tipos: verificar dimensões normais
  if (!dims.alturas.includes(altura)) {
    const closest = dims.alturas.reduce((prev, curr) => 
      Math.abs(curr - altura) < Math.abs(prev - altura) ? curr : prev
    )
    return {
      isValid: false,
      error: `Altura ${altura}cm não disponível para ${tipo}.`,
      suggestion: `Alturas disponíveis: ${dims.alturas.join(', ')}cm. Mais próxima: ${closest}cm`
    }
  }
  
  if (!dims.larguras.includes(largura)) {
    const closest = dims.larguras.reduce((prev, curr) => 
      Math.abs(curr - largura) < Math.abs(prev - largura) ? curr : prev
    )
    return {
      isValid: false,
      error: `Largura ${largura}cm não disponível para ${tipo}.`,
      suggestion: `Larguras disponíveis: ${dims.larguras.join(', ')}cm. Mais próxima: ${closest}cm`
    }
  }
  
  return { isValid: true }
}

/**
 * Auto-detecta a orientação da capelinha baseado nas dimensões
 */
export function detectCapelhinhaOrientation(altura: number, largura: number): ProductOrientation {
  return altura > largura ? 'vertical' : 'horizontal'
}

// =====================================================
// PROFUNDIDADE MÍNIMA PARA DRYWALL
// =====================================================

export const DRYWALL_DEPTH = {
  '2f': 7,      // cm mínimo
  '2f_grade': 10.5,
  '3f': 10.5,   // cm mínimo
  '3f_grade': 10.5,
  '3f_tela': 10.5,
  '3f_tela_grade': 10.5,
  'grade': 10.5, // genérico (deprecado)
  'tela': 10.5,
  'capelinha': 7,
  'capelinha_3v': 7
}

/**
 * Verifica se a profundidade do drywall é suficiente
 */
export function validateDrywallDepth(modelType: string, depth: number): {
  isValid: boolean
  minRequired: number
  message: string
} {
  const minRequired = DRYWALL_DEPTH[modelType as keyof typeof DRYWALL_DEPTH] || 7
  const isValid = depth >= minRequired
  
  return {
    isValid,
    minRequired,
    message: isValid 
      ? `Profundidade ${depth}cm é suficiente para ${modelType}.`
      : `Profundidade insuficiente. Mínimo para ${modelType}: ${minRequired}cm. Sua parede tem ${depth}cm.`
  }
}
