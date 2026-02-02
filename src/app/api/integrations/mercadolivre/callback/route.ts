import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getMe } from '@/lib/providers/mercadolivre'

/**
 * GET /api/integrations/mercadolivre/callback
 * Callback do OAuth do Mercado Livre
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Se houve erro na autorização
    if (error) {
      console.error('[ML Callback] Erro de autorização:', error)
      return NextResponse.redirect(
        new URL('/integrations?error=ml_auth_denied', request.url)
      )
    }

    // Verifica se o código foi fornecido
    if (!code) {
      console.error('[ML Callback] Código não fornecido')
      return NextResponse.redirect(
        new URL('/integrations?error=ml_no_code', request.url)
      )
    }

    // Troca o código por tokens
    const tokens = await exchangeCodeForTokens(code)
    console.log('[ML Callback] Tokens obtidos com sucesso para user:', tokens.user_id)

    // Busca informações do usuário para confirmar
    try {
      const userInfo = await getMe()
      console.log('[ML Callback] Usuário conectado:', userInfo.nickname)
    } catch (userError) {
      console.warn('[ML Callback] Não foi possível obter info do usuário:', userError)
    }

    // Redireciona para a página de integrações com sucesso
    return NextResponse.redirect(
      new URL('/integrations?success=ml_connected', request.url)
    )
  } catch (error) {
    console.error('[ML Callback] Erro ao processar callback:', error)
    return NextResponse.redirect(
      new URL('/integrations?error=ml_callback_failed', request.url)
    )
  }
}
