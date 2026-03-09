-- RODAR MANUALMENTE no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/abaswhkkrzxmcstdnnbd/sql/new

-- Fix 1: FK whatsapp_conversation_id referencia gl_conversations mas deveria ser dc_conversations
-- Precisa rodar isso para restaurar o campo whatsapp_conversation_id no production-order.service.ts
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_whatsapp_conversation_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_whatsapp_conversation_id_fkey
  FOREIGN KEY (whatsapp_conversation_id) REFERENCES dc_conversations(id);

-- Fix 2: FK lead_id referencia gl_leads mas deveria ser dc_leads
-- O agente cria leads em dc_leads, então a FK precisa apontar para lá
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_lead_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES dc_leads(id);

-- Fix 3: Não necessário - delivery_type já aceita 'sao_paulo' e 'transportadora'
-- Código corrigido para usar 'sao_paulo' em vez de 'entrega_sp'
