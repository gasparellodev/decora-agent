import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return _openai
}

function getSupabase() { return createAdminClient() }

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

// Cache de embeddings com TTL para evitar chamadas repetidas à OpenAI
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos
const CACHE_MAX_SIZE = 200

interface CacheEntry {
  embedding: number[]
  createdAt: number
}

const embeddingCache = new Map<string, CacheEntry>()

function normalizeForCache(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 200)
}

function getCachedEmbedding(text: string): number[] | null {
  const key = normalizeForCache(text)
  const entry = embeddingCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    embeddingCache.delete(key)
    return null
  }
  return entry.embedding
}

function setCachedEmbedding(text: string, embedding: number[]): void {
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value
    if (firstKey) embeddingCache.delete(firstKey)
  }
  embeddingCache.set(normalizeForCache(text), { embedding, createdAt: Date.now() })
}

// Heurística para decidir se uma mensagem precisa de RAG
const SKIP_RAG_PATTERNS = /^(oi|olá|ola|bom dia|boa tarde|boa noite|ok|sim|não|nao|obrigad[oa]|valeu|blz|beleza|tá|ta|entendi|perfeito|certo|show|top|hm+|ah+|legal|massa|pode ser|isso|exato|👍|😊|🙏)[\s!?.]*$/i

export function shouldSkipRAG(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length < 4) return true
  if (SKIP_RAG_PATTERNS.test(trimmed)) return true
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount <= 2 && !trimmed.includes('?')) return true
  return false
}

// Cache de resultados RAG completos (query -> articles)
const RAG_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutos
const RAG_CACHE_MAX_SIZE = 50

interface RAGCacheEntry {
  articles: KnowledgeArticle[]
  createdAt: number
}

const ragCache = new Map<string, RAGCacheEntry>()

function getCachedRAG(query: string): KnowledgeArticle[] | null {
  const key = normalizeForCache(query)
  const entry = ragCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > RAG_CACHE_TTL_MS) {
    ragCache.delete(key)
    return null
  }
  return entry.articles
}

function setCachedRAG(query: string, articles: KnowledgeArticle[]): void {
  if (ragCache.size >= RAG_CACHE_MAX_SIZE) {
    const firstKey = ragCache.keys().next().value
    if (firstKey) ragCache.delete(firstKey)
  }
  ragCache.set(normalizeForCache(query), { articles, createdAt: Date.now() })
}

export type KnowledgeSource =
  | 'faq'
  | 'product'
  | 'installation'
  | 'measurement'
  | 'conversation_insight'
  | 'feedback_correction'
  | 'manual'

export type KnowledgeStatus = 'active' | 'auto_applied' | 'pending_review' | 'archived'

export interface KnowledgeArticle {
  id: string
  source: KnowledgeSource
  source_id: string | null
  title: string
  content: string
  metadata: Record<string, unknown>
  score: number
  status: KnowledgeStatus
  similarity?: number
  created_at: string
  updated_at: string
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const cached = getCachedEmbedding(text)
  if (cached) return cached

  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.substring(0, 8000),
    dimensions: EMBEDDING_DIMENSIONS
  })

  const embedding = response.data[0].embedding
  setCachedEmbedding(text, embedding)
  return embedding
}

export async function upsertKnowledgeEmbedding(params: {
  source: KnowledgeSource
  sourceId?: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  status?: KnowledgeStatus
}): Promise<string | null> {
  try {
    const embedding = await generateEmbedding(`${params.title}\n\n${params.content}`)

    const { data, error } = await getSupabase()
      .from('dc_knowledge_embeddings')
      .insert({
        source: params.source,
        source_id: params.sourceId || null,
        title: params.title,
        content: params.content,
        embedding: JSON.stringify(embedding),
        metadata: params.metadata || {},
        status: params.status || 'active'
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  } catch (error) {
    console.error('[Embedding] Error upserting knowledge:', error)
    return null
  }
}

export async function searchSimilarKnowledge(
  query: string,
  limit: number = 5,
  threshold: number = 0.7
): Promise<KnowledgeArticle[]> {
  try {
    // Cache de resultado RAG completo
    const cachedResult = getCachedRAG(query)
    if (cachedResult) {
      console.log('[RAG] Cache hit for query')
      return cachedResult
    }

    const queryEmbedding = await generateEmbedding(query)

    const { data, error } = await getSupabase()
      .rpc('match_knowledge', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: limit,
        match_threshold: threshold
      })

    if (error) throw error

    const articles = (data || []) as KnowledgeArticle[]
    setCachedRAG(query, articles)
    return articles
  } catch (error) {
    console.error('[Embedding] Error searching similar knowledge:', error)
    return []
  }
}

export async function incrementKnowledgeScore(id: string, delta: number): Promise<boolean> {
  try {
    const { data: current } = await getSupabase()
      .from('dc_knowledge_embeddings')
      .select('score')
      .eq('id', id)
      .single()

    if (!current) return false

    const newScore = Math.max(0.1, Math.min(10, (current.score || 1) + delta))

    const { error } = await getSupabase()
      .from('dc_knowledge_embeddings')
      .update({ score: newScore })
      .eq('id', id)

    return !error
  } catch (error) {
    console.error('[Embedding] Error incrementing score:', error)
    return false
  }
}

export async function bulkGenerateEmbeddings(
  items: Array<{
    source: KnowledgeSource
    sourceId?: string
    title: string
    content: string
    metadata?: Record<string, unknown>
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const item of items) {
    try {
      const id = await upsertKnowledgeEmbedding(item)
      if (id) {
        success++
      } else {
        failed++
      }
      // Rate limiting
      await new Promise(r => setTimeout(r, 200))
    } catch {
      failed++
    }
  }

  console.log(`[Embedding] Bulk insert: ${success} success, ${failed} failed`)
  return { success, failed }
}

export function formatRAGContext(articles: KnowledgeArticle[]): string {
  if (!articles || articles.length === 0) return ''

  return articles
    .map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`)
    .join('\n\n---\n\n')
}

export async function getKnowledgeStats(): Promise<{
  total: number
  bySource: Record<string, number>
  avgScore: number
}> {
  try {
    const { data, error } = await getSupabase()
      .from('dc_knowledge_embeddings')
      .select('source, score')
      .eq('status', 'active')

    if (error || !data) return { total: 0, bySource: {}, avgScore: 0 }

    const bySource: Record<string, number> = {}
    let totalScore = 0

    for (const item of data) {
      bySource[item.source] = (bySource[item.source] || 0) + 1
      totalScore += item.score || 1
    }

    return {
      total: data.length,
      bySource,
      avgScore: data.length > 0 ? totalScore / data.length : 0
    }
  } catch {
    return { total: 0, bySource: {}, avgScore: 0 }
  }
}
