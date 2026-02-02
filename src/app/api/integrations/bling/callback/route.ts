import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBlingProvider } from '@/lib/providers/bling'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Bling OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=bling_auth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=no_code`
      )
    }

    const bling = getBlingProvider()
    const supabase = createAdminClient()

    // Trocar code por tokens
    const tokens = await bling.exchangeCode(code)

    // Salvar tokens no banco
    await supabase.from('dc_integrations').upsert({
      provider: 'bling',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      is_active: true,
      metadata: {
        connected_at: new Date().toISOString()
      }
    }, { onConflict: 'provider' })

    // Redirecionar de volta para a página de integrações
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?success=bling_connected`
    )

  } catch (error) {
    console.error('Error in Bling callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=bling_callback_failed`
    )
  }
}
