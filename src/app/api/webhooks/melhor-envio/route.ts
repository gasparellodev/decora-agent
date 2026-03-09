import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'

function getSupabase() { return createAdminClient() }

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-me-signature')

    // Validar assinatura HMAC-SHA256
    if (process.env.MELHOR_ENVIO_SECRET && signature) {
      const hash = crypto
        .createHmac('sha256', process.env.MELHOR_ENVIO_SECRET)
        .update(body)
        .digest('hex')

      if (hash !== signature) {
        console.error('Invalid Melhor Envio webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    console.log('Melhor Envio webhook received:', payload)

    const { tracking, status, description } = payload

    if (!tracking) {
      return NextResponse.json({ ok: true, skipped: 'no_tracking' })
    }

    // Buscar pedido pelo código de rastreio
    const { data: order } = await getSupabase()
      .from('dc_orders')
      .select('*, lead:dc_leads(*)')
      .eq('tracking_code', tracking)
      .single()

    if (!order) {
      console.log(`No order found for tracking ${tracking}`)
      return NextResponse.json({ ok: true, skipped: 'order_not_found' })
    }

    // Mapear status do Melhor Envio
    const firstName = order.lead?.name?.split(' ')[0] || 'Cliente'
    const orderNumber = order.order_number || ''

    const statusMap: Record<string, { status: string; production_status: string; message: string }> = {
      'posted': {
        status: 'enviado',
        production_status: 'enviado',
        message: `Olá ${firstName} 👋\n\nSeu pedido${orderNumber ? ` #${orderNumber}` : ''} já está com a transportadora responsável pela entrega 🚚\n\n📦 Esse é o seu número de rastreio: *${tracking}*\n\nVocê pode acompanhar através do seguinte link: https://rptn.in/c/${tracking}`
      },
      'in_transit': {
        status: 'em_transito',
        production_status: 'enviado',
        message: `Olá, ${firstName}! 😊\n\nSeu pedido${orderNumber ? ` #${orderNumber}` : ''} está a caminho! 🚚✨\n\nAcompanhe onde ele está com seu código de rastreio:\n📍 *${tracking}*\n\nJá já chega! 📦🎉`
      },
      'out_for_delivery': {
        status: 'saiu_entrega',
        production_status: 'enviado',
        message: `Olá, ${firstName}! 🎉\n\nSeu pedido${orderNumber ? ` #${orderNumber}` : ''} saiu para entrega!\n\nPrepare-se para receber suas janelas hoje! 🪟✨`
      },
      'delivered': {
        status: 'entregue',
        production_status: 'entregue',
        message: `Olá, ${firstName}! 🎉\n\nSeu pedido${orderNumber ? ` #${orderNumber}` : ''} foi entregue! Esperamos que esteja amando sua compra. 📦❤️\n\nQualquer dúvida ou necessidade, estamos aqui. E se puder, deixa sua avaliação — ela ajuda muito a gente! ⭐😊`
      },
      'first_failed_delivery_attempt': {
        status: 'tentativa_falha',
        production_status: 'enviado',
        message: `Olá, ${firstName}! ⚠️\n\nTentamos entregar seu pedido${orderNumber ? ` #${orderNumber}` : ''} mas não conseguimos.\n\nA transportadora fará uma nova tentativa em breve. Por favor, verifique se alguém pode receber no endereço informado.`
      },
      'returning': {
        status: 'devolvendo',
        production_status: 'enviado',
        message: `Olá, ${firstName}! 📦\n\nSeu pedido${orderNumber ? ` #${orderNumber}` : ''} está retornando.\n\nPor favor, entre em contato conosco para verificar o endereço de entrega.`
      }
    }

    const statusInfo = statusMap[status]

    if (statusInfo) {
      // Atualizar pedido
      await getSupabase()
        .from('dc_orders')
        .update({
          status: statusInfo.status,
          production_status: statusInfo.production_status,
          metadata: {
            ...(order.metadata as object),
            last_tracking_update: {
              status,
              description,
              updated_at: new Date().toISOString()
            }
          }
        })
        .eq('id', order.id)

      // Enviar notificação via WhatsApp
      if (order.lead) {
        const evolution = getEvolutionProvider()
        await evolution.sendText(order.lead.phone, statusInfo.message)

        // Se entregue, criar follow-ups
        if (status === 'delivered') {
          // Atualizar estágio do lead
          await getSupabase()
            .from('dc_leads')
            .update({ stage: 'entregue' })
            .eq('id', order.lead.id)

          // Criar follow-ups
          await getSupabase().from('dc_follow_ups').insert([
            {
              lead_id: order.lead.id,
              order_id: order.id,
              type: 'post_delivery',
              scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending'
            },
            {
              lead_id: order.lead.id,
              order_id: order.id,
              type: 'review',
              scheduled_for: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending'
            },
            {
              lead_id: order.lead.id,
              order_id: order.id,
              type: 'reactivation',
              scheduled_for: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 meses
              status: 'pending'
            }
          ])
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error processing Melhor Envio webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'melhor-envio-webhook',
    timestamp: new Date().toISOString()
  })
}
