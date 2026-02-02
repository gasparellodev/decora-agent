'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CinematicGlowToggle } from '@/components/ui/cinematic-glow-toggle'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ShoppingBag,
  Package,
  Truck,
  CreditCard,
  Settings,
  ExternalLink,
  Check,
  X,
  Loader2,
  RefreshCw,
  Store
} from 'lucide-react'
import { toast } from 'sonner'
import type { Integration } from '@/types/database'

interface IntegrationConfig {
  id: string
  name: string
  description: string
  icon: any
  color: string
  webhookUrl: string
  docsUrl: string
  fields: { key: string; label: string; type: string; placeholder: string }[]
}

const integrations: IntegrationConfig[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Receba pedidos e atualizações de status da sua loja Shopify',
    icon: ShoppingBag,
    color: 'bg-green-500',
    webhookUrl: '/api/webhooks/shopify',
    docsUrl: 'https://shopify.dev/docs/api/webhooks',
    fields: [
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'shpss_...' }
    ]
  },
  {
    id: 'yampi',
    name: 'Yampi',
    description: 'Integração com checkout Yampi para carrinho abandonado e pedidos',
    icon: Package,
    color: 'bg-purple-500',
    webhookUrl: '/api/webhooks/yampi',
    docsUrl: 'https://docs.yampi.com.br',
    fields: [
      { key: 'alias', label: 'Alias da Loja', type: 'text', placeholder: 'minha-loja' },
      { key: 'token', label: 'API Token', type: 'password', placeholder: 'Token do Yampi' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Secret do webhook' }
    ]
  },
  {
    id: 'melhor_envio',
    name: 'Melhor Envio',
    description: 'Rastreamento automático de entregas e notificações de status',
    icon: Truck,
    color: 'bg-orange-500',
    webhookUrl: '/api/webhooks/melhor-envio',
    docsUrl: 'https://docs.melhorenvio.com.br',
    fields: [
      { key: 'token', label: 'API Token', type: 'password', placeholder: 'Token do Melhor Envio' },
      { key: 'secret', label: 'Webhook Secret', type: 'password', placeholder: 'Secret para validação' }
    ]
  },
  {
    id: 'bling',
    name: 'Bling ERP',
    description: 'Sincronize pedidos e clientes com o Bling ERP',
    icon: CreditCard,
    color: 'bg-blue-500',
    webhookUrl: '',
    docsUrl: 'https://developer.bling.com.br',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Client ID do app' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Client Secret' }
    ]
  },
  {
    id: 'mercadolivre',
    name: 'Mercado Livre',
    description: 'Responda perguntas, gerencie pós-venda e notifique clientes automaticamente',
    icon: Store,
    color: 'bg-yellow-500',
    webhookUrl: '/api/webhooks/mercadolivre',
    docsUrl: 'https://developers.mercadolivre.com.br',
    fields: [
      { key: 'client_id', label: 'App ID', type: 'text', placeholder: 'ID do aplicativo' },
      { key: 'client_secret', label: 'Secret Key', type: 'password', placeholder: 'Secret Key do app' },
      { key: 'user_id', label: 'User ID (vendedor)', type: 'text', placeholder: 'ID do vendedor' }
    ]
  }
]

export default function IntegrationsPage() {
  const supabase = createClient()
  const [savedIntegrations, setSavedIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('dc_integrations')
        .select('*')

      if (error) throw error
      setSavedIntegrations(data || [])
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntegrationStatus = (id: string) => {
    const saved = savedIntegrations.find(i => i.provider === id)
    return saved?.is_active || false
  }

  const getIntegrationData = (id: string) => {
    return savedIntegrations.find(i => i.provider === id)
  }

  const handleEdit = (integration: IntegrationConfig) => {
    const saved = getIntegrationData(integration.id)
    const data: Record<string, string> = {}
    
    integration.fields.forEach(field => {
      data[field.key] = (saved?.metadata as any)?.[field.key] || ''
    })
    
    setFormData(data)
    setEditingId(integration.id)
  }

  const handleSave = async (integration: IntegrationConfig) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('dc_integrations')
        .upsert({
          provider: integration.id,
          is_active: true,
          metadata: formData
        }, { onConflict: 'provider' })

      if (error) throw error

      toast.success(`${integration.name} configurado com sucesso!`)
      setEditingId(null)
      loadIntegrations()
    } catch (error) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('dc_integrations')
        .update({ is_active: enabled })
        .eq('provider', id)

      if (error) throw error

      toast.success(enabled ? 'Integração ativada' : 'Integração desativada')
      loadIntegrations()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio.com'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">
          Configure as integrações com plataformas externas
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => {
          const isActive = getIntegrationStatus(integration.id)
          const savedData = getIntegrationData(integration.id)
          const Icon = integration.icon

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${integration.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Webhook URL */}
                {integration.webhookUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                    <code className="block text-xs bg-muted p-2 rounded break-all">
                      {appUrl}{integration.webhookUrl}
                    </code>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <CinematicGlowToggle
                    checked={isActive}
                    onCheckedChange={(checked) => handleToggle(integration.id, checked)}
                    disabled={!savedData}
                    showLabels
                    size="sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(integration.docsUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Docs
                    </Button>
                    <Dialog open={editingId === integration.id} onOpenChange={(open) => !open && setEditingId(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEdit(integration)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configurar {integration.name}</DialogTitle>
                          <DialogDescription>
                            Preencha as credenciais para ativar a integração
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {integration.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                              <Label htmlFor={field.key}>{field.label}</Label>
                              <Input
                                id={field.key}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={formData[field.key] || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => handleSave(integration)}
                            disabled={saving}
                          >
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              'Salvar'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Como configurar as integrações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground">Shopify</h4>
            <p>Vá em Configurações → Notificações → Webhooks e adicione a URL acima para os eventos de pedidos.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Yampi</h4>
            <p>No painel Yampi, acesse Configurações → Webhooks e configure a URL para receber notificações.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Melhor Envio</h4>
            <p>Acesse Integrações → Área Dev no Melhor Envio, crie um app e configure o webhook.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Bling</h4>
            <p>Crie um aplicativo em developer.bling.com.br e configure as credenciais OAuth.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Mercado Livre</h4>
            <p>Crie um aplicativo em developers.mercadolivre.com.br, configure os escopos (read, write, offline_access) e o webhook para receber notificações de perguntas, mensagens e pedidos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
