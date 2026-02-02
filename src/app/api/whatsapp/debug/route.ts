import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEvolutionProvider, EvolutionProvider } from '@/lib/providers/evolution'

/**
 * Endpoint de debug para verificar a configuração da integração WhatsApp
 * 
 * Retorna:
 * - Estado da conexão na Evolution API
 * - Configuração do webhook
 * - Dados salvos no banco
 * - Configurações do ambiente
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const evolution = getEvolutionProvider()
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'decora-main'

    // Buscar todas informações em paralelo
    const [connectionStateResult, webhookResult, instancesResult, dbConnectionResult] = await Promise.allSettled([
      evolution.getConnectionState(instanceName),
      evolution.getWebhook(instanceName),
      evolution.fetchInstances(),
      supabase.from('dc_whatsapp_connections').select('*').eq('instance_name', instanceName).single()
    ])

    // Processar resultados
    const connectionState = connectionStateResult.status === 'fulfilled' 
      ? connectionStateResult.value 
      : { error: connectionStateResult.reason?.message || 'Failed to get connection state' }
    
    const webhook = webhookResult.status === 'fulfilled'
      ? webhookResult.value as { url?: string; [key: string]: unknown } | null
      : { error: webhookResult.reason?.message || 'Failed to get webhook' }
    
    const instances = instancesResult.status === 'fulfilled'
      ? instancesResult.value
      : { error: instancesResult.reason?.message || 'Failed to fetch instances' }
    
    const dbConnection = dbConnectionResult.status === 'fulfilled'
      ? dbConnectionResult.value.data
      : null

    // Montar resposta
    const webhookUrl = process.env.WEBHOOK_URL || 
                       `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`

    // Extrair o estado corretamente (suporta formato novo e antigo)
    const extractedState = connectionState && 'instance' in connectionState
      ? EvolutionProvider.extractState(connectionState)
      : 'unknown'

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      instance_name: instanceName,
      
      evolution_api: {
        url: process.env.EVOLUTION_API_URL,
        connection_state: connectionState,
        extracted_state: extractedState,
        webhook_config: webhook,
        all_instances: instances
      },
      
      database: {
        connection: dbConnection,
        status: dbConnection?.status || 'not_found',
        has_qr_code: !!dbConnection?.qr_code
      },
      
      environment: {
        evolution_api_url: process.env.EVOLUTION_API_URL || 'NOT SET',
        evolution_instance_name: process.env.EVOLUTION_INSTANCE_NAME || 'NOT SET (using default)',
        webhook_url: webhookUrl,
        app_url: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
        is_localhost: (process.env.NEXT_PUBLIC_APP_URL || '').includes('localhost')
      },
      
      diagnostics: {
        webhook_reachable: !webhookUrl.includes('localhost'),
        instance_exists: connectionStateResult.status === 'fulfilled',
        is_connected: extractedState === 'open',
        has_webhook_configured: webhookResult.status === 'fulfilled' && webhook && 'url' in webhook && !!webhook.url,
        webhook_url_matches: webhook && 'url' in webhook && webhook.url === webhookUrl
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
