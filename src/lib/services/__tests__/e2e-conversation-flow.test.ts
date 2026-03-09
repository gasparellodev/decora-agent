/**
 * Testes de fluxo end-to-end de conversa.
 *
 * Simula cenários completos de conversa do agente,
 * testando a progressão de fatos e stages ao longo de múltiplas mensagens.
 */
import { describe, it, expect } from 'vitest'

// ============================================================
// Helpers (réplicas da lógica real)
// ============================================================

const DEPENDENT_RESETS: Record<string, string[]> = {
  product_model: ['product_url', 'link_sent', 'height_cm', 'width_cm'],
  height_cm: ['product_url', 'link_sent'],
  width_cm: ['product_url', 'link_sent'],
  color: ['product_url', 'link_sent'],
}

function mergeFacts(
  existing: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing }
  for (const [key, value] of Object.entries(newData)) {
    if (value !== null && value !== undefined) {
      if (DEPENDENT_RESETS[key] && existing[key] !== undefined && existing[key] !== value) {
        for (const dep of DEPENDENT_RESETS[key]) {
          merged[dep] = null
        }
      }
      merged[key] = value
    }
  }
  return merged
}

const STAGE_MAP: Record<string, string> = {
  'Lead Novo': 'novo',
  'Qualificado': 'qualificando',
  'Orcamento/Resumo Gerado': 'orcamento',
  'Link Enviado': 'orcamento',
  'Aguardando Pagamento': 'orcamento',
  'Pedido Comprado': 'comprou',
  'Nao Interessado': 'inativo',
}

const MODEL_MAP: Record<string, string> = {
  '2f': '2F', '2f_grade': '2F', '3f': '3F', '3f_grade': '3F',
  '3f_tela': 'TELA', '3f_tela_grade': 'TELA',
  'capelinha': 'CAPELINHA', 'capelinha_3v': 'CAPELINHA-3V',
}

function shouldCreateOrder(facts: Record<string, unknown>): boolean {
  return !!(facts.link_sent && facts.product_url)
}

// ============================================================
// Fluxos completos
// ============================================================

describe('Fluxo E2E: Venda padrão 2F sem mudança de ideia', () => {
  let facts: Record<string, unknown> = {}
  let leadStage = 'novo'

  it('Passo 1: Cliente diz "oi, quero uma janela" → Lead Novo', () => {
    facts = mergeFacts(facts, {
      case_type: 'PADRAO',
      stage_suggested: 'Lead Novo',
      customer_name: 'João',
    })
    leadStage = STAGE_MAP[facts.stage_suggested as string] || leadStage

    expect(facts.customer_name).toBe('João')
    expect(leadStage).toBe('novo')
  })

  it('Passo 2: Cliente escolhe "2 folhas" → Qualificado', () => {
    facts = mergeFacts(facts, {
      product_model: '2f',
      product_family: 'CORRER',
      stage_suggested: 'Qualificado',
    })
    leadStage = STAGE_MAP[facts.stage_suggested as string] || leadStage

    expect(facts.product_model).toBe('2f')
    expect(facts.customer_name).toBe('João') // preservado
    expect(leadStage).toBe('qualificando')
  })

  it('Passo 3: Cliente dá medidas "100 de largura por 60 de altura"', () => {
    facts = mergeFacts(facts, {
      height_cm: 60,
      width_cm: 100,
    })

    expect(facts.height_cm).toBe(60)
    expect(facts.width_cm).toBe(100)
    expect(facts.product_model).toBe('2f') // preservado
    expect(facts.customer_name).toBe('João') // preservado
  })

  it('Passo 4: Cliente escolhe cor e vidro', () => {
    facts = mergeFacts(facts, {
      color: 'BRANCO',
      glass_type: 'INCOLOR',
    })

    expect(facts.color).toBe('BRANCO')
    expect(facts.glass_type).toBe('INCOLOR')
    expect(facts.height_cm).toBe(60) // preservado
  })

  it('Passo 5: Cliente informa CEP e quantidade', () => {
    facts = mergeFacts(facts, {
      cep: '04567890',
      quantity: 1,
      has_grille: false,
    })

    expect(facts.cep).toBe('04567890')
    expect(facts.quantity).toBe(1)
  })

  it('Passo 6: Agente envia link → Link Enviado', () => {
    facts = mergeFacts(facts, {
      stage_suggested: 'Link Enviado',
      product_url: 'https://shopify.com/2f-branco-100x60',
      link_sent: true,
    })
    leadStage = STAGE_MAP[facts.stage_suggested as string] || leadStage

    expect(facts.link_sent).toBe(true)
    expect(facts.product_url).toContain('shopify.com')
    expect(leadStage).toBe('orcamento')
    expect(shouldCreateOrder(facts)).toBe(true)

    // Verificar que o pedido de produção teria dados corretos
    const model = MODEL_MAP[facts.product_model as string]
    expect(model).toBe('2F')
  })

  it('Estado final: todos os dados completos', () => {
    expect(facts).toMatchObject({
      customer_name: 'João',
      product_model: '2f',
      height_cm: 60,
      width_cm: 100,
      color: 'BRANCO',
      glass_type: 'INCOLOR',
      quantity: 1,
      cep: '04567890',
      has_grille: false,
      link_sent: true,
    })
  })
})

