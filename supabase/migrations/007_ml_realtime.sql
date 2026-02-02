-- =====================================================
-- MIGRAÇÃO: Habilitar Realtime para tabelas do Mercado Livre
-- Data: 2026-02-01
-- Descrição: Adiciona tabelas ML ao Realtime do Supabase
-- =====================================================

-- Habilitar Realtime para conversas do Mercado Livre
ALTER PUBLICATION supabase_realtime ADD TABLE dc_ml_conversations;

-- Habilitar Realtime para mensagens do Mercado Livre
ALTER PUBLICATION supabase_realtime ADD TABLE dc_ml_messages;

-- Comentários
COMMENT ON TABLE dc_ml_conversations IS 'Conversas de pós-venda do Mercado Livre - Realtime habilitado';
COMMENT ON TABLE dc_ml_messages IS 'Histórico de mensagens do Mercado Livre - Realtime habilitado';
