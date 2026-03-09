/**
 * Testes do parser de resposta do agente (parseAgentResponse)
 *
 * O GPT retorna: texto para WhatsApp + bloco ---JSON--- ... ---/JSON---
 * O parser separa as duas partes.
 */
import { describe, it, expect } from 'vitest'

/**
 * Replica parseAgentResponse de agent.service.ts (linhas 74-92)
 */
function parseAgentResponse(rawResponse: string): { message: string; crmData: Record<string, unknown> | null } {
  const jsonMatch = rawResponse.match(/---JSON---([\s\S]*?)---\/JSON---/)

  if (!jsonMatch) {
    return { message: rawResponse.trim(), crmData: null }
  }

  const message = rawResponse.replace(/---JSON---[\s\S]*?---\/JSON---/, '').trim()
  const jsonStr = jsonMatch[1].trim()

  try {
    const crmData = JSON.parse(jsonStr) as Record<string, unknown>
    return { message, crmData }
  } catch {
    return { message: rawResponse.replace(/---JSON---[\s\S]*?---\/JSON---/, '').trim(), crmData: null }
  }
}

describe('parseAgentResponse', () => {
  it('deve separar mensagem e JSON corretamente', () => {
    const raw = `Olá! Tudo bem? Qual modelo você procura?

---JSON---
{
  "case_type": "PADRAO",
  "stage_suggested": "Lead Novo",
  "customer_name": null,
  "product_model": null,
  "link_sent": false
}
---/JSON---`

    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toBe('Olá! Tudo bem? Qual modelo você procura?')
    expect(crmData).not.toBeNull()
    expect(crmData!.case_type).toBe('PADRAO')
    expect(crmData!.stage_suggested).toBe('Lead Novo')
    expect(crmData!.link_sent).toBe(false)
  })

  it('deve retornar apenas mensagem quando não tem JSON', () => {
    const raw = 'Olá, como posso ajudar?'
    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toBe('Olá, como posso ajudar?')
    expect(crmData).toBeNull()
  })

  it('deve tratar JSON inválido graciosamente', () => {
    const raw = `Olá!

---JSON---
{invalid json here}
---/JSON---`

    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toBe('Olá!')
    expect(crmData).toBeNull()
  })

  it('deve extrair JSON com todos os campos do CRMOutput', () => {
    const raw = `Perfeito! O modelo 2F 100x60cm em branco fica R$189. Aqui o link:
https://shopify.com/produto

---JSON---
{
  "case_type": "PADRAO",
  "handoff_to_human": false,
  "stage_suggested": "Link Enviado",
  "customer_name": "Maria",
  "customer_phone": null,
  "cep": "04567890",
  "product_model": "2f",
  "height_cm": 60,
  "width_cm": 100,
  "color": "BRANCO",
  "glass_type": "INCOLOR",
  "has_grille": false,
  "quantity": 1,
  "product_url": "https://shopify.com/produto",
  "link_sent": true
}
---/JSON---`

    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toContain('Perfeito!')
    expect(message).toContain('https://shopify.com/produto')
    expect(crmData).not.toBeNull()
    expect(crmData!.product_model).toBe('2f')
    expect(crmData!.height_cm).toBe(60)
    expect(crmData!.width_cm).toBe(100)
    expect(crmData!.link_sent).toBe(true)
    expect(crmData!.customer_name).toBe('Maria')
    expect(crmData!.cep).toBe('04567890')
  })

  it('deve lidar com mensagem multilinha antes do JSON', () => {
    const raw = `Oi Maria! 😊
---
Pra te ajudar melhor, qual o modelo que procura?
Temos 2 Folhas, 3 Folhas, e Pivotante.

---JSON---
{"stage_suggested": "Lead Novo", "case_type": "PADRAO"}
---/JSON---`

    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toContain('Oi Maria!')
    expect(message).toContain('Temos 2 Folhas')
    expect(crmData).not.toBeNull()
    expect(crmData!.stage_suggested).toBe('Lead Novo')
  })

  it('não deve capturar JSON fora dos delimitadores', () => {
    const raw = '{"name": "test"} this is not CRM data'
    const { message, crmData } = parseAgentResponse(raw)

    expect(message).toBe('{"name": "test"} this is not CRM data')
    expect(crmData).toBeNull()
  })
})
