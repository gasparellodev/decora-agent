'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Mail, Calendar, Package, MessageSquare, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LeadRow {
  id: string
  name: string | null
  phone: string
  email: string | null
  stage: string
  source: string | null
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params?.id as string
  const supabase = createClient()
  const [lead, setLead] = useState<LeadRow | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leadId) return
    const load = async () => {
      try {
        const { data: leadData } = await supabase
          .from('dc_leads')
          .select('*')
          .eq('id', leadId)
          .single()

        const { data: ordersData } = await supabase
          .from('dc_orders')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })

        const { data: convData } = await supabase
          .from('dc_conversations')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })

        const { data: followData } = await supabase
          .from('dc_follow_ups')
          .select('*')
          .eq('lead_id', leadId)
          .order('scheduled_for', { ascending: false })

        setLead(leadData as LeadRow)
        setOrders(ordersData || [])
        setConversations(convData || [])
        setFollowUps(followData || [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [leadId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando lead...
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">Lead não encontrado.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Leads
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{lead.name || 'Sem nome'}</h1>
          <p className="text-sm text-muted-foreground">{lead.phone}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {lead.stage}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{lead.phone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{lead.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Criado em {format(new Date(lead.created_at), 'dd MMM, yyyy', { locale: ptBR })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card>
            <CardContent className="p-6 space-y-3">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conversa registrada.</p>
              ) : (
                conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations/${conv.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{conv.status}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-6 space-y-3">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
              ) : (
                orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        #{order.order_number || order.external_id?.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups">
          <Card>
            <CardContent className="p-6 space-y-3">
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum follow-up registrado.</p>
              ) : (
                followUps.map((follow) => (
                  <div key={follow.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{follow.type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(follow.scheduled_for), 'dd MMM, yyyy', { locale: ptBR })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
