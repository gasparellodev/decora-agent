import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateConversation, upsertLead } from '@/lib/services/agent.service'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { processMedia, MediaType } from '@/lib/services/media-processor.service'
import { bufferMessage } from '@/lib/services/message-buffer.service'
import { processFeedbackResponse, isAwaitingFeedback } from '@/lib/services/feedback.service'
import { generateLinkContext, detectLinks } from '@/lib/utils/link-detector'

function getSupabase() {
  return createAdminClient()
}

// Mapear nomes de eventos para formato normalizado
const eventNameMap: Record<string, string> = {
  'messages-upsert': 'MESSAGES_UPSERT',
  'connection-update': 'CONNECTION_UPDATE',
  'qrcode-updated': 'QRCODE_UPDATED',
  'messages_upsert': 'MESSAGES_UPSERT',
  'connection_update': 'CONNECTION_UPDATE',
  'qrcode_updated': 'QRCODE_UPDATED',
  'messages.upsert': 'MESSAGES_UPSERT',
  'connection.update': 'CONNECTION_UPDATE',
  'qrcode.updated': 'QRCODE_UPDATED',
  // Eventos de atualização de mensagens (inclui reações em algumas versões)
  'messages-update': 'MESSAGES_UPDATE',
  'messages_update': 'MESSAGES_UPDATE',
  'messages.update': 'MESSAGES_UPDATE',
  // Eventos de reação (dedicados)
  'messages-reaction': 'MESSAGES_REACTION',
  'messages_reaction': 'MESSAGES_REACTION',
  'messages.reaction': 'MESSAGES_REACTION',
  'send-message-reaction': 'MESSAGES_REACTION',
  'send_message_reaction': 'MESSAGES_REACTION',
}