describe('Fluxo E2E: Cliente muda de modelo no meio', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Escolhe 2F, dá medidas e cor', () => {
    facts = mergeFacts(facts, {
      customer_name: 'Ana',
      product_model: '2f',
      height_cm: 60,
      width_cm: 100,
      color: 'BRANCO',
      stage_suggested: 'Qualificado',
    })

    expect(facts.product_model).toBe('2f')
    expect(facts.height_cm).toBe(60)
  })

  it('Passo 2: "Na verdade quero 3 folhas com tela" → reseta medidas e URL', () => {
    facts = mergeFacts(facts, {
      product_model: '3f_tela',
      product_family: 'CORRER',
    })

    expect(facts.product_model).toBe('3f_tela')
    expect(facts.height_cm).toBeNull() // resetado
    expect(facts.width_cm).toBeNull() // resetado
    expect(facts.customer_name).toBe('Ana') // preservado
    expect(facts.color).toBe('BRANCO') // preservado
  })

  it('Passo 3: Dá novas medidas', () => {
    facts = mergeFacts(facts, {
      height_cm: 80,
      width_cm: 150,
    })

    expect(facts.height_cm).toBe(80)
    expect(facts.width_cm).toBe(150)
    expect(facts.product_model).toBe('3f_tela')
    expect(facts.color).toBe('BRANCO')
  })

  it('Passo 4: Muda cor para preto → reseta URL', () => {
    facts = mergeFacts(facts, {
      color: 'PRETO',
    })

    expect(facts.color).toBe('PRETO')
    expect(facts.product_model).toBe('3f_tela') // preservado
    expect(facts.height_cm).toBe(80) // preservado
  })

  it('Passo 5: Link enviado com dados finais corretos', () => {
    facts = mergeFacts(facts, {
      product_url: 'https://shopify.com/3f-tela-preto-150x80',
      link_sent: true,
      stage_suggested: 'Link Enviado',
    })

    expect(shouldCreateOrder(facts)).toBe(true)
    expect(MODEL_MAP[facts.product_model as string]).toBe('TELA')
    expect(facts.color).toBe('PRETO')
    expect(facts.height_cm).toBe(80)
    expect(facts.width_cm).toBe(150)
  })
})

describe('Fluxo E2E: Capelinha - agente deve perguntar variação', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Cliente diz "quero uma capelinha"', () => {
    // Agente deveria perguntar "1 vidro ou 3 vidros?" antes de definir o modelo
    facts = mergeFacts(facts, {
      customer_name: 'Carlos',
      product_family: 'PIVOTANTE',
      stage_suggested: 'Qualificado',
      // NÃO define product_model ainda - agente deve perguntar
    })

    expect(facts.product_family).toBe('PIVOTANTE')
    expect(facts.product_model).toBeUndefined() // agente não assumiu
  })

  it('Passo 2: Cliente responde "3 vidros"', () => {
    facts = mergeFacts(facts, {
      product_model: 'capelinha_3v',
    })

    expect(facts.product_model).toBe('capelinha_3v')
    expect(MODEL_MAP[facts.product_model as string]).toBe('CAPELINHA-3V')
  })

  it('Passo 3: Medidas e completar pedido', () => {
    facts = mergeFacts(facts, {
      height_cm: 40,
      width_cm: 80,
      color: 'BRANCO',
      glass_type: 'MINI_BOREAL',
      quantity: 2,
    })

    expect(facts.height_cm).toBe(40)
    expect(facts.quantity).toBe(2)
    expect(facts.customer_name).toBe('Carlos')
  })
})

