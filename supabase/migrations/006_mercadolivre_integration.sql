-- =====================================================
-- MIGRAÇÃO: Integração Mercado Livre
-- Data: 2026-02-01
-- Descrição: Tabelas para gerenciar conversas e perguntas do ML
-- =====================================================

-- =====================================================
-- TABELA: dc_ml_conversations (Conversas pós-venda)
-- =====================================================

CREATE TABLE IF NOT EXISTS dc_ml_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores do ML
  pack_id TEXT UNIQUE NOT NULL,
  order_id TEXT,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT,
  
  -- Relacionamento com sistema
  lead_id UUID REFERENCES dc_leads(id) ON DELETE SET NULL,
  order_internal_id UUID REFERENCES dc_orders(id) ON DELETE SET NULL,
  
  -- Status do fluxo
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting_data', 'waiting_glass', 'complete', 'closed')),
  
  -- Frete
  freight_paid BOOLEAN DEFAULT FALSE,
  freight_value DECIMAL(10,2),
  
  -- Dados coletados do cliente
  data_collected JSONB DEFAULT '{}'::jsonb,
  -- Estrutura esperada:
  -- {
  --   "name": "string",
  --   "address": "string",
  --   "cep": "string",
  --   "cpf": "string",
  --   "email": "string",
  --   "whatsapp": "string"
  -- }
  
  -- Escolha do vidro
  glass_choice TEXT CHECK (glass_choice IN ('incolor', 'mini_boreal', 'fume')),
  
  -- Fluxo de mensagens enviadas
  welcome_sent BOOLEAN DEFAULT FALSE,
  chapatex_sent BOOLEAN DEFAULT FALSE,
  cintas_sent BOOLEAN DEFAULT FALSE,
  data_request_sent BOOLEAN DEFAULT FALSE,
  glass_request_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ml_conv_pack ON dc_ml_conversations(pack_id);
CREATE INDEX IF NOT EXISTS idx_ml_conv_buyer ON dc_ml_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_ml_conv_lead ON dc_ml_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ml_conv_status ON dc_ml_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ml_conv_created ON dc_ml_conversations(created_at DESC);

-- =====================================================
-- TABELA: dc_ml_questions (Perguntas pré-venda)
-- =====================================================

CREATE TABLE IF NOT EXISTS dc_ml_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores do ML
  question_id TEXT UNIQUE NOT NULL,
  item_id TEXT NOT NULL,
  
  -- Dados da pergunta
  question_text TEXT NOT NULL,
  buyer_id TEXT,
  buyer_nickname TEXT,
  
  -- Relacionamento com sistema
  lead_id UUID REFERENCES dc_leads(id) ON DELETE SET NULL,
  
  -- Processamento
  cep_extracted TEXT,
  freight_calculated DECIMAL(10,2),
  freight_is_sp BOOLEAN,
  
  -- Resposta
  answer_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'failed', 'skipped')),
  answered_at TIMESTAMPTZ,
  
  -- Metadados
  ml_created_at TIMESTAMPTZ, -- Data de criação no ML
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ml_questions_qid ON dc_ml_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_ml_questions_item ON dc_ml_questions(item_id);
CREATE INDEX IF NOT EXISTS idx_ml_questions_status ON dc_ml_questions(status);
CREATE INDEX IF NOT EXISTS idx_ml_questions_created ON dc_ml_questions(created_at DESC);

-- =====================================================
-- TABELA: dc_ml_messages (Histórico de mensagens)
-- =====================================================

CREATE TABLE IF NOT EXISTS dc_ml_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  conversation_id UUID REFERENCES dc_ml_conversations(id) ON DELETE CASCADE,
  
  -- Identificadores ML
  ml_message_id TEXT,
  pack_id TEXT NOT NULL,
  
  -- Conteúdo
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('buyer', 'agent', 'human', 'system')),
  content TEXT NOT NULL,
  
  -- Metadados
  ml_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ml_messages_conv ON dc_ml_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ml_messages_pack ON dc_ml_messages(pack_id);
CREATE INDEX IF NOT EXISTS idx_ml_messages_created ON dc_ml_messages(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at em dc_ml_conversations
CREATE OR REPLACE FUNCTION update_ml_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ml_conversations_updated_at ON dc_ml_conversations;
CREATE TRIGGER trigger_ml_conversations_updated_at
  BEFORE UPDATE ON dc_ml_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_conversations_updated_at();

-- Trigger para atualizar updated_at em dc_ml_questions
CREATE OR REPLACE FUNCTION update_ml_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ml_questions_updated_at ON dc_ml_questions;
CREATE TRIGGER trigger_ml_questions_updated_at
  BEFORE UPDATE ON dc_ml_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_questions_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE dc_ml_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_ml_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_ml_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Authenticated users can read ml_conversations"
  ON dc_ml_conversations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage ml_conversations"
  ON dc_ml_conversations FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read ml_questions"
  ON dc_ml_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage ml_questions"
  ON dc_ml_questions FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read ml_messages"
  ON dc_ml_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage ml_messages"
  ON dc_ml_messages FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE dc_ml_conversations IS 'Conversas de pós-venda do Mercado Livre';
COMMENT ON TABLE dc_ml_questions IS 'Perguntas de pré-venda do Mercado Livre';
COMMENT ON TABLE dc_ml_messages IS 'Histórico de mensagens do Mercado Livre';

COMMENT ON COLUMN dc_ml_conversations.pack_id IS 'ID do pack/conversa no Mercado Livre';
COMMENT ON COLUMN dc_ml_conversations.data_collected IS 'Dados coletados do cliente (nome, endereço, etc)';
COMMENT ON COLUMN dc_ml_conversations.glass_choice IS 'Escolha do vidro: incolor, mini_boreal ou fume';

COMMENT ON COLUMN dc_ml_questions.cep_extracted IS 'CEP extraído da pergunta do cliente';
COMMENT ON COLUMN dc_ml_questions.freight_calculated IS 'Valor do frete calculado para resposta';
COMMENT ON COLUMN dc_ml_questions.freight_is_sp IS 'Se é frete para Grande SP (fixo R$55)';
