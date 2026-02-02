-- =====================================================
-- MIGRATION: Sistema de Feedback via Reações WhatsApp
-- Permite que clientes avaliem mensagens com ❌ ou ✅
-- =====================================================

-- Tabela principal de feedbacks
CREATE TABLE IF NOT EXISTS dc_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  message_id UUID REFERENCES dc_messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES dc_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES dc_leads(id) ON DELETE SET NULL,
  
  -- Tipo de reação
  reaction VARCHAR(20) NOT NULL CHECK (reaction IN ('negative', 'positive')),
  reaction_emoji VARCHAR(10), -- Emoji usado na reação (❌, ✅, etc)
  
  -- Conteúdo
  original_content TEXT NOT NULL, -- Mensagem original do agente
  corrected_content TEXT, -- Mensagem corrigida (se aplicável)
  feedback_text TEXT, -- O que o cliente explicou que estava errado
  
  -- Análise da IA
  error_type VARCHAR(50), -- factual, tone, information, product_info, measurement, other
  ai_analysis JSONB, -- Análise completa da IA
  suggested_prompt_changes TEXT, -- Sugestões de mudança no prompt
  suggested_kb_updates TEXT, -- Sugestões de atualização na knowledge base
  
  -- Status do feedback
  status VARCHAR(30) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'awaiting_response', 'in_review', 'applied', 'dismissed')),
  
  -- Onde foi aplicada a correção
  applied_to VARCHAR(50)[], -- ['prompt', 'knowledge_base', 'manual', 'none']
  
  -- Metadados
  wpp_message_id VARCHAR(100), -- ID da mensagem no WhatsApp
  reviewed_by UUID, -- Usuário que revisou (se manual)
  review_notes TEXT, -- Notas da revisão manual
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ, -- Quando o cliente respondeu com feedback
  resolved_at TIMESTAMPTZ, -- Quando foi resolvido/aplicado
  
  CONSTRAINT valid_corrected_content CHECK (
    (status = 'applied' AND corrected_content IS NOT NULL) OR 
    status != 'applied'
  )
);

-- Índices para performance
CREATE INDEX idx_feedback_status ON dc_message_feedback(status);
CREATE INDEX idx_feedback_conversation ON dc_message_feedback(conversation_id);
CREATE INDEX idx_feedback_lead ON dc_message_feedback(lead_id);
CREATE INDEX idx_feedback_reaction ON dc_message_feedback(reaction);
CREATE INDEX idx_feedback_created ON dc_message_feedback(created_at DESC);
CREATE INDEX idx_feedback_error_type ON dc_message_feedback(error_type);

-- Tabela para armazenar correções aplicadas ao prompt
CREATE TABLE IF NOT EXISTS dc_prompt_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES dc_message_feedback(id) ON DELETE SET NULL,
  
  -- Tipo de correção
  correction_type VARCHAR(50) NOT NULL 
    CHECK (correction_type IN ('rule_added', 'rule_modified', 'example_added', 'knowledge_updated', 'behavior_changed')),
  
  -- Conteúdo
  description TEXT NOT NULL, -- Descrição da correção
  before_text TEXT, -- Texto antes (se modificação)
  after_text TEXT NOT NULL, -- Texto depois
  
  -- Localização
  prompt_section VARCHAR(100), -- Seção do prompt afetada
  file_path VARCHAR(255), -- Arquivo modificado
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadados
  applied_by UUID,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reverted_at TIMESTAMPTZ,
  reverted_by UUID
);

CREATE INDEX idx_prompt_corrections_active ON dc_prompt_corrections(is_active);
CREATE INDEX idx_prompt_corrections_type ON dc_prompt_corrections(correction_type);

-- Adicionar status 'awaiting_feedback' na tabela de conversas (se não existir)
DO $$ 
BEGIN
  -- Verifica se o constraint existe e remove para recriar
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'dc_conversations_status_check'
  ) THEN
    ALTER TABLE dc_conversations DROP CONSTRAINT dc_conversations_status_check;
  END IF;
  
  -- Adiciona novo constraint com o status awaiting_feedback
  ALTER TABLE dc_conversations 
    ADD CONSTRAINT dc_conversations_status_check 
    CHECK (status IN ('active', 'waiting_human', 'awaiting_feedback', 'resolved', 'closed'));
