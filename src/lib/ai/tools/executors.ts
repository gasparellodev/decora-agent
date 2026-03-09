import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CheckOrderResult,
  EscalateResult,
  CalculateShippingResult,
  ProductInfoResult,
  CreatePaymentLinkResult,
} from './index'
import {
  getValidDimensions,
  findPriceTable,
  formatProductName,
  type ProductType,
  type ProductColor,
} from '@/lib/data/shopify-prices'

function getSupabase() { return createAdminClient() }

export async function executeCheckOrderStatus(
  input: { order_number?: string; phone?: string },
  leadId: string
): Promise<CheckOrderResult> {
  try {
    // Consultar tabela orders do sistema de producao (nao dc_orders)
    let query = getSupabase()
      .from('orders')
      .select('id, customer_name, model, color, glass_type, height_cm, width_cm, production_status, is_finished, codigo_rastreio, bling_order_number, created_at, updated_at')

    if (input.order_number) {
      const orderNum = input.order_number.replace('#', '').trim()
      query = query.eq('bling_order_number', orderNum)
    } else if (input.phone) {
      query = query.eq('customer_phone', input.phone.replace(/\D/g, ''))
    } else {
      query = query.eq('lead_id', leadId)
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false }).limit(5)

    if (error) throw error

    if (!orders || orders.length === 0) {
      return {
        found: false,
        message: 'Nao encontrei pedidos para este cliente. Verifique o numero do pedido ou confirme o telefone.'
      }
    }

    const statusMap: Record<string, string> = {
      'pendente': 'Aguardando pagamento',
      'pago': 'Pagamento confirmado',
      'cancelado': 'Cancelado',
      'cadastrado': 'Cadastrado no sistema',
      'em_producao': 'Em producao',
      'pronto': 'Pronto para envio',
      'enviado': 'Enviado',
      'entregue': 'Entregue'
    }

    return {
      found: true,
      orders: orders.map(o => ({
        order_number: o.bling_order_number || 'N/A',
        status: o.is_finished ? 'Finalizado' : (statusMap[o.production_status] || o.production_status || 'Em processamento'),
        production_status: statusMap[o.production_status] || o.production_status || 'Pendente',
        tracking_code: o.codigo_rastreio || undefined,
        created_at: o.created_at
      })),
      message: `Encontrei ${orders.length} pedido(s). Modelo: ${orders[0].model} ${orders[0].color} ${orders[0].width_cm}x${orders[0].height_cm}cm. Ultima atualizacao: ${new Date(orders[0].updated_at).toLocaleDateString('pt-BR')}.`
    }
  } catch (error) {
    console.error('Error checking order status:', error)
    return {
      found: false,
      message: 'Erro ao consultar pedidos. Tente novamente.'
    }
  }
}

export async function executeEscalateToHuman(
  input: { reason: string; priority?: string; summary?: string },
  conversationId: string,
  leadId: string
): Promise<EscalateResult> {
  try {
    // Atualizar status da conversa para waiting_human
    const { error } = await getSupabase()
      .from('dc_conversations')
      .update({
        status: 'waiting_human',
        context_json: {
          escalation_reason: input.reason,
          escalation_priority: input.priority || 'medium',
          escalation_summary: input.summary,
          escalated_at: new Date().toISOString()
        }
      })
      .eq('id', conversationId)

    if (error) throw error

    // Registrar métrica de escalação
    const today = new Date().toISOString().split('T')[0]
    try {
      await getSupabase().rpc('increment_metric', {
        metric_date: today,
        metric_name: 'total_escalations'
      })
    } catch {
      // Ignora se a função não existir
    }

    return {
      success: true,
      message: 'Conversa transferida para atendimento humano.'
    }
  } catch (error) {
    console.error('Error escalating to human:', error)
    return {
      success: false,
      message: 'Erro ao transferir. Um atendente será notificado.'
    }
  }
}


