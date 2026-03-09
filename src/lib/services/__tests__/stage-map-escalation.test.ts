/**
 * Testes de mapeamento de stages CRM e lógica de escalação.
 *
 * Cobre:
 * - STAGE_MAP (stage_suggested → dc_leads.stage)
 * - Trigger de escalação automática (handoff_to_human)
 * - Trigger de criação de pedido de produção (link_sent + product_url)
 * - Canal Mercado Livre (não deve processar CRM)
 */
import { describe, it, expect } from 'vitest'

// ============================================================
// Réplicas das constantes de agent.service.ts
// ============================================================

const STAGE_MAP: Record<string, string> = {
  'Lead Novo': 'novo',
  'Qualificado': 'qualificando',
  'Orcamento/Resumo Gerado': 'orcamento',
  'Link Enviado': 'orcamento',
  'Aguardando Pagamento': 'orcamento',
  'Pedido Comprado': 'comprou',
  'Nao Interessado': 'inativo',
}

describe('STAGE_MAP - Mapeamento de estágios CRM', () => {
  it.each([
    ['Lead Novo', 'novo'],
    ['Qualificado', 'qualificando'],
    ['Orcamento/Resumo Gerado', 'orcamento'],
    ['Link Enviado', 'orcamento'],
    ['Aguardando Pagamento', 'orcamento'],
    ['Pedido Comprado', 'comprou'],
    ['Nao Interessado', 'inativo'],
  ])('deve mapear "%s" → "%s"', (input, expected) => {
    expect(STAGE_MAP[input]).toBe(expected)
  })

  it('deve retornar undefined para stage desconhecido', () => {
    expect(STAGE_MAP['Encaminhado para Humano']).toBeUndefined()
    expect(STAGE_MAP['Qualquer Coisa']).toBeUndefined()
  })

  it('Link Enviado e Aguardando Pagamento devem mapear para mesmo stage', () => {
    expect(STAGE_MAP['Link Enviado']).toBe(STAGE_MAP['Aguardando Pagamento'])
  })

  it('todos os stages do prompt devem estar mapeados', () => {
    const promptStages = [
      'Lead Novo',
      'Qualificado',
      'Orcamento/Resumo Gerado',
      'Link Enviado',
      'Aguardando Pagamento',
      'Pedido Comprado',
      'Nao Interessado',
    ]
    for (const stage of promptStages) {
      expect(STAGE_MAP[stage]).toBeDefined()
    }
  })
})

describe('Lógica de escalação automática', () => {
  // Replica a lógica de processCRMOutput linhas 184-200

  function shouldEscalate(crmData: { handoff_to_human: boolean; case_type?: string }): boolean {
    return crmData.handoff_to_human === true
  }

  it('deve escalar quando handoff_to_human = true', () => {
    expect(shouldEscalate({ handoff_to_human: true })).toBe(true)
  })

  it('NÃO deve escalar quando handoff_to_human = false', () => {
    expect(shouldEscalate({ handoff_to_human: false })).toBe(false)
  })

  it('cenário: medida personalizada - deve escalar', () => {
    const crm = {
      handoff_to_human: true,
      case_type: 'PERSONALIZADO',
    }
    expect(shouldEscalate(crm)).toBe(true)
  })

  it('cenário: pedido padrão - NÃO deve escalar', () => {
    const crm = {
      handoff_to_human: false,
      case_type: 'PADRAO',
    }
    expect(shouldEscalate(crm)).toBe(false)
  })
})

describe('Trigger de criação de pedido de produção', () => {
  // Replica a lógica de processCRMOutput linhas 202-209

  function shouldCreateOrder(crmData: { link_sent: boolean; product_url: string | null }): boolean {
    return !!(crmData.link_sent && crmData.product_url)
  }

  it('deve criar pedido quando link_sent=true E product_url preenchido', () => {
    expect(shouldCreateOrder({
      link_sent: true,
      product_url: 'https://shopify.com/produto',
    })).toBe(true)
  })

  it('NÃO deve criar pedido quando link_sent=false', () => {
    expect(shouldCreateOrder({
      link_sent: false,
      product_url: 'https://shopify.com/produto',
    })).toBe(false)
  })

  it('NÃO deve criar pedido quando product_url=null', () => {
    expect(shouldCreateOrder({
      link_sent: true,
      product_url: null,
    })).toBe(false)
  })

  it('NÃO deve criar pedido quando ambos são falsy', () => {
    expect(shouldCreateOrder({
      link_sent: false,
      product_url: null,
    })).toBe(false)
  })
})

