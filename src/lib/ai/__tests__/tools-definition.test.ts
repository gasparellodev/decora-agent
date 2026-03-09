/**
 * Testes das definições de tools (Problema 2 - capelinha na tool)
 *
 * Verifica que get_product_info tem a descrição correta para
 * capelinha vs capelinha_3v e que o enum está completo.
 */
import { describe, it, expect } from 'vitest'
import { agentTools } from '@/lib/ai/tools'

describe('Tool Definitions', () => {
  describe('get_product_info', () => {
    const productTool = agentTools.find(t => t.function.name === 'get_product_info')!

    it('deve existir', () => {
      expect(productTool).toBeDefined()
    })

    it('deve ter model enum com capelinha e capelinha_3v', () => {
      const modelParam = (productTool.function.parameters as any).properties.model
      expect(modelParam.enum).toContain('capelinha')
      expect(modelParam.enum).toContain('capelinha_3v')
    })

    it('deve explicar a diferença entre capelinha e capelinha_3v na descrição', () => {
      const modelParam = (productTool.function.parameters as any).properties.model
      expect(modelParam.description).toContain('1 Vidro')
      expect(modelParam.description).toContain('3 Vidros')
    })

    it('deve instruir a PERGUNTAR antes de usar capelinha vs capelinha_3v', () => {
      const modelParam = (productTool.function.parameters as any).properties.model
      expect(modelParam.description).toMatch(/pergunte/i)
    })

    it('deve ter todos os modelos no enum', () => {
      const modelParam = (productTool.function.parameters as any).properties.model
      const expected = ['2f', '2f_grade', '3f', '3f_grade', '3f_tela', '3f_tela_grade', 'capelinha', 'capelinha_3v', 'arremate']
      for (const m of expected) {
        expect(modelParam.enum).toContain(m)
      }
    })

    it('deve ter glass_type com opções corretas', () => {
      const glassParam = (productTool.function.parameters as any).properties.glass_type
      expect(glassParam.enum).toContain('incolor')
      expect(glassParam.enum).toContain('mini_boreal')
      expect(glassParam.enum).toContain('fume')
    })

    it('deve ter color com branco e preto', () => {
      const colorParam = (productTool.function.parameters as any).properties.color
      expect(colorParam.enum).toContain('branco')
      expect(colorParam.enum).toContain('preto')
    })

    it('deve indicar que vidro NÃO afeta preço', () => {
      expect(productTool.function.description).toMatch(/vidro.*n[aã]o.*afeta.*pre[cç]o/i)
    })
  })

  describe('check_order_status', () => {
    const orderTool = agentTools.find(t => t.function.name === 'check_order_status')!

    it('deve existir', () => {
      expect(orderTool).toBeDefined()
    })

    it('deve aceitar order_number e phone', () => {
      const props = (orderTool.function.parameters as any).properties
      expect(props.order_number).toBeDefined()
      expect(props.phone).toBeDefined()
    })
  })

  describe('escalate_to_human', () => {
    const escalateTool = agentTools.find(t => t.function.name === 'escalate_to_human')!

    it('deve existir', () => {
      expect(escalateTool).toBeDefined()
    })

    it('deve ter reason como required', () => {
      const required = (escalateTool.function.parameters as any).required
      expect(required).toContain('reason')
    })

    it('deve ter prioridade com enum low/medium/high', () => {
      const priorityParam = (escalateTool.function.parameters as any).properties.priority
      expect(priorityParam.enum).toEqual(['low', 'medium', 'high'])
    })
  })

  describe('calculate_shipping', () => {
    const shippingTool = agentTools.find(t => t.function.name === 'calculate_shipping')!

    it('deve existir', () => {
      expect(shippingTool).toBeDefined()
    })

    it('deve ter cep como required', () => {
      const required = (shippingTool.function.parameters as any).required
      expect(required).toContain('cep')
    })
  })

  describe('Completude - todas as 5 tools devem existir', () => {
    it('deve ter exatamente 5 tools', () => {
      expect(agentTools).toHaveLength(5)
    })

    it.each([
      'check_order_status',
      'escalate_to_human',
      'calculate_shipping',
      'get_product_info',
      'create_payment_link',
    ])('deve conter tool "%s"', (name) => {
      expect(agentTools.some(t => t.function.name === name)).toBe(true)
    })
  })
})
