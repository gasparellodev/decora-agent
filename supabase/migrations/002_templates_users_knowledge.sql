-- =====================================================
-- DECORA AGENT - TEMPLATES, USERS, KNOWLEDGE BASE
-- =====================================================

-- Templates de mensagem
CREATE TABLE IF NOT EXISTS dc_message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  category VARCHAR(50),
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Perfis de usuário (ligado ao auth.users)
CREATE TABLE IF NOT EXISTS dc_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(150),
  role VARCHAR(20) NOT NULL DEFAULT 'attendant', -- admin | attendant
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Base de conhecimento
CREATE TABLE IF NOT EXISTS dc_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | published | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dc_message_templates_active ON dc_message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_dc_profiles_role ON dc_profiles(role);
CREATE INDEX IF NOT EXISTS idx_dc_knowledge_status ON dc_knowledge_base(status);

-- RLS
ALTER TABLE dc_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policies básicas
CREATE POLICY "Authenticated can manage templates" ON dc_message_templates
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can manage templates" ON dc_message_templates
  FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated can read profiles" ON dc_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage profiles" ON dc_profiles
  FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated can manage knowledge" ON dc_knowledge_base
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can manage knowledge" ON dc_knowledge_base
  FOR ALL TO service_role USING (true);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_dc_message_templates_updated_at ON dc_message_templates;
CREATE TRIGGER update_dc_message_templates_updated_at
  BEFORE UPDATE ON dc_message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dc_profiles_updated_at ON dc_profiles;
CREATE TRIGGER update_dc_profiles_updated_at
  BEFORE UPDATE ON dc_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dc_knowledge_base_updated_at ON dc_knowledge_base;
CREATE TRIGGER update_dc_knowledge_base_updated_at
  BEFORE UPDATE ON dc_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
