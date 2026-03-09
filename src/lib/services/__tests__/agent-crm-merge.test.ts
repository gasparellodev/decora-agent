/**
 * Testes do merge de fatos do CRM (Problema 1 - perda de memória)
 *
 * Testa a lógica de merge que substitui o antigo `collected_facts: crmData`
 * para garantir que mudanças de ideia do cliente não apagam dados já coletados.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Extraímos a lógica de merge para testar isoladamente,
// sem depender do Supabase real.
// ============================================================

/** Campos que resetam dependentes quando mudam de valor */
const DEPENDENT_RESETS: Record<string, string[]> = {
  product_model: ['product_url', 'link_sent', 'height_cm', 'width_cm'],
  height_cm: ['product_url', 'link_sent'],
  width_cm: ['product_url', 'link_sent'],
  color: ['product_url', 'link_sent'],
}

/**
 * Replica exatamente a lógica de merge de processCRMOutput
 * (agent.service.ts linhas 148-168)
 */
function mergeFacts(
  existingFacts: Record<string, unknown>,
  newCrmData: Record<string, unknown>
): Record<string, unknown> {
  const mergedFacts: Record<string, unknown> = { ...existingFacts }

  for (const [key, value] of Object.entries(newCrmData)) {
    if (value !== null && value !== undefined) {
      if (DEPENDENT_RESETS[key] && existingFacts[key] !== undefined && existingFacts[key] !== value) {
        for (const dep of DEPENDENT_RESETS[key]) {
          mergedFacts[dep] = null
        }
      }
      mergedFacts[key] = value
    }
  }

  return mergedFacts
}

