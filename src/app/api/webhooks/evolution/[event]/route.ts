import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateConversation, upsertLead } from '@/lib/services/agent.service'
import { bufferMessage } from '@/lib/services/message-buffer.service'
import { processMedia, MediaType } from '@/lib/services/media-processor.service'
import { getEvolutionProvider } from '@/lib/providers/evolution'

/**
 * Rota dinâmica para webhooks da Evolution API quando "Webhook by Events" está ativado
 * Captura URLs como:
 * - /api/webhooks/evolution/messages-upsert
 * - /api/webhooks/evolution/connection-update
 * - /api/webhooks/evolution/qrcode-updated
 */

function getSupabase() {
  return createAdminClient()
}

// Mapear nomes de eventos para formato normalizado
const eventNameMap: Record<string, string> = {
  // Formato da URL (kebab-case)
  'messages-upsert': 'MESSAGES_UPSERT',
  'connection-update': 'CONNECTION_UPDATE',
  'qrcode-updated': 'QRCODE_UPDATED',
  // Formato com underscore
  'messages_upsert': 'MESSAGES_UPSERT',
  'connection_update': 'CONNECTION_UPDATE',
  'qrcode_updated': 'QRCODE_UPDATED',
  // Formato da Evolution API v2 (com ponto)
  'messages.upsert': 'MESSAGES_UPSERT',
  'connection.update': 'CONNECTION_UPDATE',
  'qrcode.updated': 'QRCODE_UPDATED',
}

