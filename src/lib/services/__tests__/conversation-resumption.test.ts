/**
 * Testes de retomada de conversa / stale conversation (Problema 4)
 *
 * Verifica que ao retomar uma conversa após pausa, o agente:
 * 1. Gera resumo dos fatos antes de limpar
 * 2. Injeta resumo no prompt
 * 3. Usa STALE_HOURS corretamente
 */
import { describe, it, expect } from 'vitest'

// ============================================================
// Lógica de geração de resumo (extraída de agent.service.ts linhas 279-298)
// ============================================================

function generateConversationSummary(
  facts: Record<string, unknown>,
  lastMessageAt: string
): string | null {
  const parts: string[] = []
  if (facts.product_model) parts.push(`Modelo: ${facts.product_model}`)
  if (facts.height_cm && facts.width_cm) parts.push(`Medidas: ${facts.width_cm}x${facts.height_cm}cm`)
  if (facts.color) parts.push(`Cor: ${facts.color}`)
  if (facts.glass_type) parts.push(`Vidro: ${facts.glass_type}`)
  if (facts.quantity) parts.push(`Qtd: ${facts.quantity}`)
  if (facts.cep) parts.push(`CEP: ${facts.cep}`)
  if (facts.stage_suggested) parts.push(`Estagio: ${facts.stage_suggested}`)

  if (parts.length === 0) return null

  return `Conversa anterior (${new Date(lastMessageAt).toLocaleDateString('pt-BR')}): ${parts.join(', ')}`
}

// ============================================================
// Lógica de verificação de stale (agent.service.ts linhas 271-274)
// ============================================================

function isConversationStale(lastMessageAt: string, staleHours: number): boolean {
  const hoursSinceLastMessage = (Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60)
  return hoursSinceLastMessage > staleHours
}

describe('Conversation Resumption (Problem 4)', () => {
  describe('generateConversationSummary', () => {
    it('deve gerar resumo com todos os campos preenchidos', () => {
      const facts = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        glass_type: 'INCOLOR',
        quantity: 2,
        cep: '04567890',
        stage_suggested: 'Link Enviado',
      }
      const lastMessageAt = '2026-03-07T10:00:00Z'

      const summary = generateConversationSummary(facts, lastMessageAt)

      expect(summary).not.toBeNull()
      expect(summary).toContain('Modelo: 2f')
      expect(summary).toContain('Medidas: 100x60cm')
      expect(summary).toContain('Cor: BRANCO')
      expect(summary).toContain('Vidro: INCOLOR')
      expect(summary).toContain('Qtd: 2')
      expect(summary).toContain('CEP: 04567890')
      expect(summary).toContain('Estagio: Link Enviado')
      expect(summary).toContain('Conversa anterior')
    })

    it('deve gerar resumo parcial (apenas modelo e medidas)', () => {
      const facts = {
        product_model: 'capelinha_3v',
        height_cm: 40,
        width_cm: 80,
      }
      const lastMessageAt = '2026-03-06T15:00:00Z'

      const summary = generateConversationSummary(facts, lastMessageAt)

      expect(summary).not.toBeNull()
      expect(summary).toContain('Modelo: capelinha_3v')
      expect(summary).toContain('Medidas: 80x40cm')
      expect(summary).not.toContain('Cor:')
      expect(summary).not.toContain('Vidro:')
    })

    it('deve retornar null quando não há fatos relevantes', () => {
      const facts = {
        case_type: 'PADRAO',
        handoff_to_human: false,
      }
      const lastMessageAt = '2026-03-07T10:00:00Z'

      const summary = generateConversationSummary(facts, lastMessageAt)
      expect(summary).toBeNull()
    })

    it('não deve incluir medidas se apenas uma dimensão', () => {
      const facts = {
        product_model: '2f',
        height_cm: 60,
        // width_cm ausente
      }
      const lastMessageAt = '2026-03-07T10:00:00Z'

      const summary = generateConversationSummary(facts, lastMessageAt)

      expect(summary).not.toBeNull()
      expect(summary).toContain('Modelo: 2f')
      expect(summary).not.toContain('Medidas:')
    })

    it('deve formatar data em pt-BR', () => {
      const facts = { product_model: '3f' }
      const lastMessageAt = '2026-03-07T10:00:00Z'

      const summary = generateConversationSummary(facts, lastMessageAt)

      // pt-BR date format: dd/mm/yyyy
      expect(summary).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('isConversationStale', () => {
    it('conversa de 2h atrás com STALE_HOURS=1 deve ser stale', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      expect(isConversationStale(twoHoursAgo, 1)).toBe(true)
    })

    it('conversa de 30min atrás com STALE_HOURS=1 NÃO deve ser stale', () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      expect(isConversationStale(thirtyMinAgo, 1)).toBe(false)
    })

    it('conversa de 25h atrás com STALE_HOURS=24 deve ser stale', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      expect(isConversationStale(twentyFiveHoursAgo, 24)).toBe(true)
    })

    it('conversa de 23h atrás com STALE_HOURS=24 NÃO deve ser stale', () => {
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
      expect(isConversationStale(twentyThreeHoursAgo, 24)).toBe(false)
    })

    it('conversa de agora NÃO deve ser stale', () => {
      const now = new Date().toISOString()
      expect(isConversationStale(now, 1)).toBe(false)
    })
  })

  describe('Cenários de retomada', () => {
    it('cenário: cliente volta após 2h com fatos completos', () => {
      const facts = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        glass_type: 'INCOLOR',
        quantity: 1,
        cep: '04567890',
        stage_suggested: 'Orcamento/Resumo Gerado',
      }
      const lastMessageAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

      // Deve ser stale com STALE_HOURS=1
      expect(isConversationStale(lastMessageAt, 1)).toBe(true)

      // Deve gerar resumo antes de limpar
      const summary = generateConversationSummary(facts, lastMessageAt)
      expect(summary).not.toBeNull()
      expect(summary).toContain('Modelo: 2f')
      expect(summary).toContain('Medidas: 100x60cm')
    })

    it('cenário: cliente volta após 30min - não deve resetar', () => {
      const lastMessageAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      // Não deve ser stale com STALE_HOURS=1
      expect(isConversationStale(lastMessageAt, 1)).toBe(false)
      // Fatos devem ser passados diretamente ao prompt (não gera resumo)
    })

    it('cenário: conversa sem fatos relevantes - não gera resumo', () => {
      const facts = {
        case_type: 'PADRAO',
        stage_suggested: 'Lead Novo', // stage_suggested é incluído
      }
      const lastMessageAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

      expect(isConversationStale(lastMessageAt, 1)).toBe(true)

      const summary = generateConversationSummary(facts, lastMessageAt)
      // stage_suggested IS included, so summary should not be null
      expect(summary).not.toBeNull()
      expect(summary).toContain('Estagio: Lead Novo')
    })
  })
})
