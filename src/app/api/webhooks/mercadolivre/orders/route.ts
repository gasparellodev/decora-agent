import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getOrder,
  getShipment,
  getShipmentTracking,
  extractOrderIdFromResource,
  extractShipmentIdFromResource,
  sendMessage,
  sendSequentialMessages
} from '@/lib/providers/mercadolivre'
import {
  getOrCreateMLConversation,
  updateMLConversation,
  saveMLMessage
} from '@/lib/services/mercadolivre-message.service'
import {
  upsertMLLead,
  generatePostSaleSequence,
  generateStatusNotification
} from '@/lib/services/agent.service'
import type { MLWebhookNotification } from '@/types/mercadolivre'
import type { PostSaleContext } from '@/lib/ai/prompts/sales-agent'

/**
 * POST /api/webhooks/mercadolivre/orders
 * Webhook para pedidos e envios do Mercado Livre
 */
export async function POST(request: NextRequest) {
  try {
    const notification = await request.json() as MLWebhookNotification

    console.log('[ML Orders Webhook] Notificação recebida:', notification.topic, notification.resource)

    // Processa baseado no tópico
    if (notification.topic === 'orders_v2') {
      return await processOrderNotification(notification)
    } else if (notification.topic === 'shipments') {
      return await processShipmentNotification(notification)
    }

    return NextResponse.json({ status: 'ignored', reason: 'unknown_topic' })
  } catch (error) {
    console.error('[ML Orders Webhook] Erro:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Processa notificação de pedido
 */
async function processOrderNotification(notification: MLWebhookNotification) {
  const orderId = extractOrderIdFromResource(notification.resource)
  if (!orderId) {
    return NextResponse.json({ status: 'error', reason: 'invalid_resource' }, { status: 400 })
  }

  // Busca detalhes do pedido
  const order = await getOrder(orderId)

  console.log('[ML Orders] Pedido:', orderId, 'Status:', order.status)

  const packId = order.pack_id?.toString() || orderId
  const buyerId = order.buyer.id.toString()
  const buyerName = order.buyer.first_name || order.buyer.nickname
  const buyerNickname = order.buyer.nickname

  // Busca ou cria conversa
  const conversation = await getOrCreateMLConversation(
    packId,
    orderId,
    buyerId,
    buyerName
  )

  const supabase = createAdminClient()

  // Verifica status do pedido
  if (order.status === 'paid' && !conversation.freightPaid) {
    // Verifica se tem taxa de envio paga
    const totalShippingPaid = order.payments.reduce((sum, p) => sum + (p.shipping_cost || 0), 0)
    
    if (totalShippingPaid > 0) {
      console.log('[ML Orders] Frete pago detectado:', totalShippingPaid)

      // ===== CRIAR LEAD DO ML =====
      const lead = await upsertMLLead({
        mlBuyerId: buyerId,
        name: buyerName,
        nickname: buyerNickname
      })

      console.log('[ML Orders] Lead criado/encontrado:', lead?.id)

      // Atualiza conversa com frete pago e lead_id
      await updateMLConversation(packId, {
        freight_paid: true,
        freight_value: totalShippingPaid
      })

      // ===== GERAR SEQUÊNCIA COM AGENTE =====
      const productInfo = order.order_items?.[0]?.item?.title
      const sequenceResult = await generatePostSaleSequence(buyerName, productInfo)

      if (sequenceResult.success && sequenceResult.messages.length > 0) {
        console.log('[ML Orders] Sequência gerada pelo agente:', sequenceResult.messages.length, 'mensagens')

        // Envia mensagens sequencialmente (2s de delay entre cada)
        const sendResult = await sendSequentialMessages(packId, buyerId, sequenceResult.messages, 2000)

        if (sendResult.success) {
          console.log('[ML Orders] ✅ Sequência de boas-vindas enviada para:', packId)

          // Atualiza flags de mensagens enviadas
          await updateMLConversation(packId, {
            welcome_sent: true,
            chapatex_sent: true,
            cintas_sent: true,
            data_request_sent: true,
            glass_request_sent: true,
            status: 'waiting_data',
            last_message_at: new Date().toISOString()
          })

          // Salva mensagens no histórico
          for (const msg of sequenceResult.messages) {
            await saveMLMessage(packId, conversation.id, 'outbound', 'agent', msg)
          }
        } else {
          console.error('[ML Orders] ❌ Falha ao enviar sequência:', sendResult.error)
        }
      } else {
        console.error('[ML Orders] ❌ Falha ao gerar sequência com agente')
      }

      // Salva/atualiza pedido no sistema interno com lead
      const { data: existingOrder } = await supabase
        .from('dc_orders')
        .select('id')
        .eq('external_id', orderId)
        .single()

      if (!existingOrder && lead) {
        await supabase.from('dc_orders').insert({
          external_id: orderId,
          source: 'mercadolivre',
          order_number: orderId,
          status: 'pago',
          lead_id: lead.id,
          total_amount: order.total_amount,
          metadata: {
            ml_order_id: orderId,
            ml_pack_id: packId,
            ml_buyer_id: buyerId,
            ml_buyer_name: buyerName,
            freight_paid: totalShippingPaid
          }
        })
      }

      return NextResponse.json({
        status: 'processed',
        orderId,
        action: 'welcome_sequence_sent',
        freightPaid: totalShippingPaid,
        leadId: lead?.id,
        messagesGenerated: sequenceResult.messages.length,
        tokensUsed: sequenceResult.tokensUsed
      })
    }
  }

  // Salva/atualiza pedido no sistema interno (sem frete pago ainda)
  const { data: existingOrder } = await supabase
    .from('dc_orders')
    .select('id')
    .eq('external_id', orderId)
    .single()

  if (!existingOrder) {
    await supabase.from('dc_orders').insert({
      external_id: orderId,
      source: 'mercadolivre',
      order_number: orderId,
      status: mapMLStatus(order.status),
      total_amount: order.total_amount,
      metadata: {
        ml_order_id: orderId,
        ml_pack_id: packId,
        ml_buyer_id: buyerId,
        ml_buyer_name: buyerName
      }
    })
  }

  return NextResponse.json({
    status: 'processed',
    orderId,
    orderStatus: order.status
  })
}

/**
 * Processa notificação de envio
 */
async function processShipmentNotification(notification: MLWebhookNotification) {
  const shipmentId = extractShipmentIdFromResource(notification.resource)
  if (!shipmentId) {
    return NextResponse.json({ status: 'error', reason: 'invalid_resource' }, { status: 400 })
  }

  // Busca detalhes do envio
  const shipment = await getShipment(shipmentId)

  console.log('[ML Shipments] Envio:', shipmentId, 'Status:', shipment.status)

  // Busca conversa pelo order relacionado ao shipment
  const supabase = createAdminClient()

  // Tenta encontrar pedido pelo shipment
  const { data: order } = await supabase
    .from('dc_orders')
    .select('*')
    .contains('metadata', { ml_shipment_id: shipmentId })
    .single()

  // Se não encontrou, tenta pelo sender/receiver
  let packId: string | undefined
  let buyerId: string | undefined
  let buyerName: string = 'cliente'

  if (order) {
    packId = order.metadata?.ml_pack_id
    buyerId = order.metadata?.ml_buyer_id
    buyerName = order.metadata?.ml_buyer_name || 'cliente'
  } else {
    // Usa receiver_id como buyerId
    buyerId = shipment.receiver_id.toString()
    packId = shipmentId // Fallback
  }

  if (!packId || !buyerId) {
    return NextResponse.json({
      status: 'processed',
      shipmentId,
      action: 'no_conversation_found'
    })
  }

  // Busca conversa para salvar mensagens
  const { data: conversation } = await supabase
    .from('dc_ml_conversations')
    .select('id')
    .eq('pack_id', packId)
    .single()

  // Processa baseado no status do envio
  let notificationSent = false
  let tokensUsed = 0

  switch (shipment.status) {
    case 'shipped': {
      // Pedido foi enviado
      const tracking = await getShipmentTracking(shipmentId)
      
      // Gera mensagem humanizada com agente
      const context: PostSaleContext = {
        buyerName,
        trackingCode: tracking.tracking_number
      }
      const result = await generateStatusNotification('shipped', context)

      if (result.success && result.message) {
        await sendMessage(packId, buyerId, result.message)
        tokensUsed = result.tokensUsed || 0
        
        // Salva no histórico
        if (conversation) {
          await saveMLMessage(packId, conversation.id, 'outbound', 'agent', result.message)
        }
        
        console.log('[ML Shipments] ✅ Notificação de envio enviada')
        notificationSent = true
      }

      // Atualiza pedido interno
      if (order) {
        await supabase
          .from('dc_orders')
          .update({
            status: 'enviado',
            tracking_code: tracking.tracking_number,
            tracking_url: tracking.tracking_url
          })
          .eq('id', order.id)
      }
      break
    }

    case 'delivered': {
      // Pedido foi entregue
      const context: PostSaleContext = {
        buyerName
      }
      const result = await generateStatusNotification('delivered', context)

      if (result.success && result.message) {
        await sendMessage(packId, buyerId, result.message)
        tokensUsed = result.tokensUsed || 0
        
        // Salva no histórico
        if (conversation) {
          await saveMLMessage(packId, conversation.id, 'outbound', 'agent', result.message)
        }
        
        console.log('[ML Shipments] ✅ Notificação de entrega enviada')
        notificationSent = true
      }

      // Atualiza pedido interno
      if (order) {
        await supabase
          .from('dc_orders')
          .update({ status: 'entregue' })
          .eq('id', order.id)
      }
      break
    }

    default:
      // Outros status não enviam notificação automática
      break
  }

  return NextResponse.json({
    status: 'processed',
    shipmentId,
    shipmentStatus: shipment.status,
    notificationSent,
    tokensUsed
  })
}

/**
 * Mapeia status do ML para status interno
 */
function mapMLStatus(mlStatus: string): string {
  const statusMap: Record<string, string> = {
    'confirmed': 'pendente',
    'payment_required': 'pendente',
    'payment_in_process': 'pendente',
    'partially_paid': 'pendente',
    'paid': 'pago',
    'cancelled': 'cancelado'
  }
  return statusMap[mlStatus] || 'pendente'
}

/**
 * GET para verificação do webhook pelo ML
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'mercadolivre-orders' })
}