// Função para normalizar o nome do evento
function normalizeEventName(eventName: string): string {
  const lowercased = eventName.toLowerCase()
  return eventNameMap[lowercased] || eventName.toUpperCase().replace(/[.-]/g, '_')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ event: string }> }
) {
  try {
    const { event: eventParam } = await params
    const payload = await request.json()
    
    // Determinar o tipo de evento pela URL ou pelo payload
    const eventFromUrl = normalizeEventName(eventParam)
    // Normalizar também o evento que vem no payload
    const eventFromPayload = payload.event ? normalizeEventName(payload.event) : null
    const event = eventFromPayload || eventFromUrl
    
    console.log(`Evolution webhook [${eventParam}] received:`, JSON.stringify({
      event,
      originalEvent: payload.event,
      eventFromUrl,
      instance: payload.instance,
      dataKeys: payload.data ? Object.keys(payload.data) : null
    }))

    // Adicionar o evento normalizado ao payload
    const normalizedPayload = {
      ...payload,
      event
    }

    switch (event) {
      case 'MESSAGES_UPSERT':
        return handleMessageUpsert(normalizedPayload)
      
      case 'CONNECTION_UPDATE':
        return handleConnectionUpdate(normalizedPayload)
      
      case 'QRCODE_UPDATED':
        return handleQRCodeUpdate(normalizedPayload)
      
      default:
        console.log('Unhandled event type:', event, '(original:', payload.event, ')')
        return NextResponse.json({ ok: true, event, skipped: 'unhandled_event' })
    }
  } catch (error) {
    console.error('Error processing Evolution webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleMessageUpsert(payload: any) {
  try {
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

    // ===== FILTRO DE WHITELIST (MODO TESTE) =====
    const whitelist = process.env.WHATSAPP_WHITELIST?.split(',').map(n => n.trim()).filter(Boolean)
    if (whitelist && whitelist.length > 0) {
      // Normalizar numero (remover caracteres nao numericos)
      const normalizedPhone = phone.replace(/\D/g, '')
      const isWhitelisted = whitelist.some(allowed => 
        normalizedPhone.endsWith(allowed) || allowed.endsWith(normalizedPhone)
      )
      
      if (!isWhitelisted) {
        console.log(`[WHITELIST] Numero ${phone} bloqueado - nao esta na whitelist`)
        return NextResponse.json({ ok: true, skipped: 'not_whitelisted' })
      }
      console.log(`[WHITELIST] Numero ${phone} autorizado`)
    }
    // ===== FIM FILTRO DE WHITELIST =====
    
    // Extrair conteúdo da mensagem
    let content = ''
    let mediaType: MediaType | null = null
    let caption: string | undefined
    let fileName: string | undefined
    let shouldProcessMedia = false

    if (data.message?.conversation) {
      content = data.message.conversation
    } else if (data.message?.extendedTextMessage?.text) {
      content = data.message.extendedTextMessage.text
    } else if (data.message?.imageMessage) {
      caption = data.message.imageMessage.caption
      content = caption || '[Imagem recebida]'
      mediaType = 'image'
      shouldProcessMedia = true
    } else if (data.message?.audioMessage) {
      content = '[Áudio recebido]'
      mediaType = 'audio'
      shouldProcessMedia = true
    } else if (data.message?.documentMessage) {
      fileName = data.message.documentMessage.fileName
      content = fileName || '[Documento recebido]'
      mediaType = 'document'
      shouldProcessMedia = true
    } else if (data.message?.videoMessage) {
      caption = data.message.videoMessage.caption
      content = caption || '[Vídeo recebido]'
      mediaType = 'video'
    } else if (data.message?.stickerMessage) {
      content = '[Sticker recebido]'
      mediaType = 'sticker'
    } else if (data.message?.locationMessage) {
      const loc = data.message.locationMessage
      content = `[Localização: ${loc.degreesLatitude}, ${loc.degreesLongitude}]`
    } else if (data.message?.contactMessage) {
      content = `[Contato: ${data.message.contactMessage.displayName}]`
    }

    // Processar mídia se necessário (imagem, áudio, documento)
    console.log(`[DEBUG] shouldProcessMedia=${shouldProcessMedia}, mediaType=${mediaType}, messageId=${messageId ? 'exists' : 'missing'}, remoteJid=${remoteJid ? 'exists' : 'missing'}`)
    
    if (shouldProcessMedia && mediaType && messageId && remoteJid) {
      console.log(`[MEDIA] Starting ${mediaType} processing from ${phone}...`)
      try {
        const evolution = getEvolutionProvider()
        console.log(`[MEDIA] Downloading media with messageId=${messageId}`)
        
        const mediaData = await evolution.getMediaBase64(messageId, remoteJid)
        
        if (mediaData?.base64 && mediaData?.mimetype) {
          console.log(`[MEDIA] Downloaded: ${mediaData.mimetype}, size: ${mediaData.base64.length} chars`)
          
          const result = await processMedia(mediaType, mediaData.base64, mediaData.mimetype, {
            caption,
            fileName
          })
          
          content = result.content
          console.log(`[MEDIA] Processed successfully: ${content.substring(0, 150)}...`)
        } else {
          console.error(`[MEDIA] Failed to download: base64=${!!mediaData?.base64}, mimetype=${mediaData?.mimetype}`)
        }
      } catch (mediaError) {
        console.error('[MEDIA] Error processing media:', mediaError)
        // Mantém o content original se falhar
      }
    } else if (mediaType && !shouldProcessMedia) {
      console.log(`[MEDIA] Skipping processing for ${mediaType} (shouldProcessMedia=false)`)
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

    // Adicionar ao buffer de mensagens (não bloqueia o webhook)
    // O buffer aguarda 3s para agrupar mensagens consecutivas antes de processar
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

    const updateData: Record<string, any> = {
      instance_name: instance,
      status,
    }

    if (status === 'connected') {
      updateData.qr_code = null
      updateData.connected_at = new Date().toISOString()
      
      const ownerJid = payload.data?.ownerJid || payload.data?.owner?.id
      if (ownerJid) {
        updateData.phone_number = ownerJid.replace('@s.whatsapp.net', '')
      }
      
      console.log(`Instance ${instance} connected! Phone: ${updateData.phone_number || 'unknown'}`)
    }

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
    const instance = payload.instance
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

// Health check
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ event: string }> }
) {
  const { event } = await params
  return NextResponse.json({ 
    status: 'ok', 
    service: 'evolution-webhook',
    event_route: event,
    timestamp: new Date().toISOString()
  })
}