describe('Comportamento por canal', () => {
  // Regras de processMessage (linhas 512-518):
  // CRM só é processado para WhatsApp (!isML)

  function shouldProcessCRM(channel: string, crmData: unknown, lead: unknown, conversation: unknown): boolean {
    const isML = channel === 'mercadolivre'
    return !isML && !!crmData && !!lead && !!conversation
  }

  it('WhatsApp com CRM data deve processar', () => {
    expect(shouldProcessCRM('whatsapp', { stage: 'test' }, { id: '1' }, { id: '2' })).toBe(true)
  })

  it('Mercado Livre NÃO deve processar CRM', () => {
    expect(shouldProcessCRM('mercadolivre', { stage: 'test' }, { id: '1' }, { id: '2' })).toBe(false)
  })

  it('WhatsApp sem CRM data NÃO deve processar', () => {
    expect(shouldProcessCRM('whatsapp', null, { id: '1' }, { id: '2' })).toBe(false)
  })

  it('WhatsApp sem lead NÃO deve processar', () => {
    expect(shouldProcessCRM('whatsapp', { stage: 'test' }, null, { id: '2' })).toBe(false)
  })

  it('WhatsApp sem conversation NÃO deve processar', () => {
    expect(shouldProcessCRM('whatsapp', { stage: 'test' }, { id: '1' }, null)).toBe(false)
  })
})

describe('Atualização de lead - regras', () => {
  // Replica lógica de processCRMOutput linhas 120-137

  function buildLeadUpdates(
    crmData: { customer_name: string | null; cep: string | null; stage_suggested: string },
    currentLeadStage: string
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {}
    if (crmData.customer_name) updates.name = crmData.customer_name
    if (crmData.cep) updates.cep = crmData.cep.replace(/\D/g, '')

    const mappedStage = STAGE_MAP[crmData.stage_suggested]
    if (mappedStage && mappedStage !== currentLeadStage) {
      updates.stage = mappedStage
    }

    return updates
  }

  it('deve atualizar nome quando fornecido', () => {
    const updates = buildLeadUpdates(
      { customer_name: 'Maria', cep: null, stage_suggested: 'Lead Novo' },
      'novo'
    )
    expect(updates.name).toBe('Maria')
  })

  it('deve atualizar nome mesmo se lead já tem nome (sobreescrever)', () => {
    // Mudança da Fase 1: removeu guard `!lead.name`
    const updates = buildLeadUpdates(
      { customer_name: 'Maria Nova', cep: null, stage_suggested: 'Lead Novo' },
      'novo'
    )
    expect(updates.name).toBe('Maria Nova')
  })

  it('NÃO deve incluir nome quando customer_name é null', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: null, stage_suggested: 'Lead Novo' },
      'novo'
    )
    expect(updates.name).toBeUndefined()
  })

  it('deve limpar CEP de caracteres não numéricos', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: '04567-890', stage_suggested: 'Lead Novo' },
      'novo'
    )
    expect(updates.cep).toBe('04567890')
  })

  it('deve atualizar stage quando muda', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: null, stage_suggested: 'Qualificado' },
      'novo'
    )
    expect(updates.stage).toBe('qualificando')
  })

  it('NÃO deve atualizar stage quando é o mesmo', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: null, stage_suggested: 'Lead Novo' },
      'novo' // já é 'novo'
    )
    expect(updates.stage).toBeUndefined()
  })

  it('NÃO deve atualizar stage quando stage_suggested não está no STAGE_MAP', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: null, stage_suggested: 'Encaminhado para Humano' },
      'novo'
    )
    expect(updates.stage).toBeUndefined()
  })

  it('deve retornar objeto vazio quando nada mudou', () => {
    const updates = buildLeadUpdates(
      { customer_name: null, cep: null, stage_suggested: 'Lead Novo' },
      'novo'
    )
    expect(Object.keys(updates).length).toBe(0)
  })
})
