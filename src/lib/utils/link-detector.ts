/**
 * Detector de links externos nas mensagens
 * Identifica links do Shopify, Yampi, rastreamento, etc.
 */

export type LinkType = 
  | 'shopify_order'
  | 'shopify_store'
  | 'yampi'
  | 'melhor_envio'
  | 'correios'
  | 'tracking'
  | 'unknown'

export interface DetectedLink {
  type: LinkType
  url: string
  extractedId?: string // order_id, tracking_code, etc
  domain: string
}

// Regex para detectar URLs
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi

// Padrões de domínios conhecidos
const DOMAIN_PATTERNS: { pattern: RegExp; type: LinkType; idExtractor?: (url: string) => string | undefined }[] = [
  // Shopify Orders
  {
    pattern: /shopify\.com\/.*\/orders\//i,
    type: 'shopify_order',
    idExtractor: (url) => {
      const match = url.match(/orders\/(\d+)/i)
      return match?.[1]
    }
  },
  // Shopify Store
  {
    pattern: /\.myshopify\.com/i,
    type: 'shopify_store'
  },
  // Shopify Checkout
  {
    pattern: /shopify\.com\/.*\/checkouts\//i,
    type: 'shopify_order',
    idExtractor: (url) => {
      const match = url.match(/checkouts\/([a-z0-9]+)/i)
      return match?.[1]
    }
  },
  // Yampi
  {
    pattern: /yampi\.com\.br/i,
    type: 'yampi',
    idExtractor: (url) => {
      const match = url.match(/pedido[s]?\/(\d+)/i)
      return match?.[1]
    }
  },
  // Melhor Envio
  {
    pattern: /melhorenvio\.com\.br/i,
    type: 'melhor_envio',
    idExtractor: (url) => {
      const match = url.match(/([A-Z]{2}\d{9}[A-Z]{2})/i)
      return match?.[1]
    }
  },
  // Correios
  {
    pattern: /correios\.com\.br/i,
    type: 'correios',
    idExtractor: (url) => {
      const match = url.match(/([A-Z]{2}\d{9}[A-Z]{2})/i)
      return match?.[1]
    }
  },
  // Link de rastreio genérico
  {
    pattern: /rastreamento|tracking|rastreio|rastrei/i,
    type: 'tracking',
    idExtractor: (url) => {
      const match = url.match(/([A-Z]{2}\d{9}[A-Z]{2})/i)
      return match?.[1]
    }
  }
]

/**
 * Detecta links em uma mensagem de texto
 */
export function detectLinks(content: string): DetectedLink[] {
  if (!content) return []
  
  const urls = content.match(URL_REGEX) || []
  const detectedLinks: DetectedLink[] = []
  
  for (const url of urls) {
    let linkType: LinkType = 'unknown'
    let extractedId: string | undefined
    
    // Verificar contra padrões conhecidos
    for (const { pattern, type, idExtractor } of DOMAIN_PATTERNS) {
      if (pattern.test(url)) {
        linkType = type
        if (idExtractor) {
          extractedId = idExtractor(url)
        }
        break
      }
    }
    
    // Extrair domínio
    let domain = 'unknown'
    try {
      domain = new URL(url).hostname
    } catch {
      // URL inválida, usar regex simples
      const domainMatch = url.match(/https?:\/\/([^\/]+)/i)
      domain = domainMatch?.[1] || 'unknown'
    }
    
    detectedLinks.push({
      type: linkType,
      url,
      extractedId,
      domain
    })
  }
  
  return detectedLinks
}

/**
 * Detecta código de rastreio em texto (mesmo sem link)
 */
export function detectTrackingCode(content: string): string | null {
  if (!content) return null
  
  // Padrão de código de rastreio dos Correios/transportadoras
  // Formato: 2 letras + 9 números + 2 letras (ex: BR123456789BR)
  const trackingPattern = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/i
  const match = content.match(trackingPattern)
  
  return match?.[1]?.toUpperCase() || null
}

/**
 * Verifica se a mensagem contém algum link relevante
 */
export function hasRelevantLinks(content: string): boolean {
  const links = detectLinks(content)
  return links.some(link => link.type !== 'unknown')
}

/**
 * Gera contexto adicional para a IA baseado nos links detectados
 */
export function generateLinkContext(content: string): string {
  const links = detectLinks(content)
  const trackingCode = detectTrackingCode(content)
  
  const contexts: string[] = []
  
  for (const link of links) {
    switch (link.type) {
      case 'shopify_order':
        contexts.push(`[Link de pedido Shopify detectado${link.extractedId ? `: #${link.extractedId}` : ''}]`)
        break
      case 'yampi':
        contexts.push(`[Link Yampi detectado${link.extractedId ? `: pedido #${link.extractedId}` : ''}]`)
        break
      case 'melhor_envio':
      case 'correios':
      case 'tracking':
        contexts.push(`[Link de rastreamento detectado${link.extractedId ? `: ${link.extractedId}` : ''}]`)
        break
    }
  }
  
  if (trackingCode && !contexts.some(c => c.includes(trackingCode))) {
    contexts.push(`[Código de rastreio detectado: ${trackingCode}]`)
  }
  
  return contexts.join(' ')
}
