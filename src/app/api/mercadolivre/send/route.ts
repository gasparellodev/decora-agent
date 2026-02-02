import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage } from '@/lib/providers/mercadolivre'

const ML_MAX_CHARS = 350

/**
 * POST /api/mercadolivre/send
 * Envia mensagem para um comprador no Mercado Livre
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { packId, buyerId, message, conversationId } = body

    // Validações
    if (!packId) {
      return NextResponse.json(
        { error: 'packId é obrigatório' },
        { status: 400 }
      )
    }

    if (!buyerId) {
      return NextResponse.json(
        { error: 'buyerId é obrigatório' },
        { status: 400 }
      )
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Mensagem não pode estar vazia' },
        { status: 400 }
      )
    }

    // Validar limite de caracteres
    if (message.length > ML_MAX_CHARS) {
      return NextResponse.json(
        { error: `Mensagem excede o limite de ${ML_MAX_CHARS} caracteres` },
        { status: 400 }
      )
    }

    // Enviar mensagem via API do ML
    const result = await sendMessage(packId, buyerId, message)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar mensagem' },
        { status: 500 }
      )
    }

    // Salvar mensagem no histórico
    const supabase = createAdminClient()
    
    await supabase.from('dc_ml_messages').insert({
      conversation_id: conversationId,
      pack_id: packId,
      direction: 'outbound',
      sender_type: 'human',
      content: message
    })

    // Atualizar timestamp da conversa
    if (conversationId) {
      await supabase
        .from('dc_ml_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso'
    })
  } catch (error) {
    console.error('[ML Send] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
