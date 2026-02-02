import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEvolutionProvider, EvolutionProvider } from '@/lib/providers/evolution'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const evolution = getEvolutionProvider()
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'decora-main'
    
    // URL do webhook (precisa ser pública para a Evolution API conseguir chamar)
    const webhookUrl = process.env.WEBHOOK_URL || 
                       `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`

    console.log(`Connecting WhatsApp instance: ${instanceName}`)
    console.log(`Webhook URL: ${webhookUrl}`)

    // Verificar se instância existe
    let instanceExists = false
    try {
      const stateResponse = await evolution.getConnectionState(instanceName)
      instanceExists = true
      const currentState = EvolutionProvider.extractState(stateResponse)
      console.log(`Instance ${instanceName} exists, current state: ${currentState}`)
      
      // Se já está conectado, retornar sucesso
      if (currentState === 'open') {
        // Sincronizar com banco
        await supabase.from('dc_whatsapp_connections').upsert({
          instance_name: instanceName,
          status: 'connected',
          qr_code: null,
          connected_at: new Date().toISOString()
        }, { onConflict: 'instance_name' })
        
        return NextResponse.json({
          success: true,
          instance: instanceName,
          already_connected: true,
          message: 'WhatsApp já está conectado'
        })
      }
    } catch {
      instanceExists = false
      console.log(`Instance ${instanceName} does not exist, will create...`)
    }

    // Se não existe, criar instância
    if (!instanceExists) {
      console.log('Creating new instance...')
      await evolution.createInstance(instanceName)
    }

    // IMPORTANTE: Configurar webhook para receber eventos
    console.log('Configuring webhook...')
    try {
      await evolution.setWebhook(webhookUrl, [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT'
      ], instanceName)
      console.log('Webhook configured successfully')
    } catch (webhookError) {
      console.error('Error configuring webhook:', webhookError)
      // Continuar mesmo se falhar - webhook global pode estar configurado
    }

    // Obter QR code
    console.log('Getting QR code...')
    const qrData = await evolution.connect(instanceName)
    
    // Normalizar base64 (remover prefixo se existir)
    const qrBase64 = qrData.base64?.replace(/^data:image\/[^;]+;base64,/, '') || null

    // Salvar/atualizar conexão no banco
    await supabase.from('dc_whatsapp_connections').upsert({
      instance_name: instanceName,
      qr_code: qrBase64,
      status: 'connecting'
    }, { onConflict: 'instance_name' })

    return NextResponse.json({
      success: true,
      instance: instanceName,
      qr_code: qrBase64,
      pairing_code: qrData.pairingCode,
      qr_count: qrData.count || 1,
      webhook_url: webhookUrl
    })

  } catch (error) {
    console.error('Error connecting WhatsApp:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'decora-main'
    const evolution = getEvolutionProvider()

    // Verificar status na Evolution API PRIMEIRO
    let evolutionState = 'unknown'
    try {
      const evolutionStatus = await evolution.getConnectionState(instanceName)
      evolutionState = EvolutionProvider.extractState(evolutionStatus)
    } catch (error) {
      console.error('Error getting Evolution state:', error)
      evolutionState = 'unknown'
    }

    const isConnected = evolutionState === 'open'

    // Buscar conexão do banco
    const { data: connection } = await supabase
      .from('dc_whatsapp_connections')
      .select('*')
      .eq('instance_name', instanceName)
      .single()

    // IMPORTANTE: Sincronizar status se Evolution diz conectado mas banco não
    if (isConnected && connection?.status !== 'connected') {
      console.log('Syncing connection status to database (Evolution says connected)...')
      await supabase.from('dc_whatsapp_connections').upsert({
        instance_name: instanceName,
        status: 'connected',
        qr_code: null,
        connected_at: new Date().toISOString()
      }, { onConflict: 'instance_name' })
    }

    // Se desconectou, atualizar banco
    if (evolutionState === 'close' && connection?.status === 'connected') {
      console.log('Syncing connection status to database (Evolution says disconnected)...')
      await supabase.from('dc_whatsapp_connections').upsert({
        instance_name: instanceName,
        status: 'disconnected',
        qr_code: null
      }, { onConflict: 'instance_name' })
    }

    // Se não há registro no banco
    if (!connection) {
      return NextResponse.json({
        connected: isConnected,
        status: isConnected ? 'connected' : 'not_configured',
        instance: instanceName,
        evolution_state: evolutionState
      })
    }

    // Determinar status final
    const finalStatus = isConnected ? 'connected' : connection.status

    return NextResponse.json({
      connected: isConnected,
      status: finalStatus,
      instance: instanceName,
      phone_number: connection.phone_number,
      qr_code: !isConnected && connection.status === 'connecting' ? connection.qr_code : null,
      connected_at: connection.connected_at,
      evolution_state: evolutionState
    })

  } catch (error) {
    console.error('Error getting WhatsApp status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}
