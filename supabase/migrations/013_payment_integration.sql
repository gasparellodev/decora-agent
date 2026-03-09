-- =====================================================
-- Migration 013: Payment Integration
-- Adiciona campos para rastrear metodo de pagamento
-- =====================================================

ALTER TABLE dc_conversations
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS cart_total DECIMAL(10,2);
