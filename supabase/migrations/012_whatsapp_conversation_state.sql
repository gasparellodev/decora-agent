-- =====================================================
-- Migration 012: WhatsApp Conversation State Machine
-- Adiciona maquina de estados para conversas WhatsApp
-- Persiste fatos coletados para nao re-perguntar
-- =====================================================

-- 1. Adicionar estado da conversa
ALTER TABLE dc_conversations
  ADD COLUMN IF NOT EXISTS conversation_state TEXT DEFAULT 'greeting';

-- 2. Fatos coletados persistidos (modelo, medidas, vidro, cor, etc.)
ALTER TABLE dc_conversations
  ADD COLUMN IF NOT EXISTS collected_facts JSONB DEFAULT '{}'::jsonb;

-- 3. Intencao detectada do cliente
ALTER TABLE dc_conversations
  ADD COLUMN IF NOT EXISTS detected_intent TEXT DEFAULT 'unknown';

-- 4. Tabela de log de transicoes de estado (para debug)
CREATE TABLE IF NOT EXISTS dc_conversation_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dc_conversations(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  trigger_reason TEXT,
  facts_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_log_conv ON dc_conversation_state_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_state_log_created ON dc_conversation_state_log(created_at DESC);

-- 5. Index para busca por estado
CREATE INDEX IF NOT EXISTS idx_conversations_state ON dc_conversations(conversation_state);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON dc_conversations(detected_intent);

-- 6. Index GIN para collected_facts
CREATE INDEX IF NOT EXISTS idx_conversations_facts ON dc_conversations USING GIN (collected_facts);

-- 7. RLS para state_log
ALTER TABLE dc_conversation_state_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read state_log"
  ON dc_conversation_state_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage state_log"
  ON dc_conversation_state_log FOR ALL TO service_role USING (true);
