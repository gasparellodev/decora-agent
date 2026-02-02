'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Phone,
  Calendar,
  Loader2,
} from 'lucide-react'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { StatCard } from '@/components/ui/stat-card'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead, LeadStage, LeadInsert } from '@/types/database'
import Link from 'next/link'
import { toast } from 'sonner'

const stageLabels: Record<LeadStage, string> = {
  novo: 'Novo',
  qualificando: 'Qualificando',
  orcamento: 'Orçamento',
  comprou: 'Comprou',
  producao: 'Produção',
  entregue: 'Entregue',
  pos_venda: 'Pós-venda',
  inativo: 'Inativo',
}

const stageStyles: Record<LeadStage, string> = {
  novo: 'bg-blue-500/10 text-blue-700',
  qualificando: 'bg-purple-500/10 text-purple-700',
  orcamento: 'bg-amber-500/10 text-amber-700',
  comprou: 'bg-emerald-500/10 text-emerald-700',
  producao: 'bg-orange-500/10 text-orange-700',
  entregue: 'bg-teal-500/10 text-teal-700',
  pos_venda: 'bg-indigo-500/10 text-indigo-700',
  inativo: 'bg-gray-500/10 text-gray-600',
}

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stage, setStage] = useState<LeadStage>('novo')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    notes: ''
  })

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('dc_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      source: 'manual',
      notes: ''
    })
    setStage('novo')
  }

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.phone.trim()) {
      toast.error('Telefone é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: LeadInsert = {
        phone: form.phone.trim(),
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        source: form.source.trim() || 'manual',
        notes: form.notes.trim() || null,
        stage,
        is_company: false
      }

      const { error } = await supabase.from('dc_leads').insert(payload)
      if (error) throw error

      toast.success('Lead criado com sucesso')
      setIsCreateOpen(false)
      resetForm()
      await loadLeads()
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Erro ao criar lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredLeads = leads.filter(l => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      l.name?.toLowerCase().includes(searchLower) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(searchLower)
    )
  })

  const totalLeads = leads.length
  const newLeads = leads.filter(l => l.stage === 'novo').length
  const wonLeads = leads.filter(l => l.stage === 'comprou' || l.stage === 'entregue').length
  const inactiveLeads = leads.filter(l => l.stage === 'inativo').length

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
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {totalLeads} leads no total
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <InteractiveHoverButton text="Novo Lead" className="w-36" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle>Criar novo lead</DialogTitle>
              <DialogDescription>
                Cadastre rapidamente um lead e já comece o atendimento.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Nome</Label>
                  <Input
                    id="lead-name"
                    placeholder="Ex: Maria Souza"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-phone">Telefone *</Label>
                  <Input
                    id="lead-phone"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="maria@email.com"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-source">Origem</Label>
                  <Input
                    id="lead-source"
                    placeholder="WhatsApp, Instagram, Indicação..."
                    value={form.source}
                    onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status inicial</Label>
                  <Select value={stage} onValueChange={(value) => setStage(value as LeadStage)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="lead-notes">Notas</Label>
                  <Textarea
                    id="lead-notes"
                    placeholder="Contexto rápido do lead, preferência, pedido..."
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !form.phone.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Criar lead'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Novos" value={newLeads} accentColor="blue" />
        <StatCard title="Convertidos" value={wonLeads} accentColor="green" />
        <StatCard title="Inativos" value={inactiveLeads} accentColor="default" />
        <StatCard title="Total" value={totalLeads} accentColor="teal" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Lista de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Última ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const lastAction = lead.last_message_at || lead.updated_at || lead.created_at
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                            {lead.name || 'Sem nome'}
                          </Link>
                          {lead.email && (
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {lead.source || 'whatsapp'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={stageStyles[lead.stage]}>
                          {stageLabels[lead.stage]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{lead.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(lastAction), 'dd MMM, yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lastAction), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
