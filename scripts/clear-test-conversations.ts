/**
 * Limpa conversas e mensagens dos números de teste do WhatsApp.
 * Uso: npx tsx scripts/clear-test-conversations.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://abaswhkkrzxmcstdnnbd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PHONES = [
  '5511951276991',
  '5511945001611',
  '5511960771041',
  // Sem prefixo 55 também
  '11951276991',
  '11945001611',
  '11960771041',
]

async function main() {
  console.log('🔍 Buscando leads dos números de teste...')

  const { data: leads, error: leadsErr } = await supabase
    .from('dc_leads')
    .select('id, phone, name')
    .in('phone', PHONES)

  if (leadsErr) {
    console.error('Erro buscando leads:', leadsErr)
    return
  }

  if (!leads || leads.length === 0) {
    console.log('Nenhum lead encontrado para os números informados.')
    return
  }

  console.log(`Encontrados ${leads.length} leads:`)
  leads.forEach(l => console.log(`  - ${l.phone} (${l.name || 'sem nome'}) [${l.id}]`))

  const leadIds = leads.map(l => l.id)

  // 1. Buscar conversas
  const { data: conversations } = await supabase
    .from('dc_conversations')
    .select('id')
    .in('lead_id', leadIds)

  const convIds = conversations?.map(c => c.id) || []
  console.log(`\n📋 ${convIds.length} conversas encontradas`)

  // 2. Deletar mensagens
  if (convIds.length > 0) {
    const { count: msgCount } = await supabase
      .from('dc_messages')
      .delete({ count: 'exact' })
      .in('conversation_id', convIds)
    console.log(`🗑️  ${msgCount || 0} mensagens deletadas`)
  }

  // 3. Deletar conversas
  if (convIds.length > 0) {
    const { count: convCount } = await supabase
      .from('dc_conversations')
      .delete({ count: 'exact' })
      .in('lead_id', leadIds)
    console.log(`🗑️  ${convCount || 0} conversas deletadas`)
  }

  // 4. Resetar lead (limpar nome, stage, cep - mantém o registro)
  for (const lead of leads) {
    await supabase
      .from('dc_leads')
      .update({
        name: null,
        stage: 'novo',
        cep: null,
        last_message_at: null,
      })
      .eq('id', lead.id)
  }
  console.log(`🔄 ${leads.length} leads resetados (stage=novo, nome/cep limpos)`)

  // 5. Deletar pedidos de produção criados pelo agente para esses leads
  const { count: orderCount } = await supabase
    .from('orders')
    .delete({ count: 'exact' })
    .in('lead_id', leadIds)
    .eq('created_by', process.env.AGENT_USER_UUID || 'ca9235cd-736d-4dd6-aeb7-f008e9816707')
  console.log(`🗑️  ${orderCount || 0} pedidos de produção (agente-ia) deletados`)

  console.log('\n✅ Pronto! Conversas limpas para teste do zero.')
}

main().catch(console.error)
