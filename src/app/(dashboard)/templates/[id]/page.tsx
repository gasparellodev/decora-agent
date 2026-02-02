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
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save } from 'lucide-react'

export default function TemplateDetailPage() {
  const params = useParams()
  const templateId = params?.id as string
  const supabase = createClient()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [variables, setVariables] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const isNew = templateId === 'new'

  useEffect(() => {
    if (!templateId || isNew) return
    const load = async () => {
      const { data } = await supabase
        .from('dc_message_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (data) {
        setName(data.name || '')
        setCategory(data.category || '')
        setContent(data.content || '')
        setVariables((data.variables || []).join(', '))
        setIsActive(Boolean(data.is_active))
      }
    }
    load()
  }, [templateId, isNew, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name,
        category: category || null,
        content,
        variables: variables
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        is_active: isActive,
      }

      if (isNew) {
        await supabase.from('dc_message_templates').insert(payload)
      } else {
        await supabase.from('dc_message_templates').update(payload).eq('id', templateId)
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
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Templates
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{isNew ? 'Novo Template' : name}</h1>
          <p className="text-sm text-muted-foreground">Configure mensagem e variáveis</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dados do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Conteúdo</label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Variáveis (separadas por vírgula)</label>
            <Input value={variables} onChange={(e) => setVariables(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            <span className="text-sm text-muted-foreground">Template ativo</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