describe('Fluxo E2E: Pedido personalizado → escalação', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Cliente quer medida fora do padrão', () => {
    facts = mergeFacts(facts, {
      customer_name: 'Roberto',
      product_model: '2f',
      height_cm: 75, // não padrão (padrão: 30,40,50,60)
      width_cm: 130, // não padrão (padrão: 80,100,120,150,180)
      color: 'PRETO',
      case_type: 'PERSONALIZADO',
      stage_suggested: 'Orcamento/Resumo Gerado',
      handoff_to_human: true,
    })

    expect(facts.case_type).toBe('PERSONALIZADO')
    expect(facts.handoff_to_human).toBe(true)
    // Não deve criar pedido de produção - é personalizado
    expect(facts.link_sent).toBeUndefined()
    expect(shouldCreateOrder(facts)).toBe(false)
  })

  it('Todos os dados foram coletados antes da escalação', () => {
    expect(facts.customer_name).toBe('Roberto')
    expect(facts.product_model).toBe('2f')
    expect(facts.height_cm).toBe(75)
    expect(facts.width_cm).toBe(130)
    expect(facts.color).toBe('PRETO')
  })
})

describe('Fluxo E2E: Cliente desiste', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Começa conversa normal', () => {
    facts = mergeFacts(facts, {
      customer_name: 'Pedro',
      product_model: '3f',
      stage_suggested: 'Qualificado',
    })

    expect(facts.product_model).toBe('3f')
  })

  it('Passo 2: Cliente diz "não quero mais" → Não Interessado', () => {
    facts = mergeFacts(facts, {
      stage_suggested: 'Nao Interessado',
    })

    const leadStage = STAGE_MAP[facts.stage_suggested as string]
    expect(leadStage).toBe('inativo')
    // Dados anteriores preservados (para retomada futura)
    expect(facts.customer_name).toBe('Pedro')
    expect(facts.product_model).toBe('3f')
  })
})

describe('Fluxo E2E: Cliente com múltiplas janelas e desconto', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Cliente quer 3 janelas 2F', () => {
    facts = mergeFacts(facts, {
      customer_name: 'Lucia',
      product_model: '2f',
      height_cm: 60,
      width_cm: 100,
      color: 'BRANCO',
      glass_type: 'INCOLOR',
      quantity: 3,
      discount_progressive_pct: 10, // 3+ unidades = 10%
      stage_suggested: 'Qualificado',
    })

    expect(facts.quantity).toBe(3)
    expect(facts.discount_progressive_pct).toBe(10)
  })

  it('Passo 2: Muda quantidade para 2 → desconto muda', () => {
    facts = mergeFacts(facts, {
      quantity: 2,
      discount_progressive_pct: 5, // 2 unidades = 5%
    })

    expect(facts.quantity).toBe(2)
    expect(facts.discount_progressive_pct).toBe(5)
    expect(facts.product_model).toBe('2f') // preservado
  })
})

describe('Fluxo E2E: Retomada após conversa stale', () => {
  it('cenário: fatos anteriores geram resumo, nova conversa usa resumo', () => {
    // Estado da conversa anterior
    const oldFacts: Record<string, unknown> = {
      customer_name: 'Mariana',
      product_model: 'capelinha',
      height_cm: 50,
      width_cm: 120,
      color: 'BRANCO',
      glass_type: 'INCOLOR',
      stage_suggested: 'Qualificado',
    }

    // Gerar resumo
    const parts: string[] = []
    if (oldFacts.product_model) parts.push(`Modelo: ${oldFacts.product_model}`)
    if (oldFacts.height_cm && oldFacts.width_cm) parts.push(`Medidas: ${oldFacts.width_cm}x${oldFacts.height_cm}cm`)
    if (oldFacts.color) parts.push(`Cor: ${oldFacts.color}`)
    if (oldFacts.glass_type) parts.push(`Vidro: ${oldFacts.glass_type}`)
    const summary = `Conversa anterior: ${parts.join(', ')}`

    expect(summary).toContain('Modelo: capelinha')
    expect(summary).toContain('Medidas: 120x50cm')
    expect(summary).toContain('Cor: BRANCO')

    // Nova conversa começa do zero, mas com resumo no prompt
    let newFacts: Record<string, unknown> = {}

    // Cliente confirma "sim, ainda quero"
    newFacts = mergeFacts(newFacts, {
      customer_name: 'Mariana',
      product_model: 'capelinha',
      height_cm: 50,
      width_cm: 120,
      color: 'BRANCO',
      glass_type: 'INCOLOR',
      stage_suggested: 'Qualificado',
    })

    expect(newFacts.product_model).toBe('capelinha')
    expect(newFacts.height_cm).toBe(50)
  })

  it('cenário: cliente retorna e quer produto diferente', () => {
    let facts: Record<string, unknown> = {}

    // Cliente diz "quero diferente, agora quero 3 folhas"
    facts = mergeFacts(facts, {
      customer_name: 'Mariana',
      product_model: '3f',
      stage_suggested: 'Qualificado',
    })

    expect(facts.product_model).toBe('3f')
    // Nenhum dado antigo para conflitar - conversa limpa
  })
})

