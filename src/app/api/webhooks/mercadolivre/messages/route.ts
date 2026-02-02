import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPackMessages,
  extractPackIdFromResource,
  sendMessage
} from '@/lib/providers/mercadolivre'
import {
  getOrCreateMLConversation,
  updateMLConversation,
  saveMLMessage
} from '@/lib/services/mercadolivre-message.service'
import {
  processClientResponse,
  updateMLLeadData,
  generatePostSaleMessage
} from '@/lib/services/agent.service'
import type { MLWebhookNotification } from '@/types/mercadolivre'

/**
 * POST /api/webhooks/mercadolivre/messages
 * Webhook para mensagens pós-venda do Mercado Livre
 */
export async function POST(request: NextRequest) {
  try {
    const notification = await request.json() as MLWebhookNotification

    console.log('[ML Messages Webhook] Notificação recebida:', notification.topic)

    // Verifica se é uma notificação de mensagem
    if (notification.topic !== 'messages') {
      return NextResponse.json({ status: 'ignored', reason: 'not_message' })
    }

    // Extrai pack_id
    const packId = extractPackIdFromResource(notification.resource)
    if (!packId) {
      console.error('[ML Messages] Não foi possível extrair pack_id:', notification.resource)
      return NextResponse.json({ status: 'error', reason: 'invalid_resource' }, { status: 400 })
    }

    // Busca mensagens do pack
    const messagesResponse = await getPackMessages(packId)
    
    if (!messagesResponse.results || messagesResponse.results.length === 0) {
      return NextResponse.json({ status: 'ignored', reason: 'no_messages' })
    }

    // Pega a última mensagem
    const lastMessage = messagesResponse.results[messagesResponse.results.length - 1]
    const buyerId = lastMessage.from.user_id.toString()
    const buyerName = lastMessage.from.name

    // Ignora se a mensagem é do vendedor (nós mesmos)
    const sellerId = process.env.ML_USER_ID
    if (lastMessage.from.user_id.toString() === sellerId) {
      return NextResponse.json({ status: 'ignored', reason: 'own_message' })
    }

    console.log('[ML Messages] Mensagem recebida:', lastMessage.text?.substring(0, 100))

    // Busca ou cria conversa
    const conversation = await getOrCreateMLConversation(
      packId,
      undefined,
      buyerId,
      buyerName
    )

    // Salva mensagem recebida
    await saveMLMessage(
      packId,
      conversation.id,
      'inbound',
      'buyer',
      lastMessage.text,
      lastMessage.id
    )

    // Atualiza timestamp
    await updateMLConversation(packId, {
      last_message_at: new Date().toISOString()
    })

    // Busca lead associado a esta conversa
    const supabase = createAdminClient()
    const { data: lead } = await supabase
      .from('dc_leads')
      .select('id')
      .contains('metadata', { ml_buyer_id: buyerId })
      .single()

    // Processa baseado no status da conversa
    let response: Record<string, unknown> = { status: 'processed', packId }

    switch (conversation.status) {
      case 'active':
        // Conversa nova - verifica se frete foi pago para iniciar fluxo
        // O fluxo de boas-vindas é iniciado pelo webhook de orders quando frete é pago
        response.action = 'waiting_freight_payment'
        break

      case 'waiting_data': {
        // Aguardando dados do cliente - processa resposta
        const result = await processClientResponse(
          lastMessage.text,
          conversation.dataCollected || {},
          conversation.status
        )

        // Atualiza conversa com dados extraídos
        const requiredFields = ['name', 'address', 'cep', 'cpf', 'email', 'whatsapp']
        const missingFields = requiredFields.filter(f => !result.dataExtracted[f])
        const isComplete = missingFields.length === 0

        await updateMLConversation(packId, {
          data_collected: result.dataExtracted,
          status: isComplete ? 'waiting_glass' : 'waiting_data'
        })

        // Atualiza lead com dados coletados
        if (lead && Object.keys(result.dataExtracted).length > 0) {
          await updateMLLeadData(lead.id, result.dataExtracted)
          console.log('[ML Messages] ✅ Lead atualizado com dados:', Object.keys(result.dataExtracted))
        }

        // Se todos os dados foram coletados, envia confirmação humanizada
        if (isComplete && result.dataExtracted.name) {
          const confirmResult = await generatePostSaleMessage('data_confirmation', {
            buyerName: result.dataExtracted.name,
            collectedData: result.dataExtracted
          })

          if (confirmResult.success && confirmResult.message) {
            await sendMessage(packId, buyerId, confirmResult.message)
            await saveMLMessage(packId, conversation.id, 'outbound', 'agent', confirmResult.message)
            console.log('[ML Messages] ✅ Confirmação de dados enviada')
          }
        }

        response.action = 'processed_data'
        response.dataComplete = isComplete
        response.dataExtracted = result.dataExtracted
        response.missingFields = missingFields
        break
      }

      case 'waiting_glass': {
        // Aguardando escolha do vidro - processa resposta
        const result = await processClientResponse(
          lastMessage.text,
          conversation.dataCollected || {},
          conversation.status
        )

        if (result.glassChoice) {
          // Atualiza conversa com vidro escolhido
          await updateMLConversation(packId, {
            glass_choice: result.glassChoice,
            status: 'complete'
          })

          // Atualiza lead
          if (lead) {
            await updateMLLeadData(lead.id, { glass: result.glassChoice })
          }

          // Envia confirmação humanizada
          const glassName = {
            'incolor': 'incolor',
            'mini_boreal': 'mini boreal',
            'fume': 'fume'
          }[result.glassChoice] || result.glassChoice

          const confirmResult = await generatePostSaleMessage('glass_confirmation', {
            buyerName: conversation.buyerName || 'cliente',
            glassChoice: glassName
          })

          if (confirmResult.success && confirmResult.message) {
            await sendMessage(packId, buyerId, confirmResult.message)
            await saveMLMessage(packId, conversation.id, 'outbound', 'agent', confirmResult.message)
            console.log('[ML Messages] ✅ Confirmação de vidro enviada:', result.glassChoice)
          }

          response.action = 'glass_selected'
          response.glassChoice = result.glassChoice
        } else {
          response.action = 'glass_not_recognized'
        }
        break
      }

      case 'complete':
        // Conversa completa - mensagens adicionais são apenas registradas
        response.action = 'conversation_complete'
        // Pode-se integrar com agente para respostas dinâmicas aqui se necessário
        break

      default:
        response.action = 'unknown_status'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[ML Messages Webhook] Erro:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET para verificação do webhook pelo ML
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'mercadolivre-messages' })
}
