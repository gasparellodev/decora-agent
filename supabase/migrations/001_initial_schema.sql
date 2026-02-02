-- =====================================================
-- DECORA AGENT - SCHEMA INICIAL
-- Rodar este SQL no Supabase SQL Editor
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Enum para stages do lead
DO $$ BEGIN
  CREATE TYPE dc_lead_stage AS ENUM (
    'novo', 'qualificando', 'orcamento', 'comprou',
    'producao', 'entregue', 'pos_venda', 'inativo'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para direção da mensagem
DO $$ BEGIN
  CREATE TYPE dc_message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de sender
DO $$ BEGIN
  CREATE TYPE dc_sender_type AS ENUM ('lead', 'agent', 'human', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status da conversa
DO $$ BEGIN
  CREATE TYPE dc_conversation_status AS ENUM ('active', 'waiting_human', 'closed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de follow-up
DO $$ BEGIN
  CREATE TYPE dc_followup_type AS ENUM ('abandoned_cart', 'post_delivery', 'installation', 'reactivation', 'review', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de follow-up
DO $$ BEGIN
  CREATE TYPE dc_followup_status AS ENUM ('pending', 'sent', 'responded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABELAS
-- =====================================================

-- Tabela dc_leads
CREATE TABLE IF NOT EXISTS dc_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  address_json JSONB,
  cep VARCHAR(9),
  stage dc_lead_stage NOT NULL DEFAULT 'novo',
  source VARCHAR(50) DEFAULT 'whatsapp',
  tags TEXT[],
  profile_type VARCHAR(20),
  is_company BOOLEAN DEFAULT false,
  assigned_to UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_conversations
CREATE TABLE IF NOT EXISTS dc_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES dc_leads(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  status dc_conversation_status NOT NULL DEFAULT 'active',
  intent VARCHAR(50),
  context_json JSONB DEFAULT '{}',
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_messages
CREATE TABLE IF NOT EXISTS dc_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES dc_conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES dc_leads(id) ON DELETE CASCADE,
  direction dc_message_direction NOT NULL,
  sender_type dc_sender_type NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  wpp_message_id VARCHAR(100),
  ai_tokens_used INTEGER,
  ai_model VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_whatsapp_connections
CREATE TABLE IF NOT EXISTS dc_whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_name VARCHAR(100) NOT NULL UNIQUE,
  instance_id VARCHAR(100),
  api_key VARCHAR(255),
  phone_number VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  webhook_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_orders
CREATE TABLE IF NOT EXISTS dc_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES dc_leads(id),
  external_id VARCHAR(100),
  source VARCHAR(20) NOT NULL,
  order_number VARCHAR(50),
  total DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'pendente',
  production_status VARCHAR(30) DEFAULT 'cadastrado',
  tracking_code VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_follow_ups
CREATE TABLE IF NOT EXISTS dc_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES dc_leads(id) ON DELETE CASCADE,
  order_id UUID REFERENCES dc_orders(id),
  type dc_followup_type NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  message_template TEXT,
  status dc_followup_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  context_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Tabela dc_integrations
CREATE TABLE IF NOT EXISTS dc_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(30) NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela dc_agent_metrics
CREATE TABLE IF NOT EXISTS dc_agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_messages_in INTEGER DEFAULT 0,
  total_messages_out INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  total_leads_created INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_followups_sent INTEGER DEFAULT 0,
  total_followups_responded INTEGER DEFAULT 0,
  total_escalations INTEGER DEFAULT 0,
  avg_response_time_sec NUMERIC DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_ai_cost_usd NUMERIC(10,4) DEFAULT 0
);

-- Tabela dc_agent_settings (configurações do agente)
CREATE TABLE IF NOT EXISTS dc_agent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dc_leads_phone ON dc_leads(phone);
CREATE INDEX IF NOT EXISTS idx_dc_leads_stage ON dc_leads(stage);
CREATE INDEX IF NOT EXISTS idx_dc_leads_source ON dc_leads(source);
CREATE INDEX IF NOT EXISTS idx_dc_leads_created ON dc_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dc_conversations_lead ON dc_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_dc_conversations_status ON dc_conversations(status);
CREATE INDEX IF NOT EXISTS idx_dc_conversations_created ON dc_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dc_messages_conversation ON dc_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dc_messages_lead ON dc_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_dc_messages_sent ON dc_messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_dc_orders_lead ON dc_orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_dc_orders_external ON dc_orders(external_id, source);
CREATE INDEX IF NOT EXISTS idx_dc_orders_status ON dc_orders(status);

CREATE INDEX IF NOT EXISTS idx_dc_followups_scheduled ON dc_follow_ups(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dc_followups_lead ON dc_follow_ups(lead_id);

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE dc_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE dc_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE dc_leads;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE dc_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_agent_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES
-- =====================================================

-- dc_leads policies
CREATE POLICY "Authenticated users can view all dc_leads" ON dc_leads 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dc_leads" ON dc_leads 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dc_leads" ON dc_leads 
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_leads" ON dc_leads 
  FOR ALL TO service_role USING (true);

-- dc_conversations policies
CREATE POLICY "Authenticated users can view all dc_conversations" ON dc_conversations 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dc_conversations" ON dc_conversations 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dc_conversations" ON dc_conversations 
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_conversations" ON dc_conversations 
  FOR ALL TO service_role USING (true);

-- dc_messages policies
CREATE POLICY "Authenticated users can view all dc_messages" ON dc_messages 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dc_messages" ON dc_messages 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can do anything on dc_messages" ON dc_messages 
  FOR ALL TO service_role USING (true);

-- dc_whatsapp_connections policies
CREATE POLICY "Authenticated users can manage dc_whatsapp_connections" ON dc_whatsapp_connections 
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_whatsapp_connections" ON dc_whatsapp_connections 
  FOR ALL TO service_role USING (true);

-- dc_orders policies
CREATE POLICY "Authenticated users can manage dc_orders" ON dc_orders 
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_orders" ON dc_orders 
  FOR ALL TO service_role USING (true);

-- dc_follow_ups policies
CREATE POLICY "Authenticated users can manage dc_follow_ups" ON dc_follow_ups 
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_follow_ups" ON dc_follow_ups 
  FOR ALL TO service_role USING (true);

-- dc_integrations policies
CREATE POLICY "Authenticated users can manage dc_integrations" ON dc_integrations 
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_integrations" ON dc_integrations 
  FOR ALL TO service_role USING (true);

-- dc_agent_metrics policies
CREATE POLICY "Authenticated users can view dc_agent_metrics" ON dc_agent_metrics 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_agent_metrics" ON dc_agent_metrics 
  FOR ALL TO service_role USING (true);

-- dc_agent_settings policies
CREATE POLICY "Authenticated users can manage dc_agent_settings" ON dc_agent_settings 
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can do anything on dc_agent_settings" ON dc_agent_settings 
  FOR ALL TO service_role USING (true);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_dc_leads_updated_at ON dc_leads;
CREATE TRIGGER update_dc_leads_updated_at
  BEFORE UPDATE ON dc_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dc_orders_updated_at ON dc_orders;
CREATE TRIGGER update_dc_orders_updated_at
  BEFORE UPDATE ON dc_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dc_integrations_updated_at ON dc_integrations;
CREATE TRIGGER update_dc_integrations_updated_at
  BEFORE UPDATE ON dc_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dc_agent_settings_updated_at ON dc_agent_settings;
CREATE TRIGGER update_dc_agent_settings_updated_at
  BEFORE UPDATE ON dc_agent_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Configuração padrão do agente
INSERT INTO dc_agent_settings (key, value, description) VALUES
  ('agent_enabled', 'true', 'Se o agente de IA está ativo'),
  ('agent_name', '"Ana"', 'Nome do agente'),
  ('max_context_messages', '20', 'Máximo de mensagens no contexto'),
  ('response_delay_ms', '1200', 'Delay antes de responder (ms)'),
  ('business_hours', '{"start": "08:00", "end": "18:00", "timezone": "America/Sao_Paulo"}', 'Horário de funcionamento'),
  ('auto_escalate_keywords', '["humano", "atendente", "pessoa", "reclamação", "cancelar"]', 'Palavras que acionam escalação')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE dc_leads IS 'Tabela de leads/contatos capturados pelo agente';
COMMENT ON TABLE dc_conversations IS 'Sessões de conversa entre lead e agente';
COMMENT ON TABLE dc_messages IS 'Mensagens individuais de cada conversa';
COMMENT ON TABLE dc_whatsapp_connections IS 'Instâncias WhatsApp conectadas via Evolution API';
COMMENT ON TABLE dc_orders IS 'Pedidos de todas as fontes (Shopify, Yampi, Bling, etc)';
COMMENT ON TABLE dc_follow_ups IS 'Follow-ups automáticos agendados';
COMMENT ON TABLE dc_integrations IS 'Tokens OAuth de integrações externas';
COMMENT ON TABLE dc_agent_metrics IS 'Métricas diárias do agente';
COMMENT ON TABLE dc_agent_settings IS 'Configurações do agente';
