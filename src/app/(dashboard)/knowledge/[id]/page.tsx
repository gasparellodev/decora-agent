'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

export default function KnowledgeDetailPage() {
  const params = useParams()
  const itemId = params?.id as string
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState('draft')
  const [saving, setSaving] = useState(false)

  const isNew = itemId === 'new'

  useEffect(() => {
    if (!itemId || isNew) return
    const load = async () => {
      const { data } = await supabase
        .from('dc_knowledge_base')
        .select('*')
        .eq('id', itemId)
        .single()

      if (data) {
        setTitle(data.title || '')
        setContent(data.content || '')
        setTags((data.tags || []).join(', '))
        setStatus(data.status || 'draft')
      }
    }
    load()
  }, [itemId, isNew, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        title,
        content,
        status,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      if (isNew) {
        await supabase.from('dc_knowledge_base').insert(payload)
      } else {
        await supabase.from('dc_knowledge_base').update(payload).eq('id', itemId)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/knowledge">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Base de Conhecimento
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{isNew ? 'Novo artigo' : title}</h1>
          <p className="text-sm text-muted-foreground">Conteúdo utilizado pelo agente</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Texto</label>
            <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