describe('Fluxo E2E: 3F com grade e tela', () => {
  let facts: Record<string, unknown> = {}

  it('Passo 1: Cliente quer 3F com tela e grade', () => {
    facts = mergeFacts(facts, {
      customer_name: 'Fernando',
      product_model: '3f_tela_grade',
      height_cm: 60,
      width_cm: 150,
      color: 'PRETO',
      glass_type: 'FUME_CLARO',
      has_grille: true,
      quantity: 1,
      cep: '30130000', // BH
    })

    const model = MODEL_MAP[facts.product_model as string]
    expect(model).toBe('TELA') // 3f_tela_grade → TELA
    expect(facts.has_grille).toBe(true)

    // CEP fora de SP
    expect((facts.cep as string).startsWith('0')).toBe(false)
  })

  it('Passo 2: Link enviado → pedido deve ter grade como acessório', () => {
    facts = mergeFacts(facts, {
      product_url: 'https://shopify.com/3f-tela-grade-preto-150x60',
      link_sent: true,
      stage_suggested: 'Link Enviado',
    })

    expect(shouldCreateOrder(facts)).toBe(true)
    // Pedido deve incluir:
    // - model: 'TELA'
    // - has_grade: true (vem de product_model contém 'grade' OU has_grille=true)
    // - delivery_type: 'transportadora' (CEP não começa com 0)
    const hasGrade = (facts.has_grille as boolean) ||
      ((facts.product_model as string)?.includes('grade') ?? false)
    expect(hasGrade).toBe(true)
  })
})

describe('Edge cases do fluxo', () => {
  it('múltiplas atualizações de stage sem dados novos não devem perder fatos', () => {
    let facts: Record<string, unknown> = {
      customer_name: 'Test',
      product_model: '2f',
      height_cm: 60,
      width_cm: 100,
    }

    // GPT repete os mesmos dados em cada mensagem
    for (let i = 0; i < 5; i++) {
      facts = mergeFacts(facts, {
        stage_suggested: 'Qualificado',
        customer_name: 'Test',
        product_model: '2f',
      })
    }

    // Nada deve ter sido resetado (modelo não mudou)
    expect(facts.height_cm).toBe(60)
    expect(facts.width_cm).toBe(100)
  })

  it('GPT retorna apenas stage sem outros campos → fatos preservados', () => {
    let facts: Record<string, unknown> = {
      customer_name: 'Julia',
      product_model: '3f',
      height_cm: 50,
      width_cm: 120,
      color: 'PRETO',
    }

    // GPT responde com dados mínimos
    facts = mergeFacts(facts, {
      stage_suggested: 'Orcamento/Resumo Gerado',
    })

    expect(facts.customer_name).toBe('Julia')
    expect(facts.product_model).toBe('3f')
    expect(facts.height_cm).toBe(50)
    expect(facts.width_cm).toBe(120)
    expect(facts.color).toBe('PRETO')
  })

  it('product_url recebido sem link_sent NÃO deve criar pedido', () => {
    const facts: Record<string, unknown> = {
      product_model: '2f',
      product_url: 'https://shopify.com/algo',
      // link_sent não definido
    }
    expect(shouldCreateOrder(facts)).toBe(false)
  })

  it('link_sent sem product_url NÃO deve criar pedido', () => {
    const facts: Record<string, unknown> = {
      product_model: '2f',
      link_sent: true,
      product_url: null,
    }
    expect(shouldCreateOrder(facts)).toBe(false)
  })
})
