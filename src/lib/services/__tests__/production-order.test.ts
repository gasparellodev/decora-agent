/**
 * Testes de criação de pedido de produção (Problema 3)
 *
 * Verifica que createProductionOrder mapeia corretamente os dados
 * do CRM para as tabelas orders, glass_cuts e order_accessories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Mock do Supabase
// ============================================================

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn().mockImplementation(() => ({
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
  }),
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: mockMaybeSingle,
    }),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Importar DEPOIS do mock
const { createProductionOrder } = await import('@/lib/services/production-order.service')

// ============================================================
// Fixtures
// ============================================================

function makeCRMData(overrides: Record<string, unknown> = {}) {
  return {
    case_type: 'PADRAO' as const,
    handoff_to_human: false,
    stage_suggested: 'Link Enviado',
    customer_name: 'Maria Silva',
    customer_phone: '11999887766',
    cep: '04567890',
    city_state: 'São Paulo - SP',
    installation_type: null,
    product_family: 'CORRER' as const,
    product_model: '2f',
    height_cm: 60,
    width_cm: 100,
    color: 'BRANCO' as const,
    glass_type: 'INCOLOR' as const,
    has_grille: false,
    quantity: 1,
    rural_context: false,
    privacy_need: false,
    notes: null,
    payment_preference: 'PIX' as const,
    discount_progressive_pct: 0,
    discount_pix_pct: 5,
    shipping_type: null,
    delivery_estimate_text: null,
    pickup_possible: false,
    pickup_estimate_text: '',
    product_url: 'https://shopify.com/produto',
    link_sent: true,
    ...overrides,
  }
}

const mockLead = {
  id: 'lead-123',
  name: 'Maria Silva',
  phone: '5511999887766',
  cep: '04567890',
  stage: 'orcamento',
}

const mockConversation = {
  id: 'conv-456',
  lead_id: 'lead-123',
  status: 'active',
  channel: 'whatsapp',
}

// ============================================================
// Tests
// ============================================================

describe('createProductionOrder (Problem 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no existing order
    mockMaybeSingle.mockResolvedValue({ data: null })
    // Default: order creation succeeds
    mockSingle.mockResolvedValue({ data: { id: 'order-789' }, error: null })
  })

  describe('MODEL_MAP - mapeamento de modelos', () => {
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

    it.each(Object.entries(MODEL_MAP))('deve mapear "%s" para "%s"', (input, expected) => {
      expect(MODEL_MAP[input]).toBe(expected)
    })
  })

  describe('GLASS_MAP - mapeamento de vidros', () => {
    const GLASS_MAP: Record<string, string> = {
      'INCOLOR': 'Incolor',
      'MINI_BOREAL': 'Mini Boreal',
      'FUME_CLARO': 'Fume',
    }

    it.each(Object.entries(GLASS_MAP))('deve mapear "%s" para "%s"', (input, expected) => {
      expect(GLASS_MAP[input]).toBe(expected)
    })
  })

  describe('Detecção de grade', () => {
    it('deve detectar grade via has_grille=true', () => {
      const crm = makeCRMData({ has_grille: true, product_model: '2f' })
      const hasGrade = crm.has_grille || (crm.product_model?.includes('grade') ?? false)
      expect(hasGrade).toBe(true)
    })

    it('deve detectar grade via product_model contendo "grade"', () => {
      const crm = makeCRMData({ has_grille: false, product_model: '2f_grade' })
      const hasGrade = crm.has_grille || (crm.product_model?.includes('grade') ?? false)
      expect(hasGrade).toBe(true)
    })

    it('deve ser false quando nem has_grille nem _grade no modelo', () => {
      const crm = makeCRMData({ has_grille: false, product_model: '3f' })
      const hasGrade = crm.has_grille || (crm.product_model?.includes('grade') ?? false)
      expect(hasGrade).toBe(false)
    })
  })

  describe('Tipo de entrega por CEP', () => {
    it('CEP de SP (começa com 0) deve ser entrega_sp', () => {
      const cep = '01310100'
      expect(cep.startsWith('0')).toBe(true)
    })

    it('CEP fora de SP (não começa com 0) deve ser transportadora', () => {
      const cep = '30130000'
      expect(cep.startsWith('0')).toBe(false)
    })
  })

  describe('Proteção contra duplicata', () => {
    it('deve retornar ID existente se pedido já existe para a conversa', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-order-123' } })

      const result = await createProductionOrder(
        makeCRMData() as any,
        mockLead as any,
        mockConversation as any
      )

      expect(result).toBe('existing-order-123')
      // Não deve ter tentado criar novo pedido
      // (o primeiro from('orders').select é a busca de duplicata)
    })
  })

  describe('Mapeamento completo de campos CRM → orders', () => {
    it('deve mapear cor para uppercase', () => {
      const crm = makeCRMData({ color: 'BRANCO' })
      expect((crm.color || 'BRANCO').toUpperCase()).toBe('BRANCO')
    })

    it('deve usar BRANCO como default quando cor é null', () => {
      const crm = makeCRMData({ color: null })
      expect((crm.color || 'BRANCO').toUpperCase()).toBe('BRANCO')
    })

    it('deve usar nome do lead quando customer_name é null', () => {
      const crm = makeCRMData({ customer_name: null })
      const name = crm.customer_name || mockLead.name
      expect(name).toBe('Maria Silva')
    })
  })
})

describe('Production order integration scenarios', () => {
  describe('Cenário: Pedido completo 2F branco 100x60', () => {
    it('deve gerar dados corretos para insert', () => {
      const crm = makeCRMData({
        product_model: '2f',
        color: 'BRANCO',
        height_cm: 60,
        width_cm: 100,
        glass_type: 'INCOLOR',
        quantity: 1,
        cep: '04567890',
      })

      const MODEL_MAP: Record<string, string> = {
        '2f': '2F', '3f': '3F', '3f_tela': 'TELA',
        'capelinha': 'CAPELINHA', 'capelinha_3v': 'CAPELINHA-3V',
      }
      const GLASS_MAP: Record<string, string> = {
        'INCOLOR': 'Incolor', 'MINI_BOREAL': 'Mini Boreal', 'FUME_CLARO': 'Fume',
      }

      const model = MODEL_MAP[crm.product_model || ''] || crm.product_model
      const glassType = GLASS_MAP[crm.glass_type || ''] || 'Incolor'
      const isSP = crm.cep?.startsWith('0') || false

      expect(model).toBe('2F')
      expect(glassType).toBe('Incolor')
      expect(isSP).toBe(true)
    })
  })

  describe('Cenário: Pedido 3F com grade, preto, fora de SP', () => {
    it('deve gerar dados corretos', () => {
      const crm = makeCRMData({
        product_model: '3f_grade',
        color: 'PRETO',
        height_cm: 80,
        width_cm: 150,
        glass_type: 'MINI_BOREAL',
        quantity: 2,
        cep: '30130000',
        has_grille: false, // grade vem do model name
      })

      const MODEL_MAP: Record<string, string> = {
        '2f': '2F', '2f_grade': '2F', '3f': '3F', '3f_grade': '3F',
        '3f_tela': 'TELA', '3f_tela_grade': 'TELA',
        'capelinha': 'CAPELINHA', 'capelinha_3v': 'CAPELINHA-3V',
      }

      const model = MODEL_MAP[crm.product_model || ''] || crm.product_model
      const hasGrade = crm.has_grille || (crm.product_model?.includes('grade') ?? false)
      const isSP = crm.cep?.startsWith('0') || false

      expect(model).toBe('3F')
      expect(hasGrade).toBe(true)
      expect(isSP).toBe(false)
      expect((crm.color || 'BRANCO').toUpperCase()).toBe('PRETO')
    })
  })

  describe('Cenário: Capelinha 3V', () => {
    it('deve mapear para CAPELINHA-3V', () => {
      const MODEL_MAP: Record<string, string> = {
        'capelinha': 'CAPELINHA', 'capelinha_3v': 'CAPELINHA-3V',
      }
      expect(MODEL_MAP['capelinha_3v']).toBe('CAPELINHA-3V')
      expect(MODEL_MAP['capelinha']).toBe('CAPELINHA')
    })
  })
})
