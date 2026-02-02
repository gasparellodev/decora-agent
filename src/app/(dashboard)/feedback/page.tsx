'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  ThumbsDown, 
  ThumbsUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Feedback {
  id: string
  message_id: string
  conversation_id: string
  lead_id: string
  reaction: 'negative' | 'positive'
  reaction_emoji: string
  original_content: string
  corrected_content: string | null
  feedback_text: string | null
  error_type: string | null
  ai_analysis: any
  suggested_prompt_changes: string | null
  suggested_kb_updates: string | null
  status: string
  created_at: string
  resolved_at: string | null
  lead?: {
    name: string | null
    phone: string
  }
}

interface Stats {
  total: number
  negative: number
  positive: number
  applied: number
  pending: number
  satisfactionRate: number
}

export default function FeedbackPage() {
  const supabase = createClient()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'negative' | 'positive'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true)
      
      // Carregar feedbacks
      let query = supabase
        .from('dc_message_feedback')
        .select('*, lead:dc_leads(name, phone)')
        .order('created_at', { ascending: false })
        .limit(100)
      
      const { data } = await query
      setFeedbacks(data || [])
      
      // Calcular estatísticas manualmente (fallback se a função RPC não existir)
      const total = data?.length || 0
      const negative = data?.filter(f => f.reaction === 'negative').length || 0
      const positive = data?.filter(f => f.reaction === 'positive').length || 0
      const applied = data?.filter(f => f.status === 'applied').length || 0
      const pending = data?.filter(f => ['pending', 'in_review', 'awaiting_response'].includes(f.status)).length || 0
      
      setStats({
        total,
        negative,
        positive,
        applied,
        pending,
        satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 100
      })
      
    } catch (error) {
      console.error('Error loading feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  const filtered = feedbacks.filter((item) => {
    // Filtro por tipo
    if (filter === 'pending' && !['pending', 'in_review', 'awaiting_response'].includes(item.status)) return false
    if (filter === 'negative' && item.reaction !== 'negative') return false
    if (filter === 'positive' && item.reaction !== 'positive') return false
    
    // Filtro por busca
    if (!search) return true
    const s = search.toLowerCase()
    return (
      item.lead?.name?.toLowerCase().includes(s) ||
      item.lead?.phone?.includes(search) ||
      item.original_content?.toLowerCase().includes(s) ||
      item.feedback_text?.toLowerCase().includes(s)
    )
  })

  const handleDismiss = async (feedbackId: string) => {
    await supabase
      .from('dc_message_feedback')
      .update({ 
        status: 'dismissed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
    
    loadFeedbacks()
  }

  const handleApply = async (feedbackId: string) => {
    await supabase
      .from('dc_message_feedback')
      .update({ 
        status: 'applied',
        resolved_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
    
    loadFeedbacks()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'pending': { variant: 'secondary', label: 'Pendente' },
      'awaiting_response': { variant: 'outline', label: 'Aguardando' },
      'in_review': { variant: 'default', label: 'Em revisão' },
      'applied': { variant: 'default', label: 'Aplicado' },
      'dismissed': { variant: 'secondary', label: 'Descartado' }
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getErrorTypeBadge = (errorType: string | null) => {
    if (!errorType) return null
    const labels: Record<string, string> = {
      'factual': 'Erro factual',
      'tone': 'Tom inadequado',
      'information': 'Info incompleta',
      'product_info': 'Info de produto',
      'measurement': 'Medidas',
      'other': 'Outro'
    }
    return <Badge variant="outline" className="text-xs">{labels[errorType] || errorType}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedbacks</h1>
        <p className="text-muted-foreground">
          Gerencie feedbacks dos clientes via reações do WhatsApp
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Negativos</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.negative}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Positivos</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.positive}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Satisfação</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.satisfactionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por lead, conteúdo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todos
              </Button>
              <Button 
                variant={filter === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('pending')}
              >
                <Clock className="h-4 w-4 mr-1" />
                Pendentes
              </Button>
              <Button 
                variant={filter === 'negative' ? 'destructive' : 'outline'} 
                size="sm"
                onClick={() => setFilter('negative')}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Negativos
              </Button>
              <Button 
                variant={filter === 'positive' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('positive')}
                className={filter === 'positive' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Positivos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Lista de Feedbacks</CardTitle>
          <CardDescription>
            Clique em um feedback para ver detalhes e aplicar correções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Tipo</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="max-w-xs">Mensagem Original</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum feedback encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {item.reaction === 'negative' ? (
                          <ThumbsDown className="h-5 w-5 text-red-500" />
                        ) : (
                          <ThumbsUp className="h-5 w-5 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.lead?.name || 'Lead'}</div>
                        <div className="text-xs text-muted-foreground">{item.lead?.phone}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm">{item.original_content}</p>
                      </TableCell>
                      <TableCell>
                        {getErrorTypeBadge(item.error_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.created_at), 'dd MMM, HH:mm', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(item)
                              setDetailsOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status !== 'applied' && item.status !== 'dismissed' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApply(item.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDismiss(item.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback?.reaction === 'negative' ? (
                <ThumbsDown className="h-5 w-5 text-red-500" />
              ) : (
                <ThumbsUp className="h-5 w-5 text-green-500" />
              )}
              Detalhes do Feedback
            </DialogTitle>
            <DialogDescription>
              {selectedFeedback?.lead?.name || 'Lead'} - {selectedFeedback?.lead?.phone}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Mensagem Original</label>
                <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                  {selectedFeedback.original_content}
                </div>
              </div>
              
              {selectedFeedback.feedback_text && (
                <div>
                  <label className="text-sm font-medium">Feedback do Cliente</label>
                  <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    {selectedFeedback.feedback_text}
                  </div>
                </div>
              )}
              
              {selectedFeedback.corrected_content && (
                <div>
                  <label className="text-sm font-medium">Mensagem Corrigida</label>
                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    {selectedFeedback.corrected_content}
                  </div>
                </div>
              )}
              
              {selectedFeedback.ai_analysis && (
                <div>
                  <label className="text-sm font-medium">Análise da IA</label>
                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                    {selectedFeedback.ai_analysis.errorDescription && (
                      <p><strong>Erro:</strong> {selectedFeedback.ai_analysis.errorDescription}</p>
                    )}
                    {selectedFeedback.ai_analysis.confidence && (
                      <p><strong>Confiança:</strong> {Math.round(selectedFeedback.ai_analysis.confidence * 100)}%</p>
                    )}
                  </div>
                </div>
              )}
              
              {selectedFeedback.suggested_prompt_changes && (
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Sugestão de Mudança no Prompt
                  </label>
                  <Textarea 
                    className="mt-1" 
                    value={selectedFeedback.suggested_prompt_changes}
                    readOnly
                    rows={3}
                  />
                </div>
              )}
              
              {selectedFeedback.suggested_kb_updates && (
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Sugestão de Update na Knowledge Base
                  </label>
                  <Textarea 
                    className="mt-1" 
                    value={selectedFeedback.suggested_kb_updates}
                    readOnly
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
            {selectedFeedback && selectedFeedback.status !== 'applied' && selectedFeedback.status !== 'dismissed' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleDismiss(selectedFeedback.id)
                    setDetailsOpen(false)
                  }}
                >
                  Descartar
                </Button>
                <Button 
                  onClick={() => {
                    handleApply(selectedFeedback.id)
                    setDetailsOpen(false)
                  }}
                >
                  Aplicar Correção
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
