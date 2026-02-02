import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { upsertLead, getOrCreateConversation } from '@/lib/services/agent.service'

function getSupabase() { return createAdminClient() }

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-yampi-hmac-sha256')

    // Validar assinatura HMAC
    if (process.env.YAMPI_WEBHOOK_SECRET && signature) {
      const hash = crypto
        .createHmac('sha256', process.env.YAMPI_WEBHOOK_SECRET)
        .update(body)
        .digest('base64')

      if (hash !== signature) {
        console.error('Invalid Yampi webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const event = payload.event
    const resource = payload.resource

    console.log(`Yampi webhook received: ${event}`)

    switch (event) {
      case 'cart.reminder':
        await handleCartReminder(resource)
        break
      case 'order.created':
        await handleOrderCreated(resource)
        break
      case 'order.paid':
        await handleOrderPaid(resource)
        break
      case 'order.invoiced':
        await handleOrderInvoiced(resource)
        break
      case 'order.shipped':
        await handleOrderShipped(resource)
        break
      case 'order.delivered':
        await handleOrderDelivered(resource)
        break
      default:
        console.log(`Unhandled Yampi event: ${event}`)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error processing Yampi webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCartReminder(cart: any) {
  try {
    const customer = cart.customer || {}
    let phone = customer.phone || ''
    phone = phone.replace(/\D/g, '')

    if (!phone) {
      console.log('No phone in Yampi cart reminder, skipping')
      return
    }

    const name = customer.name || customer.first_name || ''

    // Criar/atualizar lead
    const lead = await upsertLead(phone, name, 'yampi')
    if (!lead) return

    // Verificar se já existe follow-up para este carrinho
    const { data: existingFollowUp } = await getSupabase()
      .from('dc_follow_ups')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('type', 'abandoned_cart')
      .eq('status', 'pending')
      .single()

    if (existingFollowUp) {
      console.log('Follow-up already exists for this cart')
      return
    }

    // Calcular valor total do carrinho
    const total = cart.items?.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.price) * (item.quantity || 1)), 0) || 0

    // Criar follow-up para carrinho abandonado
    // Primeiro follow-up: 1 hora depois (sem desconto)
    await getSupabase().from('dc_follow_ups').insert({
      lead_id: lead.id,
      type: 'abandoned_cart',
      scheduled_for: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hora
      status: 'pending',
      context_json: {
        cart_id: cart.id,
        items: cart.items?.map((i: any) => ({
          name: i.name || i.title,
          quantity: i.quantity,
          price: i.price
        })),
        total,
        discount_offered: 0,
        attempt: 1
      }
    })

    // Segundo follow-up: 1 dia depois (5% desconto)
    await getSupabase().from('dc_follow_ups').insert({
      lead_id: lead.id,
      type: 'abandoned_cart',
      scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 dia
      status: 'pending',
      context_json: {
        cart_id: cart.id,
        items: cart.items?.map((i: any) => ({
          name: i.name || i.title,
          quantity: i.quantity,
          price: i.price
        })),
        total,
        discount_offered: 5,
        attempt: 2
      }
    })

    // Terceiro follow-up: 3 dias depois (7% desconto)
    await getSupabase().from('dc_follow_ups').insert({
      lead_id: lead.id,
      type: 'abandoned_cart',
      scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
      status: 'pending',
      context_json: {
        cart_id: cart.id,
        items: cart.items?.map((i: any) => ({
          name: i.name || i.title,
          quantity: i.quantity,
          price: i.price
        })),
        total,
        discount_offered: 7,
        attempt: 3
      }
    })

    console.log(`Cart reminder follow-ups created for lead ${lead.id}`)

  } catch (error) {
    console.error('Error handling Yampi cart reminder:', error)
  }
}

async function handleOrderCreated(order: any) {
  try {
    const customer = order.customer || {}
    let phone = customer.phone || ''
    phone = phone.replace(/\D/g, '')

    if (!phone) return

    const name = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()

    // Criar/atualizar lead
    const lead = await upsertLead(phone, name, 'yampi')
    if (!lead) return

    // Atualizar estágio do lead
    await getSupabase()
      .from('dc_leads')
      .update({
        stage: 'comprou',
        email: customer.email || lead.email
      })
      .eq('id', lead.id)

    // Criar registro do pedido
    await getSupabase().from('dc_orders').upsert({
      lead_id: lead.id,
      external_id: order.id?.toString(),
      source: 'yampi',
      order_number: order.number?.toString(),
      total: parseFloat(order.total) || 0,
      status: order.status?.data?.name || 'pendente',
      production_status: 'cadastrado',
      metadata: order
    }, { onConflict: 'external_id,source' })

    // Cancelar follow-ups de carrinho abandonado
    await getSupabase()
      .from('dc_follow_ups')
      .update({ status: 'cancelled' })
      .eq('lead_id', lead.id)
      .eq('type', 'abandoned_cart')
      .eq('status', 'pending')

    // Enviar confirmação
    const evolution = getEvolutionProvider()
    const firstName = customer.first_name || name.split(' ')[0] || 'Cliente'

    const message = `Olá ${firstName}! 🎉

Recebemos seu pedido #${order.number} da Decora Esquadrias!

O prazo de produção é de 5 a 7 dias úteis após a confirmação do pagamento.

Qualquer dúvida, estamos à disposição!

Obrigado pela preferência! 😊`

    await evolution.sendText(phone, message)

    console.log(`Yampi order ${order.number} processed for lead ${lead.id}`)

  } catch (error) {
    console.error('Error handling Yampi order created:', error)
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
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')

    // Notificar cliente
    const { data: orderData } = await getSupabase()
      .from('dc_orders')
      .select('*, lead:dc_leads(*)')
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')
      .single()

    if (orderData?.lead) {
      const evolution = getEvolutionProvider()
      const message = `Ótima notícia! ✅

O pagamento do seu pedido #${order.number} foi confirmado!

Sua janela já entrou em produção. O prazo é de 5 a 7 dias úteis.

Você receberá uma mensagem quando estiver pronta!`

      await evolution.sendText(orderData.lead.phone, message)
    }

  } catch (error) {
    console.error('Error handling Yampi order paid:', error)
  }
}

async function handleOrderInvoiced(order: any) {
  try {
    await getSupabase()
      .from('dc_orders')
      .update({
        status: 'faturado',
        production_status: 'pronto'
      })
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')

  } catch (error) {
    console.error('Error handling Yampi order invoiced:', error)
  }
}

async function handleOrderShipped(order: any) {
  try {
    const trackingCode = order.shipment?.tracking_code || ''

    await getSupabase()
      .from('dc_orders')
      .update({
        status: 'enviado',
        production_status: 'enviado',
        tracking_code: trackingCode
      })
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')

    // Notificar cliente
    if (trackingCode) {
      const { data: orderData } = await getSupabase()
        .from('dc_orders')
        .select('*, lead:dc_leads(*)')
        .eq('external_id', order.id?.toString())
        .eq('source', 'yampi')
        .single()

      if (orderData?.lead) {
        const evolution = getEvolutionProvider()
        const message = `Seu pedido foi enviado! 📦

🚚 *Código de Rastreio:* ${trackingCode}

Acompanhe pelo site da transportadora.

Boas compras!`

        await evolution.sendText(orderData.lead.phone, message)
      }
    }

  } catch (error) {
    console.error('Error handling Yampi order shipped:', error)
  }
}

async function handleOrderDelivered(order: any) {
  try {
    await getSupabase()
      .from('dc_orders')
      .update({
        status: 'entregue',
        production_status: 'entregue'
      })
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')

    // Buscar dados do pedido para criar follow-ups
    const { data: orderData } = await getSupabase()
      .from('dc_orders')
      .select('*, lead:dc_leads(*)')
      .eq('external_id', order.id?.toString())
      .eq('source', 'yampi')
      .single()

    if (orderData?.lead) {
      // Atualizar estágio do lead
      await getSupabase()
        .from('dc_leads')
        .update({ stage: 'entregue' })
        .eq('id', orderData.lead.id)

      // Criar follow-ups pós-entrega
      await getSupabase().from('dc_follow_ups').insert([
        {
          lead_id: orderData.lead.id,
          order_id: orderData.id,
          type: 'post_delivery',
          scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
          status: 'pending'
        },
        {
          lead_id: orderData.lead.id,
          order_id: orderData.id,
          type: 'review',
          scheduled_for: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias
          status: 'pending'
        }
      ])

      // Notificar cliente
      const evolution = getEvolutionProvider()
      const message = `Entrega confirmada! ✅

Seu pedido #${orderData.order_number} foi entregue!

Esperamos que você goste das suas novas janelas! 🪟

Se precisar de ajuda com a instalação, é só me chamar que envio nosso manual e vídeos tutoriais.

Obrigado por escolher a Decora! 💙`

      await evolution.sendText(orderData.lead.phone, message)
    }

  } catch (error) {
    console.error('Error handling Yampi order delivered:', error)
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'yampi-webhook',
    timestamp: new Date().toISOString()
  })
}
