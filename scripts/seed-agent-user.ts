/**
 * Cria um usuário Supabase Auth para o agente de IA.
 *
 * O campo `created_by` na tabela `orders` é UUID (FK para auth.users).
 * Este script cria o usuário e perfil necessários.
 *
 * Uso: npx tsx --env-file=.env.local scripts/seed-agent-user.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const AGENT_EMAIL = 'agente-ia@decora.internal'

async function main() {
  console.log('🔍 Verificando se usuário agente já existe...')

  // Buscar usuário existente pelo email
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingAgent = existingUsers?.users?.find(u => u.email === AGENT_EMAIL)

  if (existingAgent) {
    console.log(`✅ Usuário agente já existe!`)
    console.log(`   UUID: ${existingAgent.id}`)
    console.log(`   Email: ${existingAgent.email}`)
    console.log(`\n👉 Use este UUID na env: AGENT_USER_UUID=${existingAgent.id}`)
    return
  }

  console.log('📝 Criando usuário agente no Supabase Auth...')

  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email: AGENT_EMAIL,
    password: `agent-${crypto.randomUUID()}`, // senha aleatória (nunca usada para login)
    email_confirm: true,
    user_metadata: {
      name: 'Agente IA Decora',
      role: 'agent',
    },
  })

  if (authError || !newUser?.user) {
    console.error('❌ Erro ao criar usuário:', authError)
    process.exit(1)
  }

  const agentId = newUser.user.id
  console.log(`✅ Usuário criado com UUID: ${agentId}`)

  // Criar perfil em dc_profiles
  console.log('📝 Criando perfil em dc_profiles...')
  const { error: profileError } = await supabase
    .from('dc_profiles')
    .upsert({
      id: agentId,
      name: 'Agente IA Decora',
      role: 'agent',
    })

  if (profileError) {
    console.warn('⚠️  Erro ao criar perfil (pode não ter a tabela):', profileError.message)
  } else {
    console.log('✅ Perfil criado em dc_profiles')
  }

  console.log(`\n🎉 Pronto! Adicione ao .env.local:`)
  console.log(`   AGENT_USER_UUID=${agentId}`)
}

main().catch(console.error)
