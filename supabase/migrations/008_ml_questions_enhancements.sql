-- =====================================================
-- MIGRATION: ML Questions Enhancements
-- Adiciona campos para controle de IA e exibição de perguntas
-- =====================================================

-- Campos para controle de IA em perguntas
ALTER TABLE dc_ml_questions 
  ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS item_title TEXT;

-- Campo para controle de IA por buyer (em conversas ML)
ALTER TABLE dc_ml_conversations
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;

-- Índice para busca de perguntas por buyer
CREATE INDEX IF NOT EXISTS idx_ml_questions_buyer ON dc_ml_questions(buyer_id);

-- Índice para busca de perguntas que precisam revisão
CREATE INDEX IF NOT EXISTS idx_ml_questions_review ON dc_ml_questions(needs_human_review) WHERE needs_human_review = TRUE;

-- Habilitar Realtime para perguntas
ALTER PUBLICATION supabase_realtime ADD TABLE dc_ml_questions;

-- Comentários
COMMENT ON COLUMN dc_ml_questions.needs_human_review IS 'Indica se a pergunta precisa de revisão humana (medida não padrão)';
COMMENT ON COLUMN dc_ml_questions.ai_disabled_reason IS 'Razão pela qual a IA foi desativada para esta pergunta';
COMMENT ON COLUMN dc_ml_questions.item_title IS 'Título do produto no ML para exibição';
COMMENT ON COLUMN dc_ml_conversations.ai_enabled IS 'Se a IA está ativada para este buyer';
