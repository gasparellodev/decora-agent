import { NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/providers/mercadolivre'

/**
 * GET /api/integrations/mercadolivre/auth
 * Inicia o fluxo OAuth do Mercado Livre
 */
export async function GET() {
  try {
    // Verifica se as credenciais estão configuradas
    if (!process.env.ML_CLIENT_ID || !process.env.ML_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Credenciais do Mercado Livre não configuradas' },
        { status: 500 }
      )
    }

    const authUrl = getAuthorizationUrl()
    
    // Redireciona para a página de autorização do ML
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[ML Auth] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação' },
      { status: 500 }
    )
  }
}
