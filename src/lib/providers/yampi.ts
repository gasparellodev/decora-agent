/**
 * Yampi API Client
 *
 * Usado para criar links de pagamento personalizados quando o cliente
 * confirma a compra e escolhe a forma de pagamento.
 *
 * Docs: https://docs.yampi.com.br/api-reference
 */

const YAMPI_BASE_URL = 'https://api.dooki.com.br/v2'
const YAMPI_ALIAS = process.env.YAMPI_ALIAS || 'decora-esquadrias'
const YAMPI_TOKEN = process.env.YAMPI_TOKEN || ''
const YAMPI_SECRET_KEY = process.env.YAMPI_SECRET_KEY || ''

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'User-Token': YAMPI_TOKEN,
    'User-Secret-Key': YAMPI_SECRET_KEY,
  }
}

function apiUrl(path: string): string {
  return `${YAMPI_BASE_URL}/${YAMPI_ALIAS}${path}`
}

// ============================================================
// Tipos
// ============================================================

interface YampiSku {
  id: number
  product_id: number
  sku: string
  title: string
  price_sale: number
  price_discount: number
  purchase_url: string
  total_in_stock: number
  variations: Array<{ name: string; value: string }>
}

interface YampiProduct {
  id: number
  name: string
  active: boolean
  skus: { data: YampiSku[] }
}

interface YampiCustomer {
  id: number
  name: string
  email: string
}

interface YampiPaymentLink {
  id: number
  link_url: string
  whatsapp?: { message: string; link: string }
}

export interface FindSkuResult {
  skuId: number
  productId: number
  productName: string
  skuCode: string
  price: number
  purchaseUrl: string
}

export interface PaymentLinkResult {
  success: boolean
  linkUrl?: string
  whatsappLink?: string
  error?: string
}

// ============================================================
// Mapeamento model do agente → busca na Yampi
// ============================================================

const MODEL_SEARCH_MAP: Record<string, string> = {
  '2f': 'Correr Duas Folhas',
  '2f_grade': 'Correr Duas Folhas Grade',
  '3f': 'Correr Três Folhas',
  '3f_grade': 'Correr Três Folhas Grade',
  '3f_tela': 'Correr Três Folhas Tela',
  '3f_tela_grade': 'Correr Três Folhas Tela Grade',
  'capelinha': 'Pivotante',
  'capelinha_3v': 'Pivotante 3 Vidros',
  'arremate': 'Kit Arremate',
}

const COLOR_MAP: Record<string, string> = {
  'branco': 'Branca',
  'preto': 'Preta',
}

const GLASS_SKU_MAP: Record<string, string> = {
  'incolor': 'incolor',
  'mini_boreal': 'mini',
  'fume': 'fume',
}

// ============================================================
// Funções de API
// ============================================================

/**
 * Busca produto e SKU específico na Yampi.
 * Monta query a partir do modelo + cor e filtra SKU por vidro + medidas.
 */
