/**
 * Testes do prompt - capelinha/pivotante (Problema 2)
 *
 * Verifica que o prompt contém as instruções corretas para
 * diferenciar capelinha (1 vidro) vs capelinha_3v (3 vidros).
 */
import { describe, it, expect } from 'vitest'

// Mock das dependências do sales-agent.ts
vi.mock('@/lib/data/shopify-prices', () => ({
  ALL_PRICE_TABLES: [],
  KIT_ARREMATE: { tipo: 'arremate', cor: 'branco', variantes: [] },
}))

import { salesAgentPrompt } from '@/lib/ai/prompts/sales-agent'

const mockLead = {
  id: 'lead-1',
  name: 'João',
  phone: '5511999887766',
  cep: '04567890',
  stage: 'novo',
}

describe('Prompt - Capelinha/Pivotante (Problem 2)', () => {
  const prompt = salesAgentPrompt(mockLead as any)

  it('deve mencionar "Pivotante 1 Vidro" com product_model capelinha', () => {
    expect(prompt).toContain('Pivotante 1 Vidro')
    expect(prompt).toContain('capelinha')
  })

  it('deve mencionar "Pivotante 3 Vidros" com product_model capelinha_3v', () => {
    expect(prompt).toContain('Pivotante 3 Vidros')
    expect(prompt).toContain('capelinha_3v')
  })

  it('deve instruir o agente a PERGUNTAR qual variação', () => {
    expect(prompt).toMatch(/pergunte.*1 vidro.*3 vidros|PERGUNTE.*1 vidro.*3 vidros/i)
  })

  it('deve dizer para NÃO assumir 1 vidro automaticamente', () => {
    expect(prompt).toMatch(/NAO assuma.*1 vidro.*automaticamente|nao assuma/i)
  })

  it('deve conter medidas de pivotante horizontal', () => {
    expect(prompt).toContain('30, 40, 50, 60')
    expect(prompt).toContain('80, 100, 120, 150')
  })

  it('deve conter instrução de medidas vertical (lógica invertida)', () => {
    expect(prompt).toMatch(/vertical.*logica invertida|vertical.*invertida/i)
  })

  it('NÃO deve mencionar "6 vidros" (modelo que não existe)', () => {
    expect(prompt).not.toContain('6 vidros')
  })
})

describe('Prompt - Instruções de atualização (Problem 1)', () => {
  it('deve conter instrução de ATUALIZAR quando cliente mudar de ideia', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ product_model: '2f', color: 'BRANCO' })
    )

    expect(prompt).toContain('ATUALIZE se o cliente mudar de ideia')
  })

  it('deve conter regras de atualização quando há fatos coletados', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ product_model: '2f' })
    )

    expect(prompt).toContain('REGRAS DE ATUALIZACAO')
    expect(prompt).toContain('na verdade quero')
    expect(prompt).toContain('product_url = null')
  })

  it('NÃO deve conter "NAO pergunte de novo" (instrução antiga)', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ product_model: '2f' })
    )

    expect(prompt).not.toContain('NAO pergunte de novo')
  })
})

describe('Prompt - Resumo de conversa anterior (Problem 4)', () => {
  it('deve injetar resumo quando conversationSummary é fornecido', () => {
    const summary = 'Conversa anterior (07/03/2026): Modelo: 2f, Medidas: 100x60cm, Cor: BRANCO'
    const prompt = salesAgentPrompt(
      mockLead as any, [], undefined, undefined, undefined, undefined,
      summary
    )

    expect(prompt).toContain('CONVERSA ANTERIOR')
    expect(prompt).toContain(summary)
    expect(prompt).toContain('Ainda tem interesse')
  })

  it('NÃO deve injetar bloco de resumo quando não há summary', () => {
    const prompt = salesAgentPrompt(mockLead as any)

    expect(prompt).not.toContain('CONVERSA ANTERIOR')
  })
})

describe('Prompt - Dados coletados são exibidos', () => {
  it('deve exibir modelo nos dados coletados', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ product_model: '3f_tela', height_cm: 80, width_cm: 120 })
    )

    expect(prompt).toContain('Modelo: 3f_tela')
    expect(prompt).toContain('Altura: 80cm')
    expect(prompt).toContain('Largura: 120cm')
  })

  it('deve exibir cor e vidro nos dados coletados', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ color: 'PRETO', glass_type: 'FUME_CLARO' })
    )

    expect(prompt).toContain('Cor: PRETO')
    expect(prompt).toContain('Vidro: FUME_CLARO')
  })

  it('deve exibir link enviado nos dados coletados', () => {
    const prompt = salesAgentPrompt(mockLead as any, [], undefined, undefined, undefined,
      JSON.stringify({ product_url: 'https://shopify.com/link', link_sent: true })
    )

    expect(prompt).toContain('Link enviado: https://shopify.com/link')
  })
})
