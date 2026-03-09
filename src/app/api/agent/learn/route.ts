import { NextRequest, NextResponse } from 'next/server'
import { processCompletedConversations } from '@/lib/services/learning-pipeline.service'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Processar conversas do dia anterior
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    console.log(`[Learning Cron] Processing conversations from ${dateStr}...`)

    const result = await processCompletedConversations(dateStr)

    console.log(`[Learning Cron] Done: ${result.processed} processed, ${result.insightsExtracted} insights, ${result.errors} errors`)

    return NextResponse.json({
      date: dateStr,
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Learning Cron] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'learning-pipeline-cron',
    description: 'Processes completed conversations and extracts knowledge insights',
    timestamp: new Date().toISOString()
  })
}