export async function findProductSku(params: {
  model: string
  color?: string
  glass_type?: string
  width?: number
  height?: number
}): Promise<FindSkuResult | null> {
  const { model, color, glass_type, width, height } = params

  const modelSearch = MODEL_SEARCH_MAP[model]
  if (!modelSearch) {
    console.error('[Yampi] Modelo não mapeado:', model)
    return null
  }

  const colorSearch = COLOR_MAP[color || 'branco'] || 'Branca'
  const isArremate = model === 'arremate'
  const isPivotante = model === 'capelinha' || model === 'capelinha_3v'
  // Não incluir cor na busca — Yampi retorna 0 resultados com cor no query
  // Buscar só pelo modelo e filtrar por cor no nome do produto depois
  const searchQuery = isArremate || isPivotante ? modelSearch : `Janela de ${modelSearch}`

  console.log('[Yampi] Buscando produto:', searchQuery)

  try {
    const res = await fetch(apiUrl(`/catalog/products?include=skus&q=${encodeURIComponent(searchQuery)}&limit=10`), {
      headers: getHeaders(),
    })

    if (!res.ok) {
      console.error('[Yampi] Erro buscando produto:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const products: YampiProduct[] = data.data || []

    if (products.length === 0) {
      console.log('[Yampi] Nenhum produto encontrado para:', searchQuery)
      return null
    }

    // Filtrar por cor no nome do produto (ex: "Branca", "Preta")
    // Se tem grade no modelo, filtrar também por "Grade" no nome
    const hasGrade = model.includes('grade')
    const hasTela = model.includes('tela')
    let product = products.find(p => {
      const nameLower = p.name.toLowerCase()
      const colorMatch = nameLower.includes(colorSearch.toLowerCase())
      const gradeMatch = hasGrade ? nameLower.includes('grade') : !nameLower.includes('grade')
      const telaMatch = hasTela ? nameLower.includes('tela') : !nameLower.includes('tela')
      return p.active && colorMatch && gradeMatch && telaMatch
    })

    // Fallback: só cor
    if (!product) {
      product = products.find(p => p.active && p.name.toLowerCase().includes(colorSearch.toLowerCase()))
    }

    // Fallback: primeiro ativo
    if (!product) {
      product = products.find(p => p.active) || products[0]
      console.log('[Yampi] Usando produto fallback (sem match de cor):', product.name)
    }
    const skus = product.skus?.data || []

    if (skus.length === 0) {
      console.log('[Yampi] Produto sem SKUs:', product.name)
      return null
    }

    // Filtrar SKU por vidro + medidas
    let matchedSku: YampiSku | undefined

    if (width && height && glass_type) {
      const glassKey = GLASS_SKU_MAP[glass_type] || 'incolor'
      matchedSku = skus.find(s => {
        const skuLower = s.sku.toLowerCase()
        return skuLower.includes(glassKey) &&
          skuLower.includes(`${height}x${width}`)
      })
    }

    // Fallback: só por medidas
    if (!matchedSku && width && height) {
      matchedSku = skus.find(s => s.sku.includes(`${height}x${width}`))
    }

    // Fallback: primeiro SKU
    if (!matchedSku) {
      matchedSku = skus[0]
      console.log('[Yampi] Usando primeiro SKU como fallback:', matchedSku.sku)
    }

    console.log('[Yampi] SKU encontrado:', matchedSku.id, matchedSku.sku, 'R$', matchedSku.price_sale)

    return {
      skuId: matchedSku.id,
      productId: product.id,
      productName: product.name,
      skuCode: matchedSku.sku,
      price: matchedSku.price_sale,
      purchaseUrl: matchedSku.purchase_url,
    }
  } catch (err) {
    console.error('[Yampi] Erro na busca:', err)
    return null
  }
}

/**
 * Busca cliente na Yampi por telefone. Se não existe, cria.
 */
export async function findOrCreateCustomer(params: {
  name: string
  phone: string
  email?: string
}): Promise<{ customerId: number } | null> {
  const { name, phone, email } = params

  try {
    // Buscar por telefone
    const searchRes = await fetch(apiUrl(`/customers?q=${encodeURIComponent(phone)}&limit=1`), {
      headers: getHeaders(),
    })

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const customers: YampiCustomer[] = searchData.data || []
      if (customers.length > 0) {
        console.log('[Yampi] Cliente existente:', customers[0].id, customers[0].name)
        return { customerId: customers[0].id }
      }
    }

    // Criar novo cliente
    const cleanPhone = phone.replace(/\D/g, '')
    const customerEmail = email || `${cleanPhone}@cliente.decoraesquadrias.com.br`
    const fullName = name.includes(' ') ? name : `${name} (WhatsApp)`
    const createRes = await fetch(apiUrl('/customers'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        active: true,
        type: 'f',
        name: fullName,
        email: customerEmail,
        homephone: phone,
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error('[Yampi] Erro criando cliente:', createRes.status, errText)
      return null
    }

    const createData = await createRes.json()
    const newCustomer = createData.data
    console.log('[Yampi] Cliente criado:', newCustomer.id, name)
    return { customerId: newCustomer.id }
  } catch (err) {
    console.error('[Yampi] Erro cliente:', err)
    return null
  }
}

/**
 * Cria link de pagamento na Yampi.
 */
export async function createPaymentLink(params: {
  name: string
  skus: Array<{ id: number; quantity: number }>
  customerId?: number
}): Promise<PaymentLinkResult> {
  const { name, skus, customerId } = params

  console.log('[Yampi] Criando payment link:', { name, skus, customerId })

  try {
    const body: Record<string, unknown> = {
      name: name.slice(0, 100), // max 100 chars
      active: true,
      skus,
    }

    if (customerId) {
      body.customer_id = customerId
    }

    const res = await fetch(apiUrl('/checkout/payment-link'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Yampi] Erro criando payment link:', res.status, errText)
      return { success: false, error: `Erro ao criar link: ${res.status}` }
    }

    const data = await res.json()
    const link: YampiPaymentLink = data.data

    console.log('[Yampi] Payment link criado:', link.id, link.link_url)

    return {
      success: true,
      linkUrl: link.link_url,
      whatsappLink: link.whatsapp?.link,
    }
  } catch (err) {
    console.error('[Yampi] Erro payment link:', err)
    return { success: false, error: 'Erro de conexão com Yampi' }
  }
}
