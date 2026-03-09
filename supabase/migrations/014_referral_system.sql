-- =====================================================
-- Migration 014: Referral/Indication System
-- Sistema de indicacoes entre clientes
-- =====================================================

-- 1. Tabela de indicacoes
CREATE TABLE IF NOT EXISTS dc_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem indicou
  referrer_lead_id UUID NOT NULL REFERENCES dc_leads(id),
  referral_code TEXT UNIQUE NOT NULL,

  -- Quem foi indicado
  referred_lead_id UUID REFERENCES dc_leads(id),
  referred_phone TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'expired')),

  -- Recompensa
  reward_type TEXT DEFAULT 'discount',
  reward_value DECIMAL(10,2),
  reward_claimed BOOLEAN DEFAULT FALSE,

  -- Rastreamento
  conversion_order_id UUID REFERENCES dc_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON dc_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON dc_referrals(referrer_lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON dc_referrals(status);

-- 2. Adicionar codigo de indicacao ao lead
ALTER TABLE dc_leads
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_leads_referral_code ON dc_leads(referral_code) WHERE referral_code IS NOT NULL;

-- 3. RLS
ALTER TABLE dc_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read referrals"
  ON dc_referrals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage referrals"
  ON dc_referrals FOR ALL TO service_role USING (true);
