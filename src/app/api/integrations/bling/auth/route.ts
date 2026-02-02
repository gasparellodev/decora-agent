import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlingProvider } from '@/lib/providers/bling'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bling = getBlingProvider()
    
    // Gerar state para validação
    const state = uuidv4()
    
    // Salvar state na sessão (você pode usar cookies ou banco)
    // Por simplicidade, vamos incluir no redirect
    
    const authUrl = bling.getAuthUrl(state)

    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('Error initiating Bling auth:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate auth' },
      { status: 500 }
    )
  }
}
