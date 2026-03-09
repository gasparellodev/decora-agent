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
  | 'decora_product'
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
  },
  // Decora Esquadrias - página de produto
  {
    pattern: /decoraesquadrias\.com\.br\/products\//i,
    type: 'decora_product',
    idExtractor: (url) => {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/')
        const productsIdx = pathParts.indexOf('products')
        return productsIdx >= 0 ? pathParts[productsIdx + 1] : undefined
      } catch {
        const match = url.match(/\/products\/([^/?#]+)/i)
        return match?.[1]
      }
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

export interface DecorProductInfo {
  handle: string
  productName?: string
  height?: number
  width?: number
  glassType?: string
  color?: string
  orientation?: 'horizontal' | 'vertical'
  variant?: string
  sourceUrl: string
}

/**
 * Extrai informações do produto a partir de uma URL decoraesquadrias.com.br/products/...
 * Query params comuns: variant, Altura, Largura, Vidro
 */
export function parseDecorProductUrl(url: string): DecorProductInfo | null {
  try {
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('decoraesquadrias.com.br')) return null

    const pathParts = urlObj.pathname.split('/')
    const productsIdx = pathParts.indexOf('products')
    if (productsIdx < 0 || !pathParts[productsIdx + 1]) return null

    const handle = pathParts[productsIdx + 1]
    const params = urlObj.searchParams

    const heightStr = params.get('Altura') || params.get('altura')
    const widthStr = params.get('Largura') || params.get('largura')
    const glassType = params.get('Vidro') || params.get('vidro') || params.get('glass_type')
    const color = params.get('Cor') || params.get('cor')
    const variant = params.get('variant') || undefined

    const height = heightStr ? parseInt(heightStr, 10) : undefined
    const width = widthStr ? parseInt(widthStr, 10) : undefined

    const productName = handleToProductName(handle)
    const detectedColor = color || (handle.includes('preto') ? 'preto' : handle.includes('branco') ? 'branco' : undefined)

    return {
      handle,
      productName,
      height: height && !isNaN(height) ? height : undefined,
      width: width && !isNaN(width) ? width : undefined,
      glassType: glassType || undefined,
      color: detectedColor,
      orientation: height && width ? (height > width ? 'vertical' : 'horizontal') : undefined,
      variant,
      sourceUrl: url
    }
  } catch {
    return null
  }
}

function handleToProductName(handle: string): string {
  const mapping: Record<string, string> = {
    'janela-de-correr-duas-folhas-moveis': 'Janela 2 Folhas',
    'janela-de-correr-tres-folhas': 'Janela 3 Folhas',
    'janela-de-correr-2-folhas-com-grade': 'Janela 2 Folhas com Grade',
    'janela-de-correr-3-folhas-com-grade': 'Janela 3 Folhas com Grade',
    'janela-de-correr-3-folhas-com-tela': 'Janela 3 Folhas com Tela',
    'janela-de-correr-3-folhas-com-tela-e-grade': 'Janela 3 Folhas com Tela e Grade',
    'capelinha': 'Capelinha',
    'capelinha-3-vidros': 'Capelinha 3 Vidros',
    'kit-arremate': 'Kit Arremate'
  }

  for (const [key, name] of Object.entries(mapping)) {
    if (handle.includes(key)) return name
  }

  return handle
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Detecta o primeiro link de produto Decora em uma mensagem
 */
export function findDecorProductLink(content: string): DecorProductInfo | null {
  if (!content) return null
  const links = detectLinks(content)
  const decorLink = links.find(l => l.type === 'decora_product')
  if (!decorLink) return null
  return parseDecorProductUrl(decorLink.url)
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
