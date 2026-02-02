-- =====================================================
-- HABILITAR REALTIME PARA dc_whatsapp_connections
-- =====================================================
-- Esta migration habilita Supabase Realtime na tabela de conexões WhatsApp
-- Isso permite que o frontend escute mudanças em tempo real via WebSocket
-- eliminando a necessidade de polling HTTP constante.

-- Habilitar Realtime para a tabela de conexões WhatsApp
ALTER PUBLICATION supabase_realtime ADD TABLE dc_whatsapp_connections;

-- Comentário explicativo
COMMENT ON TABLE dc_whatsapp_connections IS 'Instâncias WhatsApp conectadas via Evolution API. Realtime habilitado para updates instantâneos de QR code e status de conexão.';
