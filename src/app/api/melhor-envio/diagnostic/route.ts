import { NextRequest, NextResponse } from 'next/server'
import { 
  calculateWindowFreight, 
  calculatePackageDimensions,
  calculateWindowWeight,
  isValidCep,
  formatFreightValue,
  formatDeliveryTime
} from '@/lib/providers/melhor-envio'

/**
 * GET /api/melhor-envio/diagnostic
 * Verifica configuração do Melhor Envio
 */
export async function GET() {
  console.log('[ME Diagnostic] ========== DIAGNÓSTICO ==========')
  
  const tokenSet = !!process.env.MELHOR_ENVIO_TOKEN
  const sandbox = process.env.MELHOR_ENVIO_SANDBOX === 'true'
  
  const config = {
    tokenSet,
    tokenLength: process.env.MELHOR_ENVIO_TOKEN?.length || 0,
    tokenPreview: tokenSet 
      ? `${process.env.MELHOR_ENVIO_TOKEN?.slice(0, 30)}...${process.env.MELHOR_ENVIO_TOKEN?.slice(-10)}`
      : 'NÃO CONFIGURADO',
    sandbox,
    cepOrigem: process.env.MELHOR_ENVIO_CEP_ORIGEM || '01310100 (padrão)',
    apiUrl: sandbox 
      ? 'https://sandbox.melhorenvio.com.br/api/v2'
      : 'https://melhorenvio.com.br/api/v2'
  }

  const errors: string[] = []
  
  if (!tokenSet) {
    errors.push('MELHOR_ENVIO_TOKEN não configurado')
  }
  
  if (!process.env.MELHOR_ENVIO_CEP_ORIGEM) {
    errors.push('MELHOR_ENVIO_CEP_ORIGEM não configurado (usando padrão 01310100)')
  }

  // Verificar se o CEP de origem é válido
  const cepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM || '01310100'
  if (!isValidCep(cepOrigem)) {
    errors.push(`CEP de origem inválido: ${cepOrigem}`)
  }

  console.log('[ME Diagnostic] Config:', config)
  console.log('[ME Diagnostic] Errors:', errors)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    healthy: tokenSet && errors.length === 0,
    config,
    errors,
    warnings: sandbox ? ['Usando ambiente SANDBOX - token deve ser de sandbox'] : [],
    testInstructions: {
      method: 'POST',
      url: '/api/melhor-envio/diagnostic',
      body: {
        cep: '13052658',
        width: 100,
        height: 50
      },
      description: 'Testa cálculo de frete para um CEP específico'
    }
  })
}

/**
 * POST /api/melhor-envio/diagnostic
 * Testa cálculo de frete real
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { cep, width = 100, height = 50, quantity = 1 } = body

    console.log('[ME Diagnostic] ========== TESTE DE FRETE ==========')
    console.log('[ME Diagnostic] Input:', { cep, width, height, quantity })

    // Validar CEP
    if (!cep) {
      return NextResponse.json({ 
        error: 'CEP é obrigatório',
        example: { cep: '13052658', width: 100, height: 50 }
      }, { status: 400 })
    }

    if (!isValidCep(cep)) {
      return NextResponse.json({ 
        error: `CEP inválido: ${cep}. Deve ter 8 dígitos.`
      }, { status: 400 })
    }

    // Calcular dimensões e peso (para mostrar no diagnóstico)
    const dimensions = calculatePackageDimensions(width, height)
    const weight = calculateWindowWeight(width, height)

    console.log('[ME Diagnostic] Dimensões calculadas:', dimensions)
    console.log('[ME Diagnostic] Peso calculado:', weight, 'kg')

    // Verificar se é SP (frete fixo)
    const cleanCep = cep.replace(/\D/g, '')
    const isSP = cleanCep.startsWith('0')
    console.log('[ME Diagnostic] CEP limpo:', cleanCep, '| É SP?', isSP)

    // Calcular frete
    console.log('[ME Diagnostic] Chamando calculateWindowFreight...')
    const result = await calculateWindowFreight(cep, width, height, quantity)
    console.log('[ME Diagnostic] Resultado:', result)

    const elapsed = Date.now() - startTime

    // Resposta detalhada
    const response = {
      success: !result.error,
      elapsedMs: elapsed,
      input: {
        cep,
        cepLimpo: cleanCep,
        largura: width,
        altura: height,
        quantidade: quantity
      },
      calculated: {
        dimensoes: `${dimensions.width}x${dimensions.height}x${dimensions.length}cm`,
        peso: `${weight}kg`,
        isSaoPaulo: isSP
      },
      result: {
        valor: result.value,
        valorFormatado: formatFreightValue(result.value),
        prazo: result.estimatedDays,
        prazoFormatado: formatDeliveryTime(result.estimatedDays, result.isSP),
        transportadora: result.carrier || (isSP ? 'Entrega Própria Decora' : 'N/A'),
        error: result.error
      },
      config: {
        sandbox: process.env.MELHOR_ENVIO_SANDBOX === 'true',
        cepOrigem: process.env.MELHOR_ENVIO_CEP_ORIGEM || '01310100'
      }
    }

    console.log('[ME Diagnostic] ========== FIM ==========')

    return NextResponse.json(response)
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('[ME Diagnostic] ERRO:', error)
    
    return NextResponse.json({
      success: false,
      elapsedMs: elapsed,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
