'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, CalendarClock, Save } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FollowUpDetailPage() {
  const params = useParams()
  const followId = params?.id as string
  const supabase = createClient()
  const [follow, setFollow] = useState<any>(null)
  const [scheduledFor, setScheduledFor] = useState('')
  const [status, setStatus] = useState('pending')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!followId) return
    const load = async () => {
      const { data } = await supabase
        .from('dc_follow_ups')
        .select('*, lead:dc_leads(name, phone)')
        .eq('id', followId)
        .single()

      setFollow(data)
      if (data?.scheduled_for) {
        const date = new Date(data.scheduled_for)
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        setScheduledFor(local.toISOString().slice(0, 16))
      }
      setStatus(data?.status || 'pending')
    }
    load()
  }, [followId, supabase])

  const handleSave = async () => {
    if (!follow) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        status,
      }
      if (scheduledFor) {
        payload.scheduled_for = new Date(scheduledFor).toISOString()
      }
      await supabase
        .from('dc_follow_ups')
        .update(payload)
        .eq('id', follow.id)
    } finally {
      setSaving(false)
    }
  }

  if (!follow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/follow-ups">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">Follow-up não encontrado.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/follow-ups">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Follow-ups
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold capitalize">{follow.type}</h1>
          <p className="text-sm text-muted-foreground">
            {follow.lead?.name || follow.lead?.phone}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Data e hora</label>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="sent">sent</SelectItem>
                  <SelectItem value="responded">responded</SelectItem>
                  <SelectItem value="cancelled">cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              <span>
                Criado em {format(new Date(follow.created_at), 'dd MMM, yyyy', { locale: ptBR })}
              </span>
            </div>
            {follow.message_template && (
              <div className="text-xs bg-muted/60 rounded-lg p-3">
                {follow.message_template}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
