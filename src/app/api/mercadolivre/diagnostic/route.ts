import { NextResponse } from 'next/server'
import { diagnose, getItem, extractDimensionsFromTitle } from '@/lib/providers/mercadolivre'

/**
 * GET /api/mercadolivre/diagnostic
 * Endpoint de diagnóstico para verificar configuração do Mercado Livre
 */
export async function GET() {
  try {
    console.log('[ML Diagnostic] Iniciando diagnóstico...')
    
    const diagnostic = await diagnose()
    
    // Informações do ambiente
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'não configurado',
      mlClientIdSet: !!process.env.ML_CLIENT_ID,
      mlClientSecretSet: !!process.env.ML_CLIENT_SECRET,
      mlRedirectUri: process.env.ML_REDIRECT_URI || 'não configurado',
      mlUserId: process.env.ML_USER_ID || 'não configurado',
      melhorEnvioTokenSet: !!process.env.MELHOR_ENVIO_TOKEN,
      melhorEnvioCepOrigem: process.env.MELHOR_ENVIO_CEP_ORIGEM || '01310100',
      melhorEnvioSandbox: process.env.MELHOR_ENVIO_SANDBOX === 'true'
    }

    // Webhooks esperados
    const expectedWebhooks = {
      questions: `${environment.appUrl}/api/webhooks/mercadolivre`,
      messages: `${environment.appUrl}/api/webhooks/mercadolivre`,
      orders: `${environment.appUrl}/api/webhooks/mercadolivre`,
      shipments: `${environment.appUrl}/api/webhooks/mercadolivre`
    }

    // Status geral
    const healthy = diagnostic.connected && 
                    diagnostic.tokenValid === true && 
                    diagnostic.errors.length === 0

    console.log('[ML Diagnostic] Resultado:', { healthy, errors: diagnostic.errors })

    return NextResponse.json({
      healthy,
      timestamp: new Date().toISOString(),
      connection: diagnostic,
      environment,
      expectedWebhooks,
      instructions: {
        step1: 'Acesse https://developers.mercadolivre.com.br/devcenter',
        step2: 'Configure a URL de Notificação: ' + expectedWebhooks.questions,
        step3: 'Habilite os tópicos: questions, orders_v2, messages, shipments',
        step4: `Autorize o app acessando: ${environment.appUrl}/api/integrations/mercadolivre/auth`,
        step5: 'Teste fazendo uma pergunta em um anúncio'
      }
    })
  } catch (error) {
    console.error('[ML Diagnostic] Erro:', error)
    return NextResponse.json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/mercadolivre/diagnostic
 * Testa extração de dimensões de um título ou busca item
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, itemId } = body

    if (title) {
      // Testar extração de dimensões do título
      const dimensions = extractDimensionsFromTitle(title)
      return NextResponse.json({
        input: title,
        dimensions: dimensions || { width: 100, height: 50, source: 'default' },
        found: dimensions !== null
      })
    }

    if (itemId) {
      // Buscar item real
      const item = await getItem(itemId)
      const dimensions = extractDimensionsFromTitle(item.title)
      
      return NextResponse.json({
        itemId,
        title: item.title,
        price: item.price,
        status: item.status,
        dimensions: dimensions || { width: 100, height: 50, source: 'default' },
        attributes: item.attributes.slice(0, 10), // Limitar atributos
        shipping: item.shipping
      })
    }

    return NextResponse.json({
      error: 'Informe "title" ou "itemId" no body'
    }, { status: 400 })
  } catch (error) {
    console.error('[ML Diagnostic] Erro no POST:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
