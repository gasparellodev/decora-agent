import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/mercadolivre/toggle-ai
 * Ativa ou desativa a IA para um buyer específico do ML
 */
export async function POST(request: NextRequest) {
  try {
    const { buyerId, enabled } = await request.json()

    // Validar campos obrigatórios
    if (!buyerId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'buyerId e enabled são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verificar se já existe registro para este buyer
    const { data: existing } = await supabase
      .from('dc_ml_conversations')
      .select('id, buyer_name')
      .eq('buyer_id', buyerId)
      .single()

    if (existing) {
      // Atualizar registro existente
      const { error } = await supabase
        .from('dc_ml_conversations')
        .update({ ai_enabled: enabled })
        .eq('buyer_id', buyerId)

      if (error) {
        console.error('[Toggle AI] Erro ao atualizar:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    } else {
      // Criar novo registro de controle
      const { error } = await supabase
        .from('dc_ml_conversations')
        .insert({
          pack_id: `buyer_${buyerId}`,
          buyer_id: buyerId,
          ai_enabled: enabled,
          status: 'active'
        })

      if (error) {
        console.error('[Toggle AI] Erro ao criar:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }

    console.log(`[Toggle AI] IA ${enabled ? 'ativada' : 'desativada'} para buyer:`, buyerId)

    return NextResponse.json({
      success: true,
      buyerId,
      aiEnabled: enabled
    })
  } catch (error) {
    console.error('[Toggle AI] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mercadolivre/toggle-ai?buyerId=xxx
 * Retorna o status atual da IA para um buyer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerId = searchParams.get('buyerId')

    if (!buyerId) {
      return NextResponse.json(
        { error: 'buyerId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data } = await supabase
      .from('dc_ml_conversations')
      .select('ai_enabled')
      .eq('buyer_id', buyerId)
      .single()

    // Se não existe registro, IA está ativada por padrão
    const aiEnabled = data?.ai_enabled ?? true

    return NextResponse.json({
      buyerId,
      aiEnabled
    })
  } catch (error) {
    console.error('[Toggle AI GET] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
