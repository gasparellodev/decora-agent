'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save } from 'lucide-react'

export default function UserDetailPage() {
  const params = useParams()
  const userId = params?.id as string
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('attendant')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data } = await supabase
        .from('dc_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(data)
      setFullName(data?.full_name || '')
      setRole(data?.role || 'attendant')
      setIsActive(Boolean(data?.is_active))
    }
    load()
  }, [userId, supabase])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await supabase
        .from('dc_profiles')
        .update({ full_name: fullName, role, is_active: isActive })
        .eq('id', profile.id)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">Usuário não encontrado.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/users">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Usuários
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Perfil do Usuário</h1>
          <p className="text-sm text-muted-foreground">{profile.id}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome completo</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="attendant">attendant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            <span className="text-sm text-muted-foreground">Usuário ativo</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
