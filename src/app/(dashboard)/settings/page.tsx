'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CinematicGlowToggle } from '@/components/ui/cinematic-glow-toggle'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  Bot,
  Settings2,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Radio
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Tipo para os dados da conexão WhatsApp do banco
interface WhatsAppConnection {
  id: string
  instance_name: string
  instance_id?: string
  phone_number?: string
  status: string
  qr_code?: string
  connected_at?: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<{
    connected: boolean
    status: string
    instance?: string
    phone_number?: string
    qr_code?: string
    evolution_state?: string
  }>({
    connected: false,
    status: 'disconnected'
  })
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [savingAgent, setSavingAgent] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const previousStatusRef = useRef<string>('disconnected')

  // Atualiza o estado do WhatsApp baseado nos dados do banco
  const updateWhatsAppStatusFromDB = useCallback((data: WhatsAppConnection) => {
    const wasConnecting = previousStatusRef.current === 'connecting'
    const isNowConnected = data.status === 'connected'
    
    // Detectar transição connecting -> connected para mostrar toast
    if (wasConnecting && isNowConnected) {
      toast.success('WhatsApp conectado com sucesso!')
    }
    
    previousStatusRef.current = data.status
    
    setWhatsappStatus({
      connected: data.status === 'connected',
      status: data.status,
      instance: data.instance_name,
      phone_number: data.phone_number || undefined,
      qr_code: data.qr_code || undefined,
      evolution_state: data.status
    })
    setLastUpdate(new Date())
  }, [])

  // Setup Supabase Realtime subscription
  useEffect(() => {
    const setupRealtimeSubscription = () => {
      // Criar canal para escutar mudanças na tabela dc_whatsapp_connections
      const channel = supabase
        .channel('whatsapp-connection-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'dc_whatsapp_connections'
          },
          (payload) => {
            console.log('[Realtime] WhatsApp connection change:', payload.eventType)
            
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const newData = payload.new as WhatsAppConnection
              updateWhatsAppStatusFromDB(newData)
            } else if (payload.eventType === 'DELETE') {
              // Conexão removida, resetar status
              setWhatsappStatus({
                connected: false,
                status: 'disconnected'
              })
              previousStatusRef.current = 'disconnected'
              setLastUpdate(new Date())
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status)
          setIsRealtimeConnected(status === 'SUBSCRIBED')
        })
      
      channelRef.current = channel
    }

    setupRealtimeSubscription()