function normalizeEventName(eventName: string): string {
  const lowercased = eventName.toLowerCase()
  return eventNameMap[lowercased] || eventName.toUpperCase().replace(/[.-]/g, '_')
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Normalizar o nome do evento
    const event = payload.event ? normalizeEventName(payload.event) : 'UNKNOWN'
    
    // Log completo para debug
    console.log('Evolution webhook received:', JSON.stringify({
      event,
      originalEvent: payload.event,
      instance: payload.instance,
      dataKeys: payload.data ? Object.keys(payload.data) : null
    }))

    switch (event) {
      case 'MESSAGES_UPSERT':
        return handleMessageUpsert(payload)
      
      case 'MESSAGES_UPDATE':
        return handleMessageUpdate(payload)
      
      case 'MESSAGES_REACTION':
        return handleMessageReaction(payload)
      
      case 'CONNECTION_UPDATE':
        return handleConnectionUpdate(payload)
      
      case 'QRCODE_UPDATED':
        return handleQRCodeUpdate(payload)
      
      default:
        console.log('Unhandled event type:', event, '(original:', payload.event, ')')
        return NextResponse.json({ ok: true })
    }
  } catch (error) {
    console.error('Error processing Evolution webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleMessageUpsert(payload: any) {
  try {
    // CORRECAO: instance esta no root do payload
    const instance = payload.instance
    const data = payload.data
    
    console.log(`Message received for instance: ${instance}`)
    
    // Ignorar mensagens de grupo
    if (data.key?.remoteJid?.includes('@g.us')) {
      return NextResponse.json({ ok: true, skipped: 'group_message' })
    }

    // Ignorar mensagens enviadas por nós
    if (data.key?.fromMe) {
      return NextResponse.json({ ok: true, skipped: 'own_message' })
    }

    // Ignorar mensagens de status
    if (data.key?.remoteJid === 'status@broadcast') {
      return NextResponse.json({ ok: true, skipped: 'status_message' })
    }

    // Extrair dados da mensagem
    const phone = data.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
    const remoteJid = data.key?.remoteJid || ''
    const pushName = data.pushName || null
    const messageId = data.key?.id || ''
    
    // Extrair conteúdo da mensagem
    let content = ''
    let mediaUrl = null
    let mediaType: MediaType | null = null
    let shouldProcessMedia = false

    if (data.message?.conversation) {
      content = data.message.conversation
    } else if (data.message?.extendedTextMessage?.text) {
      content = data.message.extendedTextMessage.text
    } else if (data.message?.imageMessage) {
      content = data.message.imageMessage.caption || ''
      mediaType = 'image'
      shouldProcessMedia = true
    } else if (data.message?.audioMessage) {
      content = ''
      mediaType = 'audio'
      shouldProcessMedia = true
    } else if (data.message?.documentMessage) {
      content = ''
      mediaType = 'document'
      shouldProcessMedia = true
    } else if (data.message?.videoMessage) {
      content = data.message.videoMessage.caption || '[🎬 Vídeo recebido]'
      mediaType = 'video'
    } else if (data.message?.stickerMessage) {
      content = '[😊 Sticker recebido]'
      mediaType = 'sticker'
    } else if (data.message?.locationMessage) {
      const loc = data.message.locationMessage
      content = `[📍 Localização: ${loc.degreesLatitude}, ${loc.degreesLongitude}]`
    } else if (data.message?.contactMessage) {
      content = `[👤 Contato: ${data.message.contactMessage.displayName}]`
    }

    // Processar mídia se necessário (imagem, áudio, documento)
    if (shouldProcessMedia && mediaType && messageId) {
      try {
        console.log(`Processing ${mediaType} from message ${messageId}`)
        const evolution = getEvolutionProvider()
        
        // Baixar mídia em base64
        const mediaData = await evolution.getMediaBase64(messageId, remoteJid)
        
        if (mediaData?.base64) {
          // Processar mídia com IA
          const result = await processMedia(mediaType, mediaData.base64, mediaData.mimetype, {
            caption: data.message?.imageMessage?.caption || data.message?.videoMessage?.caption,
            fileName: data.message?.documentMessage?.fileName
          })
          
          content = result.content
          console.log(`Media processed: ${content.substring(0, 100)}...`)
        } else {
          // Fallback se não conseguir baixar
          content = mediaType === 'image' ? '[📷 Imagem recebida]' 
            : mediaType === 'audio' ? '[🎤 Áudio recebido]'
            : `[📎 ${data.message?.documentMessage?.fileName || 'Documento'} recebido]`
        }
      } catch (mediaError) {
        console.error('Error processing media:', mediaError)
        // Fallback
        content = mediaType === 'image' 
          ? (data.message?.imageMessage?.caption || '[📷 Imagem recebida]')
          : mediaType === 'audio' ? '[🎤 Áudio recebido]'
          : `[📎 ${data.message?.documentMessage?.fileName || 'Documento'} recebido]`
      }
    }

    // Detectar links externos na mensagem (Shopify, Yampi, tracking)
    const detectedLinks = detectLinks(content)
    const linkContext = generateLinkContext(content)
    
    // Adicionar contexto de links ao conteúdo (se houver)
    if (linkContext) {
      content = `${content}\n\n${linkContext}`
      console.log(`Links detected: ${detectedLinks.map(l => l.type).join(', ')}`)
    }

    // Se não conseguiu extrair conteúdo, ignorar
    if (!content || !phone) {
      console.log('No content or phone extracted, skipping')
      return NextResponse.json({ ok: true, skipped: 'no_content' })
    }

    console.log(`Processing message from ${phone}: ${content.substring(0, 50)}...`)

    // Upsert lead
    const lead = await upsertLead(phone, pushName, 'whatsapp')
    if (!lead) {
      console.error('Failed to upsert lead')
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(lead.id)
    if (!conversation) {
      console.error('Failed to get/create conversation')
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Salvar mensagem inbound
    const { error: messageError } = await getSupabase().from('dc_messages').insert({
      conversation_id: conversation.id,
      lead_id: lead.id,
      direction: 'inbound',
      sender_type: 'lead',
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      wpp_message_id: messageId,
      metadata: { raw_message: data.message }
    })

    if (messageError) {
      console.error('Error saving message:', messageError)
    }

    // Atualizar métricas
    const today = new Date().toISOString().split('T')[0]
    try {
      await getSupabase().from('dc_agent_metrics').upsert({
        date: today,
        total_messages_in: 1
      }, { onConflict: 'date' })
    } catch {
      // Ignore metrics error
    }

    // Verificar se a conversa está aguardando feedback (resposta à pergunta "o que estava errado?")
    const awaitingFeedback = await isAwaitingFeedback(conversation.id)
    
    if (awaitingFeedback) {
      // Verificar whitelist antes de processar resposta de feedback
      const feedbackWhitelist = process.env.FEEDBACK_WHITELIST?.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
        || process.env.WHATSAPP_WHITELIST?.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
      
      let isWhitelistedForFeedback = true
      if (feedbackWhitelist && feedbackWhitelist.length > 0) {
        const cleanPhone = phone.replace(/\D/g, '')
        isWhitelistedForFeedback = feedbackWhitelist.some(allowed => 
          cleanPhone.endsWith(allowed) || allowed.endsWith(cleanPhone) || cleanPhone === allowed
        )
      }
      
      if (isWhitelistedForFeedback) {
        console.log(`Conversation ${conversation.id} is awaiting feedback, processing response from whitelisted number`)
        
        // Processar como resposta de feedback
        setImmediate(async () => {
          try {
            await processFeedbackResponse(conversation.id, content)
          } catch (error) {
            console.error('Error processing feedback response:', error)
          }
        })
        
        return NextResponse.json({ 
          ok: true, 
          lead_id: lead.id, 
          conversation_id: conversation.id,
          processed_as: 'feedback_response'
        })
      } else {
        console.log(`Conversation ${conversation.id} awaiting feedback but ${phone} not whitelisted - treating as normal message`)
        // Restaurar status da conversa e continuar processamento normal
        await getSupabase()
          .from('dc_conversations')
          .update({ status: 'active' })
          .eq('id', conversation.id)
      }
    }

    // Adicionar ao buffer de mensagens (processa após 3s de inatividade)
    // Isso agrupa mensagens enviadas em sequência
    setImmediate(() => {
      try {
        bufferMessage(lead, conversation, content, mediaType || undefined)
      } catch (error) {
        console.error('Error buffering message:', error)
      }
    })

    return NextResponse.json({ ok: true, lead_id: lead.id, conversation_id: conversation.id })

  } catch (error) {
    console.error('Error handling message upsert:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

async function handleConnectionUpdate(payload: any) {
  try {
    // CORRECAO: instance esta no root do payload, state em data
    const instance = payload.instance
    const state = payload.data?.state
    
    console.log(`Connection update for ${instance}: ${state}`)

    if (!instance) {
      console.log('No instance in payload, skipping')
      return NextResponse.json({ ok: true })
    }

    const statusMap: Record<string, string> = {
      'open': 'connected',
      'close': 'disconnected',
      'connecting': 'connecting'
    }

    const status = statusMap[state] || state

    // CORRECAO: Preparar dados para atualização
    const updateData: Record<string, any> = {
      instance_name: instance,
      status,
    }

    // CORRECAO: Quando conectado, limpar QR code e salvar timestamp
    if (status === 'connected') {
      updateData.qr_code = null // Limpar QR code
      updateData.connected_at = new Date().toISOString()
      
      // Tentar extrair phone_number se disponível
      // Evolution API pode enviar ownerJid no formato 5511999999999@s.whatsapp.net
      const ownerJid = payload.data?.ownerJid || payload.data?.owner?.id
      if (ownerJid) {
        updateData.phone_number = ownerJid.replace('@s.whatsapp.net', '')
      }
      
      console.log(`Instance ${instance} connected! Phone: ${updateData.phone_number || 'unknown'}`)
    }

    // Quando desconectado, também limpar QR code
    if (status === 'disconnected') {
      updateData.qr_code = null
      updateData.connected_at = null
    }

    await getSupabase()
      .from('dc_whatsapp_connections')
      .upsert(updateData, { onConflict: 'instance_name' })

    return NextResponse.json({ ok: true, status })

  } catch (error) {
    console.error('Error handling connection update:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}

async function handleQRCodeUpdate(payload: any) {
  try {
    // CORRECAO: instance esta no root do payload
    const instance = payload.instance
    // O qrcode pode estar em data.qrcode ou diretamente em data
    const qrcode = payload.data?.qrcode || payload.data
    
    console.log(`QR Code update for ${instance}`)

    if (!instance) {
      console.log('No instance in payload, skipping')
      return NextResponse.json({ ok: true })
    }

    if (!qrcode?.base64) {
      console.log('No qrcode.base64 in payload, skipping')
      return NextResponse.json({ ok: true })
    }

    // CORRECAO: Normalizar base64 (remover prefixo data:image se existir)
    const normalizedBase64 = qrcode.base64.replace(/^data:image\/[^;]+;base64,/, '')

    await getSupabase()
      .from('dc_whatsapp_connections')
      .upsert({
        instance_name: instance,
        qr_code: normalizedBase64,
        status: 'connecting'
      }, { onConflict: 'instance_name' })

    console.log(`QR Code saved for ${instance} (${normalizedBase64.substring(0, 50)}...)`)

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error handling QR code update:', error)
    return NextResponse.json({ error: 'Failed to update QR code' }, { status: 500 })
  }
}

// =====================================================
// HANDLER DE MESSAGES_UPDATE (pode conter reações)
// =====================================================

async function handleMessageUpdate(payload: any) {
  try {
    const instance = payload.instance
    const data = payload.data
    
    console.log(`[MESSAGES_UPDATE] Received for instance: ${instance}`, JSON.stringify(data, null, 2))
    
    // MESSAGES_UPDATE pode vir em diferentes formatos:
    // Formato 1: Array de updates
    // Formato 2: Objeto único com update
    
    const updates = Array.isArray(data) ? data : [data]
    
    for (const update of updates) {
      // Verificar se é uma reação
      // Formato Evolution: update.reactions ou update.update.reactions
      const reactions = update?.reactions || update?.update?.reactions
      
      if (reactions && reactions.length > 0) {
        console.log(`[MESSAGES_UPDATE] Detected ${reactions.length} reaction(s)`)
        
        for (const reaction of reactions) {
          // Extrair dados da reação
          const reactionEmoji = reaction?.text || reaction?.reaction?.text
          const reactedMessageKey = reaction?.key || update?.key
          const reactedMessageId = reactedMessageKey?.id
          const phone = (reactedMessageKey?.remoteJid || '')?.replace('@s.whatsapp.net', '')
          const fromMe = reaction?.key?.fromMe || reactedMessageKey?.fromMe
          
          // Ignorar reações que nós mesmos enviamos
          if (fromMe) {
            console.log('[MESSAGES_UPDATE] Ignoring own reaction')
            continue
          }
          
          if (reactionEmoji && reactedMessageId) {
            console.log(`[MESSAGES_UPDATE] Processing reaction: ${reactionEmoji} on message ${reactedMessageId}`)
            
            // Criar payload compatível com handleMessageReaction
            const reactionPayload = {
              instance,
              data: {
                reaction: {
                  text: reactionEmoji,
                  key: reactedMessageKey
                },
                key: reactedMessageKey
              }
            }
            
            // Delegar para o handler de reações
            await handleMessageReaction(reactionPayload)
          }
        }
        
        return NextResponse.json({ ok: true, processed: 'reactions' })
      }
      
      // Se não é reação, pode ser outro tipo de update (status de leitura, etc)
      // Por enquanto, apenas logamos
      console.log(`[MESSAGES_UPDATE] Non-reaction update, ignoring`)
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('[MESSAGES_UPDATE] Error:', error)
    return NextResponse.json({ error: 'Failed to process message update' }, { status: 500 })
  }
}

// =====================================================
// HANDLER DE REAÇÕES (FEEDBACK)
// =====================================================

// Emojis que indicam feedback negativo
const NEGATIVE_REACTIONS = ['❌', '👎', '😠', '😡', '🚫', '👎🏻', '👎🏼', '👎🏽', '👎🏾', '👎🏿']

// Emojis que indicam feedback positivo
const POSITIVE_REACTIONS = ['✅', '👍', '😊', '🙏', '💚', '❤️', '💙', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿', '🤝']

async function handleMessageReaction(payload: any) {
  try {
    const instance = payload.instance
    const data = payload.data
    
    console.log(`Reaction received for instance: ${instance}`, JSON.stringify(data))
    
    // Extrair dados da reação - formato pode variar conforme Evolution API
    // Formato 1: data.reaction.text e data.key
    // Formato 2: data.reactionMessage
    const reactionEmoji = data?.reaction?.text || 
                          data?.reactionMessage?.text || 
                          data?.text ||
                          null
    
    const reactedMessageId = data?.key?.id || 
                              data?.reactionMessage?.key?.id ||
                              data?.reaction?.key?.id ||
                              null
    
    const phone = (data?.key?.remoteJid || 
                   data?.reactionMessage?.key?.remoteJid ||
                   data?.reaction?.key?.remoteJid ||
                   '')?.replace('@s.whatsapp.net', '')
    
    if (!reactionEmoji || !reactedMessageId) {
      console.log('No reaction emoji or message ID found, skipping')
      return NextResponse.json({ ok: true, skipped: 'no_reaction_data' })
    }
    
    // =====================================================
    // VERIFICAÇÃO DE WHITELIST - Apenas números autorizados
    // podem usar o sistema de feedback para correções
    // =====================================================
    const feedbackWhitelist = process.env.FEEDBACK_WHITELIST?.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
      || process.env.WHATSAPP_WHITELIST?.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
    
    if (feedbackWhitelist && feedbackWhitelist.length > 0) {
      const cleanPhone = phone.replace(/\D/g, '')
      const isWhitelisted = feedbackWhitelist.some(allowed => 
        cleanPhone.endsWith(allowed) || allowed.endsWith(cleanPhone) || cleanPhone === allowed
      )
      
      if (!isWhitelisted) {
        console.log(`[FEEDBACK WHITELIST] Número ${phone} não autorizado para feedback - ignorando reação`)
        return NextResponse.json({ ok: true, skipped: 'not_whitelisted_for_feedback' })
      }
      
      console.log(`[FEEDBACK WHITELIST] Número ${phone} autorizado para feedback`)
    }
    
    console.log(`Processing reaction ${reactionEmoji} from ${phone} on message ${reactedMessageId}`)
    
    // Verificar se é reação negativa ou positiva
    const isNegative = NEGATIVE_REACTIONS.includes(reactionEmoji)
    const isPositive = POSITIVE_REACTIONS.includes(reactionEmoji)
    
    if (!isNegative && !isPositive) {
      console.log(`Reaction ${reactionEmoji} is not a feedback reaction, skipping`)
      return NextResponse.json({ ok: true, skipped: 'not_feedback_reaction' })
    }
    
    // Buscar a mensagem original pelo wpp_message_id
    const { data: message, error: messageError } = await getSupabase()
      .from('dc_messages')
      .select('*, conversation:conversation_id(*), lead:lead_id(*)')
      .eq('wpp_message_id', reactedMessageId)
      .single()
    
    if (messageError || !message) {
      console.log('Message not found for reaction:', reactedMessageId)
      return NextResponse.json({ ok: true, skipped: 'message_not_found' })
    }
    
    // Só processar reações em mensagens do agente (outbound)
    if (message.direction !== 'outbound') {
      console.log('Reaction on non-agent message, skipping')
      return NextResponse.json({ ok: true, skipped: 'not_agent_message' })
    }
    
    const reactionType = isNegative ? 'negative' : 'positive'
    
    // Registrar o feedback
    const { error: feedbackError } = await getSupabase()
      .from('dc_message_feedback')
      .insert({
        message_id: message.id,
        conversation_id: message.conversation_id,
        lead_id: message.lead_id,
        reaction: reactionType,
        reaction_emoji: reactionEmoji,
        original_content: message.content,
        wpp_message_id: reactedMessageId,
        status: isNegative ? 'awaiting_response' : 'applied' // Negativo precisa de resposta
      })
    
    if (feedbackError) {
      console.error('Error saving feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }
    
    // Se for feedback negativo, perguntar o que está errado
    if (isNegative && phone) {
      const evolution = getEvolutionProvider()
      
      // Marcar conversa como aguardando feedback
      await getSupabase()
        .from('dc_conversations')
        .update({ status: 'awaiting_feedback' })
        .eq('id', message.conversation_id)
      
      // Enviar mensagem perguntando o que está errado
      try {
        await evolution.sendText(
          phone,
          'Percebi que essa resposta não ficou adequada. 🙏\n\nPode me explicar o que estava errado? Vou corrigir para melhorar nosso atendimento!'
        )
      } catch (sendError) {
        console.error('Error sending feedback question:', sendError)
      }
    }
    
    console.log(`Feedback ${reactionType} registered for message ${reactedMessageId}`)
    
    return NextResponse.json({ 
      ok: true, 
      feedback_type: reactionType,
      message_id: message.id 
    })
    
  } catch (error) {
    console.error('Error handling message reaction:', error)
    return NextResponse.json({ error: 'Failed to process reaction' }, { status: 500 })
  }
}

// Permitir GET para health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'evolution-webhook',
    timestamp: new Date().toISOString(),
    supported_events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_REACTION', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
  })
}