export async function executeCalculateShipping(
  input: { 
    cep: string
    width?: number
    height?: number
    quantity?: number
    source?: 'whatsapp' | 'mercadolivre' | 'shopify'
    window_type?: 'capelinha' | 'capelinha_3v' | '2f' | '2f_grade' | '3f' | '3f_tela' | '3f_grade' | '3f_tela_grade'
  }
): Promise<CalculateShippingResult> {
  const { calculateWindowFreight } = await import('@/lib/providers/melhor-envio')
  
  const cep = input.cep.replace(/\D/g, '')
  const width = input.width || 100  // Default 100cm
  const height = input.height || 50 // Default 50cm
  const quantity = input.quantity || 1
  const source = input.source || 'whatsapp'
  const windowType = input.window_type || '2f'

  console.log('[ExecuteCalculateShipping] Calculando frete:', { cep, width, height, quantity, source, windowType })

  // Usar Melhor Envio real com tipo de janela
  const freight = await calculateWindowFreight(cep, width, height, quantity, windowType)

  if (freight.error) {
    console.error('[ExecuteCalculateShipping] Erro:', freight.error)
    return {
      cep,
      is_sp: freight.isSP,
      delivery_type: 'error',
      estimated_days: 0,
      shipping_cost: 0,
      message: `Não foi possível calcular o frete: ${freight.error}`
    }
  }

  // ===== REGRAS DE FRETE =====
  // SP (CEP 0*): R$55 fixo no ML, grátis no Shopify
  // Fora de SP (CEP não 0*): Melhor Envio + R$20 + 4 dias (já calculado em calculateWindowFreight)

  if (freight.isSP) {
    // Grátis para WhatsApp e Shopify, R$55 apenas Mercado Livre
    const finalCost = source === 'mercadolivre' ? freight.value : 0

    // Entregas SP: terça e quinta
    // Pedido seg-qua → próxima terça | Pedido qui-dom → próxima quinta
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
    const nextDelivery = new Date(today)

    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
      // Seg, Ter, Qua → próxima Terça
      const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7
      nextDelivery.setDate(today.getDate() + daysUntilTuesday)
    } else {
      // Qui, Sex, Sab, Dom → próxima Quinta
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
      nextDelivery.setDate(today.getDate() + daysUntilThursday)
    }

    console.log('[ExecuteCalculateShipping] SP - Valor final:', finalCost, '| Próxima entrega:', nextDelivery.toISOString().split('T')[0])

    return {
      cep,
      is_sp: true,
      delivery_type: 'sp_delivery',
      estimated_days: freight.estimatedDays,
      shipping_cost: finalCost,
      next_delivery_date: nextDelivery.toISOString(),
      carrier: freight.carrier,
      is_free: finalCost === 0,
      message: ''
    }
  }

  const unitPrice = (freight as { unitPrice?: number }).unitPrice
  const freightQty = (freight as { quantity?: number }).quantity || quantity
  
  console.log('[ExecuteCalculateShipping] Fora de SP - Valor total:', freight.value, '| Unitário:', unitPrice, '| Qtd:', freightQty, '| Prazo:', freight.estimatedDays)

  return {
    cep,
    is_sp: false,
    delivery_type: 'carrier',
    estimated_days: freight.estimatedDays,
    shipping_cost: freight.value,
    carrier: freight.carrier,
    message: '',
    unit_price: unitPrice,
    quantity: freightQty
  }
}

