import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CheckOrderResult,
  EscalateResult,
  ScheduleFollowUpResult,
  CalculateShippingResult,
  ProductInfoResult,
  UpdateLeadResult,
  ValidateMeasurementResult,
  RecommendProductResult
} from './index'
import {
  validateMeasurement,
  validateDrywallDepth,
  INSTALLATION_CLEARANCE,
  STANDARD_HEIGHTS,
  STANDARD_WIDTHS,
  RECOMMENDED_SIZES,
  LIMITS
} from '../knowledge/measurements'
import {
  MODELS,
  GLASSES,
  getRecommendedModelForEnvironment,
  getRecommendedGlassForEnvironment
} from '../knowledge/products'

function getSupabase() { return createAdminClient() }

export async function executeCheckOrderStatus(
  input: { order_number?: string; phone?: string },
  leadId: string
): Promise<CheckOrderResult> {
  try {
    let query = getSupabase().from('dc_orders').select('*')

    if (input.order_number) {
      const orderNum = input.order_number.replace('#', '').trim()
      query = query.eq('order_number', orderNum)
    } else if (input.phone) {
      // Buscar lead pelo telefone e depois os pedidos
      const { data: lead } = await getSupabase()
        .from('dc_leads')
        .select('id')
        .eq('phone', input.phone.replace(/\D/g, ''))
        .single()

      if (lead) {
        query = query.eq('lead_id', lead.id)
      }
    } else {
      // Usar o lead_id atual
      query = query.eq('lead_id', leadId)
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false }).limit(5)

    if (error) throw error

    if (!orders || orders.length === 0) {
      return {
        found: false,
        message: 'Não encontrei pedidos para este cliente.'
      }
    }

    const statusMap: Record<string, string> = {
      'pendente': 'Aguardando pagamento',
      'pago': 'Pagamento confirmado',
      'cancelado': 'Cancelado',
      'cadastrado': 'Cadastrado no sistema',
      'em_producao': 'Em produção 🏭',
      'pronto': 'Pronto para envio ✅',
      'enviado': 'Enviado 📦',
      'entregue': 'Entregue ✅'
    }

    return {
      found: true,
      orders: orders.map(o => ({
        order_number: o.order_number || o.external_id || 'N/A',
        status: statusMap[o.status] || o.status,
        production_status: statusMap[o.production_status] || o.production_status,
        tracking_code: o.tracking_code || undefined,
        created_at: o.created_at
      })),
      message: `Encontrei ${orders.length} pedido(s) para este cliente.`
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

export async function executeScheduleFollowUp(
  input: { type: string; days_from_now: number; message?: string },
  leadId: string,
  orderId?: string
): Promise<ScheduleFollowUpResult> {
  try {
    const scheduledFor = new Date()
    scheduledFor.setDate(scheduledFor.getDate() + input.days_from_now)
    scheduledFor.setHours(10, 0, 0, 0) // Agendar para 10h

    const { error } = await getSupabase().from('dc_follow_ups').insert({
      lead_id: leadId,
      order_id: orderId || null,
      type: input.type as 'post_delivery' | 'installation' | 'reactivation' | 'review' | 'custom',
      scheduled_for: scheduledFor.toISOString(),
      message_template: input.message || null,
      status: 'pending'
    })

    if (error) throw error

    return {
      success: true,
      scheduled_for: scheduledFor.toISOString(),
      message: `Follow-up agendado para ${scheduledFor.toLocaleDateString('pt-BR')}.`
    }
  } catch (error) {
    console.error('Error scheduling follow-up:', error)
    return {
      success: false,
      scheduled_for: '',
      message: 'Erro ao agendar follow-up.'
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
    // Regra SP: R$55 fixo no ML/WPP, grátis no Shopify
    const finalCost = source === 'shopify' ? 0 : freight.value

    // Cálculo de próxima quinta-feira
    const today = new Date()
    const dayOfWeek = today.getDay()
    const nextThursday = new Date(today)
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7
    if (dayOfWeek <= 1) {
      nextThursday.setDate(today.getDate() + daysUntilThursday)
    } else {
      nextThursday.setDate(today.getDate() + daysUntilThursday + 7)
    }

    const freteMsg = source === 'shopify' 
      ? 'Frete GRÁTIS' 
      : `Frete: R$ ${finalCost.toFixed(2).replace('.', ',')}`

    console.log('[ExecuteCalculateShipping] SP - Valor final:', finalCost)

    return {
      cep,
      is_sp: true,
      delivery_type: 'sp_delivery',
      estimated_days: freight.estimatedDays,
      shipping_cost: finalCost,
      next_delivery_date: nextThursday.toISOString(),
      carrier: freight.carrier,
      message: `Entrega em SP! Próxima data: ${nextThursday.toLocaleDateString('pt-BR')} (quinta). ${freteMsg}.`
    }
  }

  // ===== FORA DE SP (CEP não começa com 0) =====
  // O valor já vem com +R$20 e prazo já vem com +4 dias (calculado em calculateWindowFreight)
  const unitPrice = (freight as { unitPrice?: number }).unitPrice
  const freightQty = (freight as { quantity?: number }).quantity || quantity
  
  console.log('[ExecuteCalculateShipping] Fora de SP - Valor total:', freight.value, '| Unitário:', unitPrice, '| Qtd:', freightQty, '| Prazo:', freight.estimatedDays)

  // Montar mensagem com detalhes de quantidade se > 1
  let message = `Frete para ${cep.replace(/(\d{5})(\d{3})/, '$1-$2')}: R$ ${freight.value.toFixed(2).replace('.', ',')} via ${freight.carrier}. Prazo: ${freight.estimatedDays} dias úteis.`
  
  if (freightQty > 1 && unitPrice) {
    message = `Frete para ${cep.replace(/(\d{5})(\d{3})/, '$1-$2')}: R$ ${freight.value.toFixed(2).replace('.', ',')} (${freightQty}x R$ ${unitPrice.toFixed(2).replace('.', ',')}) via ${freight.carrier}. Prazo: ${freight.estimatedDays} dias úteis.`
  }

  return {
    cep,
    is_sp: false,
    delivery_type: 'carrier',
    estimated_days: freight.estimatedDays,
    shipping_cost: freight.value,
    carrier: freight.carrier,
    message,
    // Informações adicionais
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
  // Importar serviço de preços
  const { 
    getProductPrice, 
    isKitArremate, 
    canSellOnChannel,
    formatProductName
  } = await import('@/lib/services/product-price.service')
  
  type ProductType = '2f' | '2f_grade' | '3f' | '3f_grade' | '3f_tela' | '3f_tela_grade' | 'capelinha' | 'capelinha_3v' | 'arremate'
  type ProductColor = 'branco' | 'preto'
  type SalesChannel = 'whatsapp' | 'mercadolivre' | 'shopify'
  type PaymentMethod = 'cartao' | 'boleto' | 'pix'
  
  const tipo = input.model as ProductType
  const cor = (input.color || 'branco') as ProductColor
  const quantidade = input.quantity || 1
  const canal = (input.channel || 'whatsapp') as SalesChannel
  const pagamento = input.payment_method as PaymentMethod | undefined
  
  // Usar dados do knowledge base para informações do modelo
  const modelSpec = MODELS[input.model]
  
  // Nomes dos vidros (para exibição)
  const glassNames: Record<string, string> = {
    'comum': 'Vidro Comum',
    'incolor': 'Vidro Incolor',
    'temperado': 'Vidro Temperado',
    'mini_boreal': 'Vidro Mini Boreal',
    'fume': 'Vidro Fumê'
  }

  // ========================================
  // Kit Arremate - Tratamento especial
  // ========================================
  if (isKitArremate(tipo)) {
    // Verificar canal
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
    
    let message = `Kit Arremate ${cor === 'preto' ? 'Preto' : 'Branco'}: R$ 117,00 (preço especial, normal R$180). Inclui todas as peças de acabamento com corte em 45º. Um kit por pedido, independente da quantidade de janelas.`
    
    // Adicionar link se disponível
    if (result.link) {
      message += ` Link: ${result.link}`
    }
    
    return {
      available: true,
      model: result.produto || 'Kit Arremate',
      price: result.preco,
      link: result.link,
      message
    }
  }

  // ========================================
  // Grade genérico - Redirecionar
  // ========================================
  if (input.model === 'grade') {
    return {
      available: true,
      model: 'Janela com Grade',
      message: 'Temos grade embutida para janelas 2 e 3 folhas. Qual você prefere? 2 Folhas com Grade (2f_grade), 3 Folhas com Grade (3f_grade), ou 3 Folhas com Tela e Grade (3f_tela_grade)?'
    }
  }

  // ========================================
  // Se não tem medidas, pedir
  // ========================================
  if (!input.width || !input.height) {
    const nomeProduto = modelSpec?.name || formatProductName(tipo, cor)
    const descricao = modelSpec?.description || ''
    return {
      available: true,
      model: nomeProduto,
      message: `${nomeProduto}: ${descricao} Para calcular o valor, me passa as medidas (largura x altura em cm).`
    }
  }

  // ========================================
  // Buscar preço real do catálogo Shopify
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

  // Se não encontrou a variante
  if (!result.found) {
    return {
      available: false,
      model: result.produto || formatProductName(tipo, cor),
      dimensions: { width: input.width, height: input.height },
      message: result.erro || 'Medida não disponível. Verifique as dimensões válidas.'
    }
  }

  // ========================================
  // Construir mensagem de resposta
  // ========================================
  const vidroInfo = input.glass_type ? ` com ${glassNames[input.glass_type] || input.glass_type}` : ''
  const qtdInfo = quantidade > 1 ? ` (${quantidade} unidades)` : ''
  
  // Alertas específicos do modelo
  let alert = ''
  if (tipo === 'capelinha' || tipo === 'capelinha_3v') {
    alert = ' Lembre: pode respingar em chuva muito forte.'
  }
  if (tipo.includes('grade')) {
    alert = ' Grade embutida, adiciona +1,5cm na profundidade.'
  }

  // Preço final (com ou sem desconto)
  const precoFinal = result.precoComDesconto || result.precoTotal || result.preco || 0
  const precoFormatado = `R$ ${precoFinal.toFixed(2).replace('.', ',')}`
  
  // Informações de desconto
  let descontoInfo = ''
  if (result.desconto && result.desconto.valorTotal > 0) {
    const descontos: string[] = []
    if (result.desconto.percentualQuantidade > 0) {
      descontos.push(`${(result.desconto.percentualQuantidade * 100).toFixed(0)}% quantidade`)
    }
    if (result.desconto.percentualPix > 0) {
      descontos.push(`${(result.desconto.percentualPix * 100).toFixed(0)}% Pix`)
    }
    descontoInfo = ` (inclui desconto: ${descontos.join(' + ')})`
  }

  // Mensagem final
  let message = `*${result.produto}* ${input.width}x${input.height}cm${vidroInfo}${qtdInfo}: *${precoFormatado}*${descontoInfo}.${alert}`
  
  // Adicionar avisos se houver
  if (result.avisos && result.avisos.length > 0) {
    message += ` ${result.avisos.join(' ')}`
  }
  
  // Adicionar link se disponível (apenas para WhatsApp/Shopify, não ML)
  if (result.link && canal !== 'mercadolivre') {
    message += ` Link para compra: ${result.link}`
  }
  
  message += ' Quer que eu calcule o frete?'

  return {
    available: true,
    model: result.produto || formatProductName(tipo, cor),
    dimensions: { width: input.width, height: input.height },
    price: precoFinal,
    link: result.link,
    message
  }
}

export async function executeUpdateLeadInfo(
  input: { name?: string; email?: string; cep?: string; cpf?: string; notes?: string },
  leadId: string
): Promise<UpdateLeadResult> {
  try {
    const updates: Record<string, string> = {}
    const updatedFields: string[] = []

    if (input.name) {
      updates.name = input.name
      updatedFields.push('nome')
    }
    if (input.email) {
      updates.email = input.email
      updatedFields.push('email')
    }
    if (input.cep) {
      updates.cep = input.cep.replace(/\D/g, '')
      updatedFields.push('CEP')
    }
    if (input.cpf) {
      updates.cpf = input.cpf.replace(/\D/g, '')
      updatedFields.push('CPF')
    }
    if (input.notes) {
      updates.notes = input.notes
      updatedFields.push('observações')
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        updated_fields: [],
        message: 'Nenhuma informação para atualizar.'
      }
    }

    const { error } = await getSupabase()
      .from('dc_leads')
      .update(updates)
      .eq('id', leadId)

    if (error) throw error

    return {
      success: true,
      updated_fields: updatedFields,
      message: `Informações atualizadas: ${updatedFields.join(', ')}.`
    }
  } catch (error) {
    console.error('Error updating lead info:', error)
    return {
      success: false,
      updated_fields: [],
      message: 'Erro ao atualizar informações.'
    }
  }
}

// =====================================================
// NOVAS TOOLS
// =====================================================

export async function executeValidateMeasurement(
  input: {
    width: number
    height: number
    cep?: string
    wall_type?: string
    wall_depth?: number
    model?: string
  }
): Promise<ValidateMeasurementResult> {
  const validation = validateMeasurement(input.width, input.height, input.cep)
  
  // Verificar drywall se aplicável
  let drywallCheck: { isValid: boolean; minRequired: number; message: string } | undefined
  if (input.wall_type === 'drywall' && input.wall_depth && input.model) {
    drywallCheck = validateDrywallDepth(input.model, input.wall_depth)
    if (!drywallCheck.isValid) {
      validation.errors.push(drywallCheck.message)
    }
  }
  
  // Verificar limite de transporte para fora de SP
  const isSP = input.cep?.startsWith('0') || false
  if (!isSP && input.width > LIMITS.maxOutsideSP.width) {
    validation.errors.push(`Para fora de SP, a largura máxima é ${LIMITS.maxOutsideSP.width}cm (limite de transporte).`)
    validation.isValid = false
  }
  
  // Construir mensagem amigável
  let message = ''
  if (!validation.isValid) {
    message = `⚠️ ${validation.errors.join(' ')}`
  } else if (input.width !== validation.normalizedWidth || input.height !== validation.normalizedHeight) {
    message = `Sua medida de ${input.width}x${input.height}cm fica ${validation.normalizedWidth}x${validation.normalizedHeight}cm (ajustada para múltiplo de 0,5cm). `
    
    // Verificar se é medida padrão
    const isStandardHeight = STANDARD_HEIGHTS.includes(validation.normalizedHeight)
    const isStandardWidth = STANDARD_WIDTHS.includes(validation.normalizedWidth)
    
    if (!isStandardHeight || !isStandardWidth) {
      message += `A medida padrão mais próxima é ${validation.nearestStandard.width}x${validation.nearestStandard.height}cm. `
    }
    
    message += `Posso seguir com ${validation.normalizedWidth}x${validation.normalizedHeight}cm?`
  } else {
    message = `✅ Medida ${validation.normalizedWidth}x${validation.normalizedHeight}cm válida!`
  }
  
  // Adicionar warnings
  if (validation.warnings.length > 0) {
    message += ` Obs: ${validation.warnings.join('. ')}`
  }

  return {
    isValid: validation.isValid,
    originalWidth: input.width,
    originalHeight: input.height,
    normalizedWidth: validation.normalizedWidth,
    normalizedHeight: validation.normalizedHeight,
    nearestStandard: validation.nearestStandard,
    clearanceNeeded: {
      lateral: INSTALLATION_CLEARANCE.lateral,
      top: INSTALLATION_CLEARANCE.topo
    },
    errors: validation.errors,
    warnings: validation.warnings,
    drywallCheck,
    message
  }
}

export async function executeRecommendProduct(
  input: {
    environment: string
    needs?: string[]
    width?: number
    height?: number
    rain_region?: boolean
  }
): Promise<RecommendProductResult> {
  const needs = input.needs || []
  const warnings: string[] = []
  
  // Obter modelos recomendados para o ambiente
  const recommendedModels = getRecommendedModelForEnvironment(input.environment)
  let recommendedModelId = recommendedModels[0]
  
  // Ajustar baseado nas necessidades
  if (needs.includes('ventilacao')) {
    // Preferir modelos com mais ventilação
    if (recommendedModels.includes('3f')) recommendedModelId = '3f'
    if (recommendedModels.includes('capelinha')) recommendedModelId = 'capelinha'
  }
  
  if (needs.includes('insetos')) {
    // Preferir modelos com tela
    if (recommendedModels.includes('2f_tela')) recommendedModelId = '2f_tela'
    if (recommendedModels.includes('3f_tela')) recommendedModelId = '3f_tela'
  }
  
  if (needs.includes('seguranca')) {
    recommendedModelId = 'grade'
  }
  
  // Se região com muita chuva e modelo é capelinha, alertar
  if (input.rain_region && recommendedModelId === 'capelinha') {
    warnings.push('Região com muita chuva: Capelinha pode respingar em chuvas fortes. Considere janela de correr.')
    recommendedModelId = '3f' // Trocar para correr
  }
  
  // Obter vidro recomendado
  let recommendedGlassId = getRecommendedGlassForEnvironment(input.environment)
  
  if (needs.includes('privacidade')) {
    recommendedGlassId = 'mini_boreal'
  }
  if (needs.includes('iluminacao')) {
    recommendedGlassId = 'incolor'
  }
  
  // Obter especificações
  const model = MODELS[recommendedModelId] || MODELS['2f']
  const glass = GLASSES[recommendedGlassId] || GLASSES['incolor']
  
  // Obter medidas sugeridas
  const suggestedSizes = RECOMMENDED_SIZES[input.environment] || RECOMMENDED_SIZES['sala']
  
  // Filtrar por medidas disponíveis se informadas
  let filteredSizes = suggestedSizes
  if (input.width && input.height) {
    // Encontrar medidas que cabem no vão
    filteredSizes = suggestedSizes.filter(s => 
      s.width <= input.width! && s.height <= input.height!
    )
    if (filteredSizes.length === 0) {
      filteredSizes = suggestedSizes.slice(0, 3) // Fallback para as 3 primeiras
      warnings.push(`As medidas sugeridas são maiores que seu vão (${input.width}x${input.height}cm). Confira as medidas.`)
    }
  }
  
  // Construir mensagem
  const needsText = needs.length > 0 ? ` (prioridade: ${needs.join(', ')})` : ''
  const message = `Para ${input.environment}${needsText}, recomendo: *${model.name}* com vidro *${glass.name}*. ${model.description}`

  return {
    recommendedModel: recommendedModelId,
    modelName: model.name,
    recommendedGlass: recommendedGlassId,
    glassName: glass.name,
    suggestedSizes: filteredSizes.slice(0, 3),
    features: model.features,
    warnings,
    message
  }
}
