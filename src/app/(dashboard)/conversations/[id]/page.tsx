'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Bot, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function ConversationDetailPage() {
  const params = useParams()
  const conversationId = params?.id as string
  const supabase = createClient()
  const [conversation, setConversation] = useState<any>(null)
  const [lead, setLead] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conversationId) return
    const load = async () => {
      try {
        const { data: conv } = await supabase
          .from('dc_conversations')
          .select('*, lead:dc_leads(*)')
          .eq('id', conversationId)
          .single()

        const { data: msgs } = await supabase
          .from('dc_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: true })

        setConversation(conv)
        setLead(conv?.lead || null)
        setMessages(msgs || [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [conversationId, supabase])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando conversa...</div>
  }

  if (!conversation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/conversations">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">Conversa não encontrada.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/conversations">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Conversas
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{lead?.name || lead?.phone || 'Conversa'}</h1>
          <p className="text-sm text-muted-foreground">{lead?.phone}</p>
        </div>
        <span className="text-sm text-muted-foreground capitalize">{conversation.status}</span>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="text-sm text-muted-foreground">
            {messages.length} mensagens
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.direction === 'inbound' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 text-sm ${
                    msg.direction === 'outbound' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                    msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {msg.sender_type === 'agent' && <Bot className="h-3 w-3" />}
                    {msg.sender_type === 'human' && <User className="h-3 w-3" />}
                    <Clock className="h-3 w-3" />
                    {format(new Date(msg.sent_at), 'HH:mm')}
                  </div>
                </div>
                {msg.direction === 'outbound' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {msg.sender_type === 'agent' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