    // Cleanup: remover subscription quando o componente desmontar
    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Unsubscribing from channel')
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase, updateWhatsAppStatusFromDB])

  // Carregar estado inicial (apenas uma vez)
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Carregar status do WhatsApp diretamente do banco
      const { data: connection } = await supabase
        .from('dc_whatsapp_connections')
        .select('*')
        .limit(1)
        .single()
      
      if (connection) {
        previousStatusRef.current = connection.status
        setWhatsappStatus({
          connected: connection.status === 'connected',
          status: connection.status,
          instance: connection.instance_name,
          phone_number: connection.phone_number || undefined,
          qr_code: connection.qr_code || undefined,
          evolution_state: connection.status
        })
        setLastUpdate(new Date())
      }

      // Carregar configuração do agente
      const { data } = await supabase
        .from('dc_agent_settings')
        .select('value')
        .eq('key', 'agent_enabled')
        .single()

      setAgentEnabled(data?.value === true || data?.value === 'true')
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para refresh manual (fallback caso realtime tenha problemas)
  const checkWhatsappStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/connect')
      const data = await response.json()
      
      // Detectar mudança de estado
      const wasConnecting = previousStatusRef.current === 'connecting'
      const isNowConnected = data.connected
      
      if (wasConnecting && isNowConnected) {
        toast.success('WhatsApp conectado com sucesso!')
      }
      
      previousStatusRef.current = data.status
      setWhatsappStatus(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.already_connected) {
        toast.success('WhatsApp já está conectado!')
        setWhatsappStatus({
          connected: true,
          status: 'connected',
          instance: data.instance
        })
        return
      }

      setWhatsappStatus({
        connected: false,
        status: 'connecting',
        instance: data.instance,
        qr_code: data.qr_code
      })

      toast.success('QR Code gerado! Escaneie com seu WhatsApp')
    } catch (error) {
      toast.error('Erro ao conectar')
    } finally {
      setConnecting(false)
    }
  }

  const handleToggleAgent = async (enabled: boolean) => {
    setSavingAgent(true)
    try {
      const { error } = await supabase
        .from('dc_agent_settings')
        .upsert({
          key: 'agent_enabled',
          value: enabled
        }, { onConflict: 'key' })

      if (error) throw error

      setAgentEnabled(enabled)
      toast.success(enabled ? 'Agente ativado' : 'Agente desativado')
    } catch (error) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSavingAgent(false)
    }
  }

  const formatLastUpdate = () => {
    if (!lastUpdate) return ''
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 5) return 'agora'
    if (seconds < 60) return `${seconds}s atrás`
    return `${Math.floor(seconds / 60)}m atrás`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do agente e integrações
        </p>
      </div>

      {/* WhatsApp Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {whatsappStatus.connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : whatsappStatus.status === 'connecting' ? (
              <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Conexão WhatsApp
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp Business para receber e enviar mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={whatsappStatus.connected ? 'default' : 'secondary'}
                className={
                  whatsappStatus.connected 
                    ? 'bg-green-500' 
                    : whatsappStatus.status === 'connecting'
                    ? 'bg-yellow-500'
                    : ''
                }
              >
                {whatsappStatus.connected 
                  ? 'Conectado' 
                  : whatsappStatus.status === 'connecting' 
                  ? 'Aguardando scan...' 
                  : 'Desconectado'}
              </Badge>
              {whatsappStatus.phone_number && (
                <span className="text-sm text-muted-foreground">
                  {whatsappStatus.phone_number}
                </span>
              )}
              {lastUpdate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastUpdate()}
                </span>
              )}
              {/* Indicador de Realtime */}
              <span 
                className={`text-xs flex items-center gap-1 ${
                  isRealtimeConnected ? 'text-green-600' : 'text-muted-foreground'
                }`}
                title={isRealtimeConnected ? 'Recebendo atualizações em tempo real' : 'Realtime desconectado'}
              >
                <Radio className={`h-3 w-3 ${isRealtimeConnected ? 'animate-pulse' : ''}`} />
                {isRealtimeConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting || whatsappStatus.connected}
              variant={whatsappStatus.connected ? 'outline' : 'default'}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando QR...
                </>
              ) : whatsappStatus.connected ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Conectado
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          </div>

          {/* QR Code */}
          {whatsappStatus.qr_code && !whatsappStatus.connected && (
            <div className="border rounded-lg p-6 bg-white flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code abaixo com seu WhatsApp
              </p>
              <div className="relative w-64 h-64">
                <Image
                  src={`data:image/png;base64,${whatsappStatus.qr_code}`}
                  alt="QR Code"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                  Atualizar QR Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                {isRealtimeConnected ? (
                  <>
                    <Radio className="h-3 w-3 text-green-600 animate-pulse" />
                    O status atualiza automaticamente em tempo real
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Aguardando conexão realtime...
                  </>
                )}
              </p>
            </div>
          )}

          {/* Mensagem quando não há QR e não está conectado */}
          {!whatsappStatus.qr_code && !whatsappStatus.connected && whatsappStatus.status !== 'connecting' && (
            <div className="border rounded-lg p-4 bg-muted/50 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique em &quot;Conectar&quot; para gerar um QR Code e vincular seu WhatsApp
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agente de IA
          </CardTitle>
          <CardDescription>
            Configure o comportamento do agente de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="agent-toggle">Agente Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o agente responde automaticamente às mensagens
              </p>
            </div>
            <CinematicGlowToggle
              checked={agentEnabled}
              onCheckedChange={handleToggleAgent}
              disabled={savingAgent}
              showLabels
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Informações do Agente</h4>
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome do Agente</span>
                <span>Ana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modelo de IA</span>
                <span>Claude Sonnet 4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contexto Máximo</span>
                <span>20 mensagens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delay de Resposta</span>
                <span>1.2 segundos</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Palavras de Escalação</h4>
            <p className="text-sm text-muted-foreground">
              Quando o cliente mencionar estas palavras, a conversa é transferida para humano:
            </p>
            <div className="flex flex-wrap gap-2">
              {['humano', 'atendente', 'pessoa', 'reclamação', 'cancelar'].map((word) => (
                <Badge key={word} variant="outline">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Informações da Instância
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instância Evolution</span>
              <code className="bg-muted px-2 py-1 rounded">
                {whatsappStatus.instance || 'Decora-agent'}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado Evolution API</span>
              <Badge variant="outline">
                {whatsappStatus.evolution_state || 'unknown'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versão do Sistema</span>
              <span>1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
