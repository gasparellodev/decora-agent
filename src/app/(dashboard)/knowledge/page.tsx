'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Brain, MessageSquare, AlertCircle, BookOpen } from 'lucide-react'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

const sourceLabels: Record<string, string> = {
  faq: 'FAQ',
  product: 'Produto',
  installation: 'Instalação',
  measurement: 'Medidas',
  conversation_insight: 'Conversa',
  feedback_correction: 'Feedback',
  manual: 'Manual'
}

const sourceColors: Record<string, string> = {
  faq: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  installation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  measurement: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  conversation_insight: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  feedback_correction: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  manual: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

export default function KnowledgePage() {
  const supabase = createClient()
  const [manualItems, setManualItems] = useState<any[]>([])
  const [ragItems, setRagItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [ragStats, setRagStats] = useState<{ total: number; bySource: Record<string, number> }>({ total: 0, bySource: {} })

  useEffect(() => {
    const load = async () => {
      const [manualResult, ragResult] = await Promise.all([
        supabase
          .from('dc_knowledge_base')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('dc_knowledge_embeddings')
          .select('id, source, title, content, score, status, created_at')
          .eq('status', 'active')
          .order('score', { ascending: false })
          .limit(200)
      ])

      setManualItems(manualResult.data || [])
      setRagItems(ragResult.data || [])

      const bySource: Record<string, number> = {}
      for (const item of ragResult.data || []) {
        bySource[item.source] = (bySource[item.source] || 0) + 1
      }
      setRagStats({ total: ragResult.data?.length || 0, bySource })

      setLoading(false)
    }
    load()
  }, [supabase])

  const filteredManual = manualItems.filter((i) => {
    if (!search) return true
    return i.title?.toLowerCase().includes(search.toLowerCase())
  })

  const filteredRag = ragItems.filter((i) => {
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase())
    const matchSource = sourceFilter === 'all' || i.source === sourceFilter
    return matchSearch && matchSource
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Base de Conhecimento</h1>
          <p className="text-muted-foreground mt-1">FAQ, artigos e conhecimento aprendido (RAG)</p>
        </div>
        <Link href="/knowledge/new">
          <InteractiveHoverButton text="Novo Artigo" className="w-36" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{ragStats.total}</p>
                <p className="text-xs text-muted-foreground">Artigos RAG</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{ragStats.bySource.faq || 0}</p>
                <p className="text-xs text-muted-foreground">FAQ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{ragStats.bySource.conversation_insight || 0}</p>
                <p className="text-xs text-muted-foreground">De conversas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{ragStats.bySource.feedback_correction || 0}</p>
                <p className="text-xs text-muted-foreground">De feedbacks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${sourceFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Todos
              </button>
              {Object.entries(sourceLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${sourceFilter === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {label} ({ragStats.bySource[key] || 0})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG Knowledge Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Conhecimento RAG ({filteredRag.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRag.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nenhum artigo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRag.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${sourceColors[item.source] || 'bg-gray-100'}`}>
                          {sourceLabels[item.source] || item.source}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm ${item.score >= 2 ? 'text-green-600' : item.score <= 0.5 ? 'text-red-500' : ''}`}>
                          {item.score?.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Knowledge Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Artigos Manuais ({filteredManual.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManual.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Nenhum artigo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredManual.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/knowledge/${item.id}`} className="font-medium hover:underline">
                          {item.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(item.tags || []).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
