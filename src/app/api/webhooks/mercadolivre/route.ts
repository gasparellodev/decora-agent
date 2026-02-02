import { NextRequest, NextResponse } from 'next/server'
import type { MLWebhookNotification } from '@/types/mercadolivre'
import { POST as handleQuestions } from './questions/route'
import { POST as handleMessages } from './messages/route'
import { POST as handleOrders } from './orders/route'

/**
 * POST /api/webhooks/mercadolivre
 * Webhook unificado do Mercado Livre
 * Chama os handlers específicos baseado no tópico
 */
export async function POST(request: NextRequest) {
  try {
    // Clonar a request para poder ler o body múltiplas vezes
    const body = await request.text()
    const notification = JSON.parse(body) as MLWebhookNotification

    console.log('[ML Webhook] ========== NOTIFICAÇÃO RECEBIDA ==========')
    console.log('[ML Webhook] Topic:', notification.topic)
    console.log('[ML Webhook] Resource:', notification.resource)
    console.log('[ML Webhook] User ID:', notification.user_id)

    // Criar nova request com o body para os handlers
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: body
    })

    // Chamar o handler específico diretamente (sem fetch externo)
    switch (notification.topic) {
      case 'questions':
        console.log('[ML Webhook] Encaminhando para handler de perguntas...')
        return await handleQuestions(newRequest)

      case 'messages':
        console.log('[ML Webhook] Encaminhando para handler de mensagens...')
        return await handleMessages(newRequest)

      case 'orders_v2':
      case 'shipments':
        console.log('[ML Webhook] Encaminhando para handler de pedidos...')
        return await handleOrders(newRequest)

      default:
        console.log('[ML Webhook] Tópico não suportado:', notification.topic)
        return NextResponse.json({
          status: 'ignored',
          reason: 'unsupported_topic',
          topic: notification.topic
        })
    }
  } catch (error) {
    console.error('[ML Webhook] ❌ ERRO:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET para verificação do webhook pelo ML
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'mercadolivre',
    supported_topics: ['questions', 'messages', 'orders_v2', 'shipments']
  })
}