describe('Fact Merge Logic (Problem 1)', () => {
  describe('Basic merge - preserva dados existentes', () => {
    it('deve preservar campos existentes quando novo CRM não os inclui', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        glass_type: 'INCOLOR',
        cep: '01310100',
      }
      const newData = {
        stage_suggested: 'Qualificado',
        customer_name: 'João',
      }

      const result = mergeFacts(existing, newData)

      expect(result.product_model).toBe('2f')
      expect(result.height_cm).toBe(60)
      expect(result.width_cm).toBe(100)
      expect(result.color).toBe('BRANCO')
      expect(result.glass_type).toBe('INCOLOR')
      expect(result.cep).toBe('01310100')
      expect(result.customer_name).toBe('João')
      expect(result.stage_suggested).toBe('Qualificado')
    })

    it('deve ignorar campos null/undefined do novo CRM', () => {
      const existing = {
        product_model: '3f',
        color: 'PRETO',
      }
      const newData = {
        product_model: null,
        color: undefined,
        height_cm: null,
        stage_suggested: 'Qualificado',
      } as Record<string, unknown>

      const result = mergeFacts(existing, newData)

      expect(result.product_model).toBe('3f')
      expect(result.color).toBe('PRETO')
      expect(result.stage_suggested).toBe('Qualificado')
    })
  })

  describe('Mudança de modelo - reseta dependentes', () => {
    it('deve resetar URL e link_sent quando modelo muda', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        product_url: 'https://shopify.com/product-2f',
        link_sent: true,
      }
      const newData = {
        product_model: '3f',
      }

      const result = mergeFacts(existing, newData)

      expect(result.product_model).toBe('3f')
      expect(result.product_url).toBeNull()
      expect(result.link_sent).toBeNull()
      expect(result.height_cm).toBeNull() // medidas resetadas ao mudar modelo
      expect(result.width_cm).toBeNull()
      expect(result.color).toBe('BRANCO') // cor NÃO reseta ao mudar modelo
    })

    it('deve resetar ao trocar de 2f para capelinha', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 120,
        product_url: 'https://link-antigo.com',
        link_sent: true,
        color: 'PRETO',
        glass_type: 'FUME_CLARO',
      }
      const newData = {
        product_model: 'capelinha_3v',
      }

      const result = mergeFacts(existing, newData)

      expect(result.product_model).toBe('capelinha_3v')
      expect(result.product_url).toBeNull()
      expect(result.link_sent).toBeNull()
      expect(result.height_cm).toBeNull()
      expect(result.width_cm).toBeNull()
      // Preserva dados não dependentes
      expect(result.color).toBe('PRETO')
      expect(result.glass_type).toBe('FUME_CLARO')
    })

    it('NÃO deve resetar se modelo é o mesmo', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        product_url: 'https://shopify.com/link',
        link_sent: true,
      }
      const newData = {
        product_model: '2f', // mesmo modelo
        color: 'PRETO',
      }

      const result = mergeFacts(existing, newData)

      expect(result.product_model).toBe('2f')
      expect(result.product_url).toBe('https://shopify.com/link') // mantido
      expect(result.link_sent).toBe(true) // mantido
      expect(result.height_cm).toBe(60)
      expect(result.width_cm).toBe(100)
      expect(result.color).toBe('PRETO')
    })
  })

  describe('Mudança de medidas - reseta URL e link', () => {
    it('deve resetar URL ao mudar altura', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        product_url: 'https://old-link.com',
        link_sent: true,
      }
      const newData = {
        height_cm: 80, // mudou altura
      }

      const result = mergeFacts(existing, newData)

      expect(result.height_cm).toBe(80)
      expect(result.product_url).toBeNull()
      expect(result.link_sent).toBeNull()
      expect(result.product_model).toBe('2f') // modelo preservado
      expect(result.width_cm).toBe(100) // largura preservada
    })

    it('deve resetar URL ao mudar largura', () => {
      const existing = {
        product_model: '3f',
        height_cm: 60,
        width_cm: 100,
        product_url: 'https://old-link.com',
        link_sent: true,
      }
      const newData = {
        width_cm: 150, // mudou largura
      }

      const result = mergeFacts(existing, newData)

      expect(result.width_cm).toBe(150)
      expect(result.product_url).toBeNull()
      expect(result.link_sent).toBeNull()
      expect(result.height_cm).toBe(60) // altura preservada
    })
  })

  describe('Mudança de cor - reseta URL e link', () => {
    it('deve resetar URL ao mudar cor de BRANCO para PRETO', () => {
      const existing = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        product_url: 'https://link-branco.com',
        link_sent: true,
      }
      const newData = {
        color: 'PRETO',
      }

      const result = mergeFacts(existing, newData)

      expect(result.color).toBe('PRETO')
      expect(result.product_url).toBeNull()
      expect(result.link_sent).toBeNull()
      expect(result.product_model).toBe('2f') // preservado
      expect(result.height_cm).toBe(60) // preservado
    })
  })

  describe('Cenários complexos de mudança de ideia', () => {
    it('cenário: cliente muda modelo, depois dá medidas novas', () => {
      // Passo 1: cliente escolheu 2f com medidas
      let facts: Record<string, unknown> = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        product_url: 'https://link-2f.com',
        link_sent: true,
      }

      // Passo 2: "na verdade quero 3 folhas"
      facts = mergeFacts(facts, { product_model: '3f' })
      expect(facts.product_model).toBe('3f')
      expect(facts.product_url).toBeNull()
      expect(facts.link_sent).toBeNull()
      expect(facts.height_cm).toBeNull()
      expect(facts.width_cm).toBeNull()

      // Passo 3: dá medidas novas
      facts = mergeFacts(facts, { height_cm: 80, width_cm: 150 })
      expect(facts.product_model).toBe('3f')
      expect(facts.height_cm).toBe(80)
      expect(facts.width_cm).toBe(150)
      expect(facts.color).toBe('BRANCO') // cor preservada desde passo 1
    })

    it('cenário: cliente muda só a cor, mantém tudo', () => {
      let facts: Record<string, unknown> = {
        product_model: '2f',
        height_cm: 60,
        width_cm: 100,
        color: 'BRANCO',
        glass_type: 'MINI_BOREAL',
        cep: '04567890',
        quantity: 2,
        product_url: 'https://link.com',
        link_sent: true,
      }

      // Muda só a cor
      facts = mergeFacts(facts, { color: 'PRETO' })

      expect(facts.color).toBe('PRETO')
      expect(facts.product_url).toBeNull() // resetado
      expect(facts.link_sent).toBeNull() // resetado
      // Tudo mais preservado
      expect(facts.product_model).toBe('2f')
      expect(facts.height_cm).toBe(60)
      expect(facts.width_cm).toBe(100)
      expect(facts.glass_type).toBe('MINI_BOREAL')
      expect(facts.cep).toBe('04567890')
      expect(facts.quantity).toBe(2)
    })

    it('cenário: mudanças sequenciais sem perda', () => {
      let facts: Record<string, unknown> = {}

      // 1. Nome
      facts = mergeFacts(facts, { customer_name: 'Maria', stage_suggested: 'Lead Novo' })
      expect(facts.customer_name).toBe('Maria')

      // 2. Modelo
      facts = mergeFacts(facts, { product_model: 'capelinha', stage_suggested: 'Qualificado' })
      expect(facts.customer_name).toBe('Maria')
      expect(facts.product_model).toBe('capelinha')

      // 3. Medidas
      facts = mergeFacts(facts, { height_cm: 40, width_cm: 80 })
      expect(facts.customer_name).toBe('Maria')
      expect(facts.product_model).toBe('capelinha')
      expect(facts.height_cm).toBe(40)

      // 4. Cor
      facts = mergeFacts(facts, { color: 'BRANCO' })
      expect(facts.customer_name).toBe('Maria')
      expect(facts.product_model).toBe('capelinha')
      expect(facts.height_cm).toBe(40)
      expect(facts.color).toBe('BRANCO')

      // 5. Vidro
      facts = mergeFacts(facts, { glass_type: 'FUME_CLARO' })
      expect(Object.keys(facts)).toContain('glass_type')
      expect(facts.glass_type).toBe('FUME_CLARO')
    })

    it('cenário: primeiro modelo sem dados prévios não reseta nada', () => {
      const existing = {
        customer_name: 'Carlos',
        stage_suggested: 'Lead Novo',
      }
      const newData = {
        product_model: '2f',
      }

      const result = mergeFacts(existing, newData)

      // product_model é novo (não existia antes), não deve resetar dependentes
      expect(result.product_model).toBe('2f')
      expect(result.customer_name).toBe('Carlos')
      // Não havia height_cm/width_cm para resetar
    })
  })

  describe('Edge cases', () => {
    it('deve lidar com fatos existentes vazios', () => {
      const result = mergeFacts({}, { product_model: '2f', customer_name: 'Test' })
      expect(result.product_model).toBe('2f')
      expect(result.customer_name).toBe('Test')
    })

    it('deve lidar com novo CRM vazio', () => {
      const existing = { product_model: '2f', color: 'BRANCO' }
      const result = mergeFacts(existing, {})
      expect(result).toEqual(existing)
    })

    it('deve lidar com valores booleanos false (não confundir com null)', () => {
      const existing = { link_sent: true }
      const result = mergeFacts(existing, { link_sent: false })
      expect(result.link_sent).toBe(false)
    })

    it('deve lidar com valores zero (não confundir com null)', () => {
      const existing = { quantity: 3 }
      const result = mergeFacts(existing, { discount_progressive_pct: 0 })
      expect(result.discount_progressive_pct).toBe(0)
      expect(result.quantity).toBe(3)
    })
  })
})
