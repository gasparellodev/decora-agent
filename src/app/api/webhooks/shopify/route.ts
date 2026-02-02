import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { upsertLead, getOrCreateConversation } from '@/lib/services/agent.service'

function getSupabase() { return createAdminClient() }

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const hmac = request.headers.get('x-shopify-hmac-sha256')
    const topic = request.headers.get('x-shopify-topic')

    // Validar assinatura
    if (process.env.SHOPIFY_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(body, 'utf8')
        .digest('base64')

      if (hash !== hmac) {
        console.error('Invalid Shopify webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    console.log(`Shopify webhook received: ${topic}`)

    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(data)
        break
      case 'orders/updated':
        await handleOrderUpdated(data)
        break
      case 'orders/paid':
        await handleOrderPaid(data)
        break
      case 'orders/fulfilled':
        await handleOrderFulfilled(data)
        break
      default:
        console.log(`Unhandled Shopify topic: ${topic}`)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error processing Shopify webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleOrderCreated(order: any) {
  try {
    // Extrair dados do cliente
    const customer = order.customer || {}
    const shipping = order.shipping_address || {}
    
    let phone = customer.phone || shipping.phone || ''
    phone = phone.replace(/\D/g, '')
    
    // Se não tem telefone, não podemos processar
    if (!phone) {
      console.log('No phone number in Shopify order, skipping')
      return
    }

    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    const email = customer.email || ''

    // Criar/atualizar lead
    const lead = await upsertLead(phone, name, 'shopify')
    if (!lead) {
      console.error('Failed to create lead from Shopify order')
      return
    }

    // Atualizar lead com dados adicionais
    await getSupabase()
      .from('dc_leads')
      .update({
        email: email || lead.email,
        stage: 'comprou',
        cep: shipping.zip?.replace(/\D/g, '') || lead.cep,
        address_json: shipping,
        metadata: {
          ...lead.metadata as object,
          shopify_customer_id: customer.id,
          last_shopify_order: order.name
        }
      })
      .eq('id', lead.id)

    // Criar registro do pedido
    await getSupabase().from('dc_orders').upsert({
      lead_id: lead.id,
      external_id: order.id.toString(),
      source: 'shopify',
      order_number: order.name || order.order_number?.toString(),
      total: parseFloat(order.total_price) || 0,
      status: 'pago',
      production_status: 'cadastrado',
      metadata: {
        line_items: order.line_items,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        created_at: order.created_at
      }
    }, { onConflict: 'external_id,source' })

    // Enviar mensagem de confirmação via WhatsApp
    const evolution = getEvolutionProvider()
    const firstName = customer.first_name || 'Cliente'
    
    const message = `Olá ${firstName}! 🎉

Recebemos seu pedido ${order.name} da Decora Esquadrias!

📦 *Resumo do Pedido:*
${order.line_items?.map((item: any) => `• ${item.quantity}x ${item.title}`).join('\n') || 'Itens do pedido'}

💰 *Total:* R$ ${parseFloat(order.total_price).toFixed(2)}

Seu pedido já está sendo preparado! O prazo de produção é de 5 a 7 dias úteis.

Em breve entraremos em contato com mais detalhes sobre a entrega.

Obrigado pela preferência! 😊`

    await evolution.sendText(phone, message)

    // Salvar mensagem enviada
    const conversation = await getOrCreateConversation(lead.id)
    if (conversation) {
      await getSupabase().from('dc_messages').insert({
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'outbound',
        sender_type: 'system',
        content: message,
        metadata: { trigger: 'shopify_order_created', order_id: order.id }
      })
    }

    console.log(`Shopify order ${order.name} processed for lead ${lead.id}`)

  } catch (error) {
    console.error('Error handling Shopify order created:', error)
  }
}

async function handleOrderUpdated(order: any) {
  try {
    // Atualizar pedido no banco
    await getSupabase()
      .from('dc_orders')
      .update({
        status: order.financial_status,
        metadata: {
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          updated_at: new Date().toISOString()
        }
      })
      .eq('external_id', order.id.toString())
      .eq('source', 'shopify')

  } catch (error) {
    console.error('Error handling Shopify order updated:', error)
  }
}

async function handleOrderPaid(order: any) {
  try {
    await getSupabase()
      .from('dc_orders')
      .update({
        status: 'pago',
        production_status: 'em_producao'
      })
      .eq('external_id', order.id.toString())
      .eq('source', 'shopify')

  } catch (error) {
    console.error('Error handling Shopify order paid:', error)
  }
}

async function handleOrderFulfilled(order: any) {
  try {
    const trackingNumber = order.fulfillments?.[0]?.tracking_number || ''
    
    await getSupabase()
      .from('dc_orders')
      .update({
        status: 'enviado',
        production_status: 'enviado',
        tracking_code: trackingNumber
      })
      .eq('external_id', order.id.toString())
      .eq('source', 'shopify')

    // Se tem tracking, notificar cliente
    if (trackingNumber) {
      const { data: orderData } = await getSupabase()
        .from('dc_orders')
        .select('*, lead:dc_leads(*)')
        .eq('external_id', order.id.toString())
        .eq('source', 'shopify')
        .single()

      if (orderData?.lead) {
        const evolution = getEvolutionProvider()
        const message = `Olá! 📦

Seu pedido ${order.name} foi enviado!

🚚 *Código de Rastreio:* ${trackingNumber}

Você pode acompanhar a entrega pelo site da transportadora.

Qualquer dúvida, estamos à disposição!`

        await evolution.sendText(orderData.lead.phone, message)
      }
    }

  } catch (error) {
    console.error('Error handling Shopify order fulfilled:', error)
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'shopify-webhook',
    timestamp: new Date().toISOString()
  })
}
