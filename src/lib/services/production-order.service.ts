import { createAdminClient } from '@/lib/supabase/admin'
import { CRMOutput } from '@/lib/ai/prompts/sales-agent'
import type { Lead, Conversation } from '@/types/database'

// UUID do usuário "agente-ia" no Supabase Auth (criado via scripts/seed-agent-user.ts)
const AGENT_USER_ID = process.env.AGENT_USER_UUID || 'ca9235cd-736d-4dd6-aeb7-f008e9816707'

// Mapeamento de model codes do agente → sistema de producao
const MODEL_MAP: Record<string, string> = {
  '2f': '2F',
  '2f_grade': '2F',
  '3f': '3F',
  '3f_grade': '3F',
  '3f_tela': 'TELA',
  '3f_tela_grade': 'TELA',
  'capelinha': 'CAPELINHA',
  'capelinha_3v': 'CAPELINHA-3V',
}

const GLASS_MAP: Record<string, string> = {
  'INCOLOR': 'Incolor',
  'MINI_BOREAL': 'Mini Boreal',
  'FUME_CLARO': 'Fume',
}

/**
 * Cria pedido no sistema de producao (tabela `orders`) com glass_cuts e accessories.
 * Chamado quando o agente envia o link da Shopify (link_sent = true).
 */
export async function createProductionOrder(
  crmData: CRMOutput,
  lead: Lead,
  conversation: Conversation
): Promise<string | null> {
  const supabase = createAdminClient()

  // Verificar duplicata por conversation_id
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('whatsapp_conversation_id', conversation.id)
    .maybeSingle()

  if (existing) {
    console.log(`[Production] Order already exists for conversation ${conversation.id}`)
    return existing.id
  }

  const model = MODEL_MAP[crmData.product_model || ''] || crmData.product_model
  const hasGrade = crmData.has_grille || (crmData.product_model?.includes('grade') ?? false)
  const isSP = crmData.cep?.startsWith('0') || false

  // 1. Criar pedido principal na tabela orders
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_name: crmData.customer_name || lead.name,
      model,
      color: (crmData.color || 'BRANCO').toUpperCase(),
      glass_type: GLASS_MAP[crmData.glass_type || ''] || 'Incolor',
      height_cm: crmData.height_cm?.toString(),
      width_cm: crmData.width_cm?.toString(),
      has_grade: hasGrade,
      has_arremate: false,
      orientation: 'horizontal',
      observacoes: crmData.notes,
      production_status: 'cadastrado',
      prioridade: 'normal',
      delivery_type: isSP ? 'entrega_sp' : 'transportadora',
      created_by: AGENT_USER_ID,
      lead_id: lead.id,
      whatsapp_conversation_id: conversation.id,
      customer_phone: lead.phone,
      cep_cliente: crmData.cep,
    })
    .select('id')
    .single()

  if (error || !order) {
    console.error('[Production] Error creating order:', error)
    return null
  }

  const orderId = order.id

  // 2. Criar glass_cuts (cortes de vidro)
  if (crmData.height_cm && crmData.width_cm) {
    try {
      await supabase.from('glass_cuts').insert({
        order_id: orderId,
        piece: 1,
        height_cm: crmData.height_cm,
        width_cm: crmData.width_cm,
        qty: crmData.quantity || 1,
        model,
        is_cut_completed: false,
      })
    } catch (err) {
      console.warn('[Production] Error creating glass_cuts:', err)
    }
  }

  // 3. Criar order_accessories (grade, se aplicavel)
  if (hasGrade) {
    try {
      await supabase.from('order_accessories').insert({
        order_id: orderId,
        accessory_code: 'GRADE',
        accessory_name: 'Grade de Seguranca',
        quantity: crmData.quantity || 1,
        unit: 'un',
        color_variant: (crmData.color || 'BRANCO').toUpperCase(),
      })
    } catch (err) {
      console.warn('[Production] Error creating order_accessories:', err)
    }
  }

  // 4. Registrar historico de status
  try {
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      from_status: null,
      to_status: 'pendente',
      changed_by: AGENT_USER_ID,
    })
  } catch (err) {
    console.warn('[Production] Error creating status history:', err)
  }

  console.log(`[Production] Order ${orderId} created with glass_cuts and accessories`)
  return orderId
}