export async function executeGetProductInfo(
  input: {
    model: string
    width?: number
    height?: number
    glass_type?: string
    color?: string
    orientation?: 'horizontal' | 'vertical'
    quantity?: number
    channel?: 'whatsapp' | 'mercadolivre' | 'shopify'
    payment_method?: 'cartao' | 'boleto' | 'pix'
  }
): Promise<ProductInfoResult> {
  const {
    getProductPrice,
    isKitArremate,
    canSellOnChannel,
  } = await import('@/lib/services/product-price.service')

  const tipo = input.model as ProductType
  const cor = (input.color || 'branco') as ProductColor
  const quantidade = input.quantity || 1
  const canal = (input.channel || 'whatsapp') as 'whatsapp' | 'mercadolivre' | 'shopify'
  const pagamento = input.payment_method as 'cartao' | 'boleto' | 'pix' | undefined

  // ========================================
  // Kit Arremate - Tratamento especial
  // ========================================
  if (isKitArremate(tipo)) {
    if (!canSellOnChannel(tipo, canal)) {
      return {
        available: false,
        model: 'Kit Arremate',
        message: 'O Kit Arremate não está disponível no Mercado Livre. É vendido apenas pelo WhatsApp e na loja Shopify.'
      }
    }

    const result = getProductPrice({
      tipo,
      cor,
      altura: 0,
      largura: 0,
      quantidade: 1,
      canal
    })

    return {
      available: true,
      model: result.produto || 'Kit Arremate',
      color: cor,
      price: result.preco,
      originalPrice: 180,
      link: result.link,
      message: ''
    }
  }

  // ========================================
  // Se não tem medidas → retornar dimensões disponíveis + faixa de preço
  // ========================================
  if (!input.width || !input.height) {
    const nomeProduto = formatProductName(tipo, cor, input.orientation)

    // Tentar obter dimensões disponíveis para ambas as cores
    const dimensionsBranco = getValidDimensions(tipo, 'branco', input.orientation)
    const dimensionsPreto = getValidDimensions(tipo, 'preto', input.orientation)
    const dimensions = cor === 'preto' ? dimensionsPreto : dimensionsBranco

    if (!dimensions) {
      return {
        available: false,
        model: nomeProduto,
        message: `Modelo "${nomeProduto}" não encontrado no catálogo.`
      }
    }

    // Calcular faixa de preço
    const table = findPriceTable(tipo, cor, input.orientation)
    let priceMin = Infinity
    let priceMax = 0
    if (table) {
      for (const v of table.variantes) {
        if (v.preco < priceMin) priceMin = v.preco
        if (v.preco > priceMax) priceMax = v.preco
      }
    }

    return {
      available: true,
      model: nomeProduto,
      color: cor,
      availableSizes: dimensions,
      priceRange: table ? { min: priceMin, max: priceMax } : undefined,
      message: `${nomeProduto}: Alturas disponíveis: ${dimensions.alturas.join(', ')}cm. Larguras disponíveis: ${dimensions.larguras.join(', ')}cm.${table ? ` Preços de R$${priceMin} a R$${priceMax}.` : ''}`
    }
  }

  // ========================================
  // COM medidas → buscar preço exato do catálogo Shopify
  // ========================================
  const result = getProductPrice({
    tipo,
    cor,
    altura: input.height,
    largura: input.width,
    vidro: input.glass_type as 'incolor' | 'mini_boreal' | 'fume' | undefined,
    orientacao: input.orientation,
    quantidade,
    canal,
    pagamento
  })

  if (!result.found) {
    // Medida não encontrada - retornar medidas disponíveis para ajudar
    const dimensions = getValidDimensions(tipo, cor, input.orientation)
    return {
      available: false,
      model: result.produto || formatProductName(tipo, cor, input.orientation),
      dimensions: { width: input.width, height: input.height },
      availableSizes: dimensions || undefined,
      message: result.erro || `Medida ${input.width}x${input.height}cm não disponível.${dimensions ? ` Alturas: ${dimensions.alturas.join(', ')}cm. Larguras: ${dimensions.larguras.join(', ')}cm.` : ''}`
    }
  }

  const precoFinal = result.precoComDesconto || result.precoTotal || result.preco || 0

  const alerts: string[] = []
  if (tipo === 'capelinha' || tipo === 'capelinha_3v') {
    alerts.push('Pode respingar em chuva muito forte.')
  }
  if (tipo.includes('grade')) {
    alerts.push('Grade embutida, adiciona +1,5cm na profundidade.')
  }
  if (result.avisos && result.avisos.length > 0) {
    alerts.push(...result.avisos)
  }

  return {
    available: true,
    model: result.produto || formatProductName(tipo, cor, input.orientation),
    dimensions: { width: input.width, height: input.height },
    glass: input.glass_type || undefined,
    color: cor,
    quantity: quantidade,
    price: result.preco || 0,
    priceTotal: result.precoTotal || precoFinal,
    priceFinal: precoFinal,
    discount: result.desconto ? {
      quantityPercent: result.desconto.percentualQuantidade || 0,
      pixPercent: result.desconto.percentualPix || 0,
      totalValue: result.desconto.valorTotal || 0
    } : undefined,
    link: result.link,
    alerts,
    message: ''
  }
}

export async function executeCreatePaymentLink(
  input: {
    product_name: string
    model: string
    color?: string
    width?: number
    height?: number
    glass_type?: string
    quantity: number
    customer_name: string
    customer_phone: string
    include_kit_acabamento?: boolean
  }
): Promise<CreatePaymentLinkResult> {
  const { findProductSku, findOrCreateCustomer, createPaymentLink } = await import('@/lib/providers/yampi')

  try {
    // 1. Buscar SKU do produto na Yampi
    const sku = await findProductSku({
      model: input.model,
      color: input.color,
      glass_type: input.glass_type,
      width: input.width,
      height: input.height,
    })

    if (!sku) {
      return {
        success: false,
        message: 'Produto não encontrado na Yampi. Verifique modelo e medidas.',
      }
    }

    // 2. Buscar/criar cliente
    const customer = await findOrCreateCustomer({
      name: input.customer_name,
      phone: input.customer_phone,
    })

    // 3. Montar SKUs array (produto + kit acabamento se solicitado)
    const skus: Array<{ id: number; quantity: number }> = [
      { id: sku.skuId, quantity: input.quantity },
    ]

    if (input.include_kit_acabamento) {
      const kitSku = await findProductSku({ model: 'arremate' })
      if (kitSku) {
        skus.push({ id: kitSku.skuId, quantity: 1 })
      }
    }

    // 4. Criar payment link
    const linkName = `${input.product_name} - ${input.customer_name}`
    const result = await createPaymentLink({
      name: linkName,
      skus,
      customerId: customer?.customerId,
    })

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Erro ao criar link de pagamento.',
      }
    }

    return {
      success: true,
      payment_url: result.linkUrl,
      whatsapp_url: result.whatsappLink,
      message: 'Link de pagamento criado com sucesso.',
    }
  } catch (err) {
    console.error('[CreatePaymentLink] Erro:', err)
    return {
      success: false,
      message: 'Erro ao criar link de pagamento. Tente novamente.',
    }
  }
}

