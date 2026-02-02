import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { getOrCreateConversation } from '@/lib/services/agent.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, message, lead_id } = body

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      )
    }

    const evolution = getEvolutionProvider()
    const adminSupabase = createAdminClient()

    // Enviar mensagem via Evolution
    await evolution.sendText(phone, message)

    // Se temos lead_id, salvar mensagem no histórico
    if (lead_id) {
      const conversation = await getOrCreateConversation(lead_id)
      
      if (conversation) {
        await adminSupabase.from('dc_messages').insert({
          conversation_id: conversation.id,
          lead_id: lead_id,
          direction: 'outbound',
          sender_type: 'human',
          content: message
        })

        // Se a conversa estava aguardando humano, marcar como ativa
        if (conversation.status === 'waiting_human') {
          await adminSupabase
            .from('dc_conversations')
            .update({ status: 'active' })
            .eq('id', conversation.id)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    )
  }
}
