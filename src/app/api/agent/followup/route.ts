import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionProvider } from '@/lib/providers/evolution'
import { followUpPrompt } from '@/lib/ai/prompts/sales-agent'
import { getOrCreateConversation } from '@/lib/services/agent.service'
import { truncateMessage } from '@/lib/utils/whatsapp-formatter'

function getSupabase() { return createAdminClient() }
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

function isBusinessHours(): boolean {
  const now = new Date()
  const brTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const day = brTime.getDay()
  const hour = brTime.getHours()

  if (day === 0) return false // domingo
  if (day === 6) return hour >= 9 && hour < 13 // sabado 9-13
  return hour >= 9 && hour < 18 // seg-sex 9-18
}

function getNextBusinessHour(): Date {
  const now = new Date()
  const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const next = new Date(brNow)

  next.setHours(10, 0, 0, 0)

  if (brNow.getHours() >= 18 || (brNow.getDay() === 6 && brNow.getHours() >= 13)) {
    next.setDate(next.getDate() + 1)
  }

  // Pular domingo
  while (next.getDay() === 0) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Processing follow-ups...')

    if (!isBusinessHours()) {
      const nextHour = getNextBusinessHour()
      console.log(`Outside business hours. Next window: ${nextHour.toISOString()}`)

      // Reagendar follow-ups pendentes para o próximo horário comercial
      await getSupabase()
        .from('dc_follow_ups')
        .update({ scheduled_for: nextHour.toISOString() })
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())

      return NextResponse.json({
        processed: 0,
        message: 'Outside business hours, rescheduled',
        next_window: nextHour.toISOString()
      })
    }

    const { data: followUps, error } = await getSupabase()
      .from('dc_follow_ups')
      .select(`
        *,
        lead:dc_leads(*),
        order:dc_orders(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempt_count', 3)
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (error) throw error

    if (!followUps || followUps.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending follow-ups' })
    }

    const evolution = getEvolutionProvider()
    let processed = 0
    let failed = 0

    for (const followUp of followUps as any[]) {
      try {
        // Verificar se o lead ainda existe
        if (!followUp.lead) {
          await getSupabase()
            .from('dc_follow_ups')
            .update({ status: 'cancelled' })
            .eq('id', followUp.id)
          continue
        }

        // Para carrinho abandonado com desconto, usar mensagem específica
        let message = followUp.message_template

        if (!message) {
          if (followUp.type === 'abandoned_cart') {
            const context = followUp.context_json as any
            const discount = context?.discount_offered || 0
            const items = context?.items || []
            const total = context?.total || 0

            if (discount > 0) {
              message = `Olá ${followUp.lead.name || ''}! 👋

Vi que você deixou alguns itens no carrinho:
${items.map((i: any) => `• ${i.name || i.title}`).join('\n')}

🎁 *Oferta especial:* Finalize sua compra agora e ganhe *${discount}% de desconto*!

💰 De R$ ${total.toFixed(2)} por *R$ ${(total * (1 - discount/100)).toFixed(2)}*

Posso te ajudar a finalizar? 😊`
            } else {
              message = `Olá ${followUp.lead.name || ''}! 👋

Notei que você estava olhando nossas janelas mas não finalizou a compra.

Ficou com alguma dúvida? Posso te ajudar a escolher o modelo ideal! 

É só me mandar uma mensagem. 😊`
            }
          } else {
            // Gerar mensagem com IA para outros tipos
            const prompt = followUpPrompt(followUp.type, followUp.lead, followUp.context_json as Record<string, unknown>)
            
            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              max_tokens: 300,
              messages: [{ role: 'user', content: prompt }]
            })

            message = response.choices[0]?.message?.content || ''
          }
        }

        if (!message) {
          console.error(`No message generated for follow-up ${followUp.id}`)
          continue
        }

        message = truncateMessage(message, 350)

        // Enviar mensagem via WhatsApp
        await evolution.sendText(followUp.lead.phone, message)

        // Atualizar follow-up como enviado
        await getSupabase()
          .from('dc_follow_ups')
          .update({
            status: 'sent',
            executed_at: new Date().toISOString(),
            attempt_count: followUp.attempt_count + 1
          })
          .eq('id', followUp.id)

        // Salvar mensagem no histórico
        const conversation = await getOrCreateConversation(followUp.lead.id)
        if (conversation) {
          await getSupabase().from('dc_messages').insert({
            conversation_id: conversation.id,
            lead_id: followUp.lead.id,
            direction: 'outbound',
            sender_type: 'system',
            content: message,
            metadata: {
              follow_up_id: followUp.id,
              follow_up_type: followUp.type
            }
          })
        }

        // Atualizar métricas
        const today = new Date().toISOString().split('T')[0]
        try {
          await getSupabase().from('dc_agent_metrics').upsert({
            date: today,
            total_followups_sent: 1
          }, { onConflict: 'date' })
        } catch {
          // Ignore metrics error
        }

        processed++
        console.log(`Follow-up ${followUp.id} sent to ${followUp.lead.phone}`)

      } catch (error) {
        console.error(`Error processing follow-up ${followUp.id}:`, error)
        
        // Incrementar tentativa
        await getSupabase()
          .from('dc_follow_ups')
          .update({ attempt_count: followUp.attempt_count + 1 })
          .eq('id', followUp.id)
        
        failed++
      }
    }

    return NextResponse.json({
      processed,
      failed,
      total: followUps.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in follow-up cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Permitir GET para health check
export async function GET() {
  // Retornar contagem de follow-ups pendentes
  const { count } = await getSupabase()
    .from('dc_follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  return NextResponse.json({
    status: 'ok',
    service: 'follow-up-cron',
    pending_followups: count || 0,
    timestamp: new Date().toISOString()
  })
}
