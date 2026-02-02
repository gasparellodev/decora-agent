'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import {
  MessageSquare,
  Users,
  TrendingUp,
  Bot,
  DollarSign,
  Clock,
  Loader2
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DailyMetrics {
  date: string
  total_messages_in: number
  total_messages_out: number
  total_conversations: number
  total_leads_created: number
  total_conversions: number
  total_followups_sent: number
  total_tokens_used: number
  total_ai_cost_usd: number
  avg_response_time_sec: number
}

export default function MetricsPage() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<DailyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7' | '30' | '90'>('7')

  useEffect(() => {
    loadMetrics()
  }, [period])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const startDate = subDays(new Date(), parseInt(period)).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('dc_agent_metrics')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: true })

      if (error) throw error
      setMetrics(data || [])
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular totais
  const totals = metrics.reduce(
    (acc, m) => ({
      messages: acc.messages + (m.total_messages_in || 0) + (m.total_messages_out || 0),
      conversations: acc.conversations + (m.total_conversations || 0),
      leads: acc.leads + (m.total_leads_created || 0),
      conversions: acc.conversions + (m.total_conversions || 0),
      tokens: acc.tokens + (m.total_tokens_used || 0),
      cost: acc.cost + (m.total_ai_cost_usd || 0),
    }),
    { messages: 0, conversations: 0, leads: 0, conversions: 0, tokens: 0, cost: 0 }
  )

  // Preparar dados para gráficos
  const chartData = metrics.map((m) => ({
    date: format(new Date(m.date), 'dd/MM'),
    mensagens: (m.total_messages_in || 0) + (m.total_messages_out || 0),
    entrada: m.total_messages_in || 0,
    saida: m.total_messages_out || 0,
    leads: m.total_leads_created || 0,
    conversoes: m.total_conversions || 0,
    tokens: Math.round((m.total_tokens_used || 0) / 1000), // em milhares
    custo: m.total_ai_cost_usd || 0,
  }))

  const statCards = [
    {
      title: 'Total de Mensagens',
      value: totals.messages.toLocaleString(),
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Conversas Iniciadas',
      value: totals.conversations.toLocaleString(),
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Leads Criados',
      value: totals.leads.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Conversões',
      value: totals.conversions.toLocaleString(),
      icon: Bot,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Tokens Usados',
      value: `${(totals.tokens / 1000).toFixed(1)}K`,
      icon: Clock,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Custo de IA',
      value: `$${totals.cost.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o desempenho do seu agente de IA
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="7">7 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
            <TabsTrigger value="90">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mensagens */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens por Dia</CardTitle>
            <CardDescription>Volume de mensagens trocadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="entrada" name="Recebidas" fill="hsl(var(--primary))" />
                  <Bar dataKey="saida" name="Enviadas" fill="hsl(var(--primary) / 0.5)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads e Conversões */}
        <Card>
          <CardHeader>
            <CardTitle>Leads e Conversões</CardTitle>
            <CardDescription>Captação e conversão de leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversoes"
                    name="Conversões"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Uso de Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Consumo de Tokens</CardTitle>
            <CardDescription>Tokens usados por dia (em milhares)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="tokens" name="Tokens (K)" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Custo de IA</CardTitle>
            <CardDescription>Custo diário estimado em USD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Custo']}
                  />
                  <Line
                    type="monotone"
                    dataKey="custo"
                    name="Custo"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