EXCEPTION
  WHEN others THEN
    -- Se falhar, provavelmente já está correto ou não tem constraint
    NULL;
END $$;

-- Função para obter estatísticas de feedback
CREATE OR REPLACE FUNCTION get_feedback_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_feedbacks BIGINT,
  negative_feedbacks BIGINT,
  positive_feedbacks BIGINT,
  applied_corrections BIGINT,
  pending_reviews BIGINT,
  most_common_error TEXT,
  satisfaction_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE reaction = 'negative') as negative,
      COUNT(*) FILTER (WHERE reaction = 'positive') as positive,
      COUNT(*) FILTER (WHERE status = 'applied') as applied,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_review', 'awaiting_response')) as pending
    FROM dc_message_feedback
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  common_error AS (
    SELECT error_type
    FROM dc_message_feedback
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND error_type IS NOT NULL
    GROUP BY error_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT 
    s.total,
    s.negative,
    s.positive,
    s.applied,
    s.pending,
    ce.error_type,
    CASE 
      WHEN s.total > 0 THEN 
        ROUND((s.positive::NUMERIC / s.total::NUMERIC) * 100, 2)
      ELSE 100.00
    END as satisfaction
  FROM stats s
  LEFT JOIN common_error ce ON TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificar sobre novos feedbacks negativos
CREATE OR REPLACE FUNCTION notify_negative_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reaction = 'negative' THEN
    -- Incrementar contador de feedbacks no dia
    INSERT INTO dc_agent_metrics (date, total_feedbacks_negative)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) 
    DO UPDATE SET total_feedbacks_negative = COALESCE(dc_agent_metrics.total_feedbacks_negative, 0) + 1;
  ELSIF NEW.reaction = 'positive' THEN
    INSERT INTO dc_agent_metrics (date, total_feedbacks_positive)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) 
    DO UPDATE SET total_feedbacks_positive = COALESCE(dc_agent_metrics.total_feedbacks_positive, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar colunas de feedback nas métricas (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dc_agent_metrics' AND column_name = 'total_feedbacks_negative'
  ) THEN
    ALTER TABLE dc_agent_metrics ADD COLUMN total_feedbacks_negative INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dc_agent_metrics' AND column_name = 'total_feedbacks_positive'
  ) THEN
    ALTER TABLE dc_agent_metrics ADD COLUMN total_feedbacks_positive INTEGER DEFAULT 0;
  END IF;
END $$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_feedback ON dc_message_feedback;
CREATE TRIGGER trigger_notify_feedback
  AFTER INSERT ON dc_message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_negative_feedback();

-- Habilitar RLS
ALTER TABLE dc_message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_prompt_corrections ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view all feedbacks" ON dc_message_feedback
  FOR SELECT USING (true);

CREATE POLICY "System can insert feedbacks" ON dc_message_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update feedbacks" ON dc_message_feedback
  FOR UPDATE USING (true);

CREATE POLICY "Users can view corrections" ON dc_prompt_corrections
  FOR SELECT USING (true);

CREATE POLICY "Users can manage corrections" ON dc_prompt_corrections
  FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE dc_message_feedback IS 'Armazena feedbacks dos clientes via reações do WhatsApp (❌ = negativo, ✅ = positivo)';
COMMENT ON COLUMN dc_message_feedback.reaction IS 'Tipo de reação: negative (❌, 👎) ou positive (✅, 👍)';
COMMENT ON COLUMN dc_message_feedback.status IS 'Status: pending -> awaiting_response -> in_review -> applied/dismissed';
COMMENT ON COLUMN dc_message_feedback.error_type IS 'Tipo de erro identificado: factual, tone, information, product_info, measurement, other';
COMMENT ON TABLE dc_prompt_corrections IS 'Histórico de correções aplicadas ao prompt baseadas em feedbacks';
