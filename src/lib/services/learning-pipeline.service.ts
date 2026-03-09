import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertKnowledgeEmbedding, type KnowledgeSource } from './embedding.service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

function getSupabase() { return createAdminClient() }

interface ConversationInsight {
  type: 'faq' | 'objection' | 'scenario' | 'preference'
  title: string
  content: string
  metadata: Record<string, unknown>
}

export async function extractConversationInsights(conversationId: string): Promise<ConversationInsight[]> {
  try {
    const { data: messages } = await getSupabase()
      .from('dc_messages')
      .select('direction, sender_type, content, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })

    if (!messages || messages.length < 5) return []

    const conversationText = messages
      .map(m => `${m.direction === 'inbound' ? 'Cliente' : 'Ana'}: ${m.content}`)
      .join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Analise esta conversa de atendimento da Decora Esquadrias (janelas de alumínio) e extraia insights úteis para a base de conhecimento.

Extraia APENAS insights que sejam NOVOS e ÚTEIS. Ignore perguntas básicas já cobertas por FAQ padrão.

Tipos de insight:
- faq: Pergunta nova que o cliente fez que pode ser útil para futuros atendimentos
- objection: Objeção do cliente e como foi resolvida com sucesso
- scenario: Cenário específico de instalação (drywall, container, laje, etc.)
- preference: Padrão de preferência (ex: "clientes de banheiro preferem mini boreal")

Responda em JSON:
{
  "insights": [
    {
      "type": "faq|objection|scenario|preference",
      "title": "título curto e descritivo",
      "content": "conteúdo completo do insight, incluindo pergunta e resposta quando aplicável",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Se não houver insights novos, retorne: {"insights": []}`
        },
        {
          role: 'user',
          content: conversationText.substring(0, 4000)
        }
      ]
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{"insights": []}')
    return (result.insights || []).map((i: { type: string; title: string; content: string; tags?: string[] }) => ({
      type: i.type,
      title: i.title,
      content: i.content,
      metadata: { tags: i.tags || [], conversationId }
    }))
  } catch (error) {
    console.error('[Learning] Error extracting insights:', error)
    return []
  }
}

export function shouldLearn(conversation: { message_count: number; tools_used: boolean; duration_minutes: number }): boolean {
  return conversation.message_count >= 5 && conversation.tools_used
}

export async function processCompletedConversations(date: string): Promise<{
  processed: number
  insightsExtracted: number
  errors: number
}> {
  let processed = 0
  let insightsExtracted = 0
  let errors = 0

  try {
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Buscar conversas finalizadas no dia
    const { data: conversations } = await getSupabase()
      .from('dc_conversations')
      .select('id')
      .in('status', ['closed', 'archived'])
      .gte('closed_at', startOfDay)
      .lte('closed_at', endOfDay)

    if (!conversations || conversations.length === 0) {
      return { processed: 0, insightsExtracted: 0, errors: 0 }
    }

    // Verificar quais já foram processadas
    const { data: alreadyProcessed } = await getSupabase()
      .from('dc_learning_log')
      .select('conversation_id')
      .in('conversation_id', conversations.map(c => c.id))

    const processedIds = new Set(alreadyProcessed?.map(p => p.conversation_id) || [])
    const toProcess = conversations.filter(c => !processedIds.has(c.id))

    for (const conv of toProcess) {
      try {
        // Verificar se a conversa tem mensagens suficientes
        const { count } = await getSupabase()
          .from('dc_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        if (!count || count < 5) {
          await logProcessing(conv.id, 0, 'skipped_short')
          continue
        }

        const insights = await extractConversationInsights(conv.id)

        for (const insight of insights) {
          const sourceMap: Record<string, KnowledgeSource> = {
            faq: 'conversation_insight',
            objection: 'conversation_insight',
            scenario: 'conversation_insight',
            preference: 'conversation_insight'
          }

          await upsertKnowledgeEmbedding({
            source: sourceMap[insight.type] || 'conversation_insight',
            sourceId: conv.id,
            title: insight.title,
            content: insight.content,
            metadata: { ...insight.metadata, insightType: insight.type }
          })
          insightsExtracted++
        }

        await logProcessing(conv.id, insights.length, 'completed')
        processed++

        // Rate limiting
        await new Promise(r => setTimeout(r, 500))
      } catch (error) {
        console.error(`[Learning] Error processing conversation ${conv.id}:`, error)
        await logProcessing(conv.id, 0, 'error', error instanceof Error ? error.message : 'Unknown error')
        errors++
      }
    }
  } catch (error) {
    console.error('[Learning] Error in processCompletedConversations:', error)
    errors++
  }

  return { processed, insightsExtracted, errors }
}

async function logProcessing(conversationId: string, insightsCount: number, status: string, errorMessage?: string) {
  await getSupabase()
    .from('dc_learning_log')
    .insert({
      conversation_id: conversationId,
      insights_extracted: insightsCount,
      processing_status: status,
      error_message: errorMessage || null
    })
}
