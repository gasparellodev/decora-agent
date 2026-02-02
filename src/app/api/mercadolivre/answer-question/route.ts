import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { answerQuestion } from '@/lib/providers/mercadolivre'
import { formatForML } from '@/lib/utils/ml-formatter'

/**
 * POST /api/mercadolivre/answer-question
 * Responde uma pergunta do ML manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const { questionId, answerText } = await request.json()

    // Validar campos obrigatórios
    if (!questionId || !answerText) {
      return NextResponse.json(
        { error: 'questionId e answerText são obrigatórios' },
        { status: 400 }
      )
    }

    // Formatar resposta para 350 caracteres
    const formattedAnswer = formatForML(answerText)
    console.log('[Answer Question] Resposta formatada:', formattedAnswer.length, 'chars')

    const supabase = createAdminClient()

    // Buscar pergunta no banco
    const { data: question, error: fetchError } = await supabase
      .from('dc_ml_questions')
      .select('question_id, status, buyer_id')
      .eq('id', questionId)
      .single()

    if (fetchError || !question) {
      console.error('[Answer Question] Pergunta não encontrada:', fetchError)
      return NextResponse.json(
        { error: 'Pergunta não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já foi respondida
    if (question.status === 'answered') {
      return NextResponse.json(
        { error: 'Pergunta já foi respondida' },
        { status: 400 }
      )
    }

    // Enviar resposta para o Mercado Livre
    console.log('[Answer Question] Enviando resposta para ML...')
    const result = await answerQuestion(question.question_id, formattedAnswer)

    if (!result.success) {
      console.error('[Answer Question] Erro ao enviar para ML:', result.error)
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar resposta para o Mercado Livre' },
        { status: 500 }
      )
    }

    // Atualizar pergunta no banco
    const { error: updateError } = await supabase
      .from('dc_ml_questions')
      .update({
        answer_text: formattedAnswer,
        status: 'answered',
        answered_at: new Date().toISOString(),
        needs_human_review: false // Limpar flag após resposta manual
      })
      .eq('id', questionId)

    if (updateError) {
      console.error('[Answer Question] Erro ao atualizar banco:', updateError)
      // Não retornar erro pois a resposta foi enviada
    }

    console.log('[Answer Question] ✅ Pergunta respondida manualmente com sucesso')

    return NextResponse.json({
      success: true,
      questionId,
      answerLength: formattedAnswer.length
    })
  } catch (error) {
    console.error('[Answer Question] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
