-- Novas configurações do agente para funcionalidades implementadas
-- Valores são JSONB:
--   Números: '3000' (sem aspas internas)
--   Strings: '"low"' (com aspas duplas internas)
--   Booleans: 'true' ou 'false'

INSERT INTO dc_agent_settings (key, value) VALUES
  -- Buffer de mensagens
  ('message_buffer_timeout_ms', '3000'),
  ('max_buffer_messages', '10'),
  
  -- Formatação e respostas
  ('max_response_length', '500'),
  ('typing_chars_per_second', '3.5'),
  ('min_typing_ms', '1500'),
  ('max_typing_ms', '8000'),
  
  -- Processamento de mídia
  ('process_images', 'true'),
  ('process_audio', 'true'),
  ('process_documents', 'true'),
  ('max_audio_duration_seconds', '120'),
  ('max_document_size_mb', '5'),
  ('image_vision_detail', '"low"'),
  
  -- Detecção de links
  ('detect_external_links', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
