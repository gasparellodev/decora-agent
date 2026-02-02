'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { MetricChart } from '@/components/ui/metric-chart'
import { ActivityItem } from '@/components/ui/activity-item'
import { CategoryCard } from '@/components/ui/category-card'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import {
  Users,
  MessageSquare,
  ShoppingCart,
  Clock,
  Bot,
  FileText,
  BookOpen,
  UserPlus,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, subDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalLeads: number
  activeConversations: number
  messagesToday: number
  conversionsToday: number
  leadsVariation?: number
  conversationsVariation?: number
  messagesVariation?: number
  conversionsVariation?: number
}

interface RecentConversation {
  id: string
  lead: {
    id: string
    name: string | null
    phone: string
  }
  lastMessage: string
  lastMessageAt: string
  status: string
}

interface MessagesByDay {
  label: string
  value: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeConversations: 0,
    messagesToday: 0,
    conversionsToday: 0,
  })
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [messagesByDay, setMessagesByDay] = useState<MessagesByDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()

    // Realtime subscription para novas mensagens
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dc_messages' },
        () => {
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const loadDashboardData = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Total de leads (hoje e ontem para variação)
      const { count: leadsCount } = await supabase
        .from('dc_leads')
        .select('*', { count: 'exact', head: true })

      const { count: leadsYesterday } = await supabase
        .from('dc_leads')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', today.toISOString())

      // Conversas ativas
      const { count: activeConvCount } = await supabase
        .from('dc_conversations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'waiting_human'])

      // Mensagens de hoje
      const { count: messagesTodayCount } = await supabase
        .from('dc_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', today.toISOString())

      // Mensagens de ontem (para comparação)
      const { count: messagesYesterdayCount } = await supabase
        .from('dc_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', yesterday.toISOString())
        .lt('sent_at', today.toISOString())

      // Conversões de hoje (leads que passaram para 'comprou')
      const { count: conversionsCount } = await supabase
        .from('dc_leads')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'comprou')
        .gte('updated_at', today.toISOString())

      // Calcular variações
      const leadsVariation = leadsYesterday && leadsYesterday > 0
        ? (((leadsCount || 0) - leadsYesterday) / leadsYesterday) * 100
        : 0

      const messagesVariation = messagesYesterdayCount && messagesYesterdayCount > 0
        ? (((messagesTodayCount || 0) - messagesYesterdayCount) / messagesYesterdayCount) * 100
        : 0

      setStats({
        totalLeads: leadsCount || 0,
        activeConversations: activeConvCount || 0,
        messagesToday: messagesTodayCount || 0,
        conversionsToday: conversionsCount || 0,
        leadsVariation,
        messagesVariation,
      })

      // Mensagens por dia (últimos 7 dias)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        return {
          date,
          label: format(date, 'EEE', { locale: ptBR }).slice(0, 3),
        }
      })

      const messagesByDayData = await Promise.all(
        last7Days.map(async ({ date, label }) => {
          const startOfDay = new Date(date)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(date)
          endOfDay.setHours(23, 59, 59, 999)

          const { count } = await supabase
            .from('dc_messages')
            .select('*', { count: 'exact', head: true })
            .gte('sent_at', startOfDay.toISOString())
            .lte('sent_at', endOfDay.toISOString())

          return { label, value: count || 0 }
        })
      )

      setMessagesByDay(messagesByDayData)

      // Conversas recentes
      const { data: conversations } = await supabase
        .from('dc_conversations')
        .select(`
          id,
          status,
          lead:dc_leads(id, name, phone)
        `)
        .in('status', ['active', 'waiting_human'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (conversations) {
        const conversationsWithMessages = await Promise.all(
          conversations.map(async (conv) => {
            const { data: lastMsg } = await supabase
              .from('dc_messages')
              .select('content, sent_at')
              .eq('conversation_id', conv.id)
              .order('sent_at', { ascending: false })
              .limit(1)
              .single()

            const leadData = Array.isArray(conv.lead) ? conv.lead[0] : conv.lead
            return {
              id: conv.id,
              lead: leadData as { id: string; name: string | null; phone: string },
              lastMessage: lastMsg?.content || '',
              lastMessageAt: lastMsg?.sent_at || '',
              status: conv.status,
            }
          })
        )
        setRecentConversations(conversationsWithMessages)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalMessages = messagesByDay.reduce((sum, day) => sum + day.value, 0)

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do seu agente de atendimento
        </p>
      </div>

      {/* Stats Grid + Chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stats Cards - 2x2 grid */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total de Leads"
            value={stats.totalLeads}
            variation={stats.leadsVariation}
            accentColor="teal"
            href="/leads"
          />
          <StatCard
            title="Conversas Ativas"
            value={stats.activeConversations}
            accentColor="blue"
            href="/conversations"
          />
          <StatCard
            title="Mensagens Hoje"
            value={stats.messagesToday}
            variation={stats.messagesVariation}
            accentColor="yellow"
          />
          <StatCard
            title="Conversões Hoje"
            value={stats.conversionsToday}
            accentColor="green"
          />
        </div>

        {/* Metric Chart */}
        <div className="lg:col-span-1">
          <MetricChart
            title="Mensagens"
            value={totalMessages}
            variation={stats.messagesVariation}
            periodLabel="7 dias"
            data={messagesByDay}
            className="h-full min-h-[280px]"
          />
        </div>
      </div>

      {/* Recent Conversations + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Conversations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Conversas Recentes</CardTitle>
            <button className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : recentConversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="font-medium">Nenhuma conversa ativa</p>
                <p className="text-sm mt-1">As conversas aparecerão aqui</p>
              </div>
            ) : (
              <ScrollArea className="h-[320px] -mx-2">
                <div className="space-y-1 px-2">
                  {recentConversations.map((conv) => (
                    <Link key={conv.id} href={`/conversations?id=${conv.id}`}>
                      <ActivityItem
                        icon={MessageSquare}
                        iconBg={conv.status === 'waiting_human' ? 'bg-yellow/15' : 'bg-teal/15'}
                        iconColor={conv.status === 'waiting_human' ? 'text-yellow' : 'text-teal'}
                        title={conv.lead?.name || conv.lead?.phone || 'Desconhecido'}
                        subtitle={conv.lastMessage || 'Sem mensagens'}
                        value={
                          conv.lastMessageAt
                            ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                                addSuffix: false,
                                locale: ptBR,
                              })
                            : ''
                        }
                      />
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="pt-4 border-t mt-4">
              <Link href="/conversations">
                <InteractiveHoverButton text="Ver Todas" className="w-full" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ações Rápidas
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <CategoryCard
              icon={UserPlus}
              label="Novo Lead"
              href="/leads?new=true"
            />
            <CategoryCard
              icon={ShoppingCart}
              label="Ver Pedidos"
              href="/orders"
            />
            <CategoryCard
              icon={FileText}
              label="Templates"
              href="/templates"
            />
            <CategoryCard
              icon={BookOpen}
              label="Conhecimento"
              href="/knowledge"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
