-- =====================================================
-- Migration 011: RAG System with pgvector
-- =====================================================

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum para fonte do conhecimento
CREATE TYPE dc_knowledge_source AS ENUM (
  'faq',
  'product',
  'installation',
  'measurement',
  'conversation_insight',
  'feedback_correction',
  'manual'
);

-- Enum para status do conhecimento
CREATE TYPE dc_knowledge_status AS ENUM (
  'active',
  'auto_applied',
  'pending_review',
  'archived'
);

-- Tabela principal de embeddings
CREATE TABLE dc_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source dc_knowledge_source NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  score FLOAT DEFAULT 1.0,
  status dc_knowledge_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice HNSW para busca vetorial rápida
CREATE INDEX idx_knowledge_embeddings_hnsw ON dc_knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índices auxiliares
CREATE INDEX idx_knowledge_embeddings_source ON dc_knowledge_embeddings(source);
CREATE INDEX idx_knowledge_embeddings_status ON dc_knowledge_embeddings(status);
CREATE INDEX idx_knowledge_embeddings_score ON dc_knowledge_embeddings(score DESC);
CREATE INDEX idx_knowledge_embeddings_metadata ON dc_knowledge_embeddings USING gin(metadata);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_knowledge_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_embeddings_updated_at
  BEFORE UPDATE ON dc_knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_embeddings_updated_at();

-- Função de busca por similaridade coseno
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source dc_knowledge_source,
  title TEXT,
  content TEXT,
  metadata JSONB,
  score FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source,
    ke.title,
    ke.content,
    ke.metadata,
    ke.score,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM dc_knowledge_embeddings ke
  WHERE ke.status = 'active'
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Tabela para rastrear conversas já processadas pelo learning pipeline
CREATE TABLE dc_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  insights_extracted INT DEFAULT 0,
  processing_status TEXT DEFAULT 'completed',
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_log_conversation ON dc_learning_log(conversation_id);
CREATE INDEX idx_learning_log_processed_at ON dc_learning_log(processed_at DESC);

-- RLS
ALTER TABLE dc_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_learning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to knowledge embeddings"
  ON dc_knowledge_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to learning log"
  ON dc_learning_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read knowledge embeddings"
  ON dc_knowledge_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read learning log"
  ON dc_learning_log
  FOR SELECT
  TO authenticated
  USING (true);
