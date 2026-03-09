/**
 * Testes de extração de dados do cliente e escolha de vidro.
 *
 * Funções testadas: extractDataFromMessage, extractGlassChoice
 * (agent.service.ts linhas 1007-1071)
 *
 * Cenários: mensagens reais de clientes WhatsApp com dados estruturados e não-estruturados.
 */
import { describe, it, expect } from 'vitest'

// ============================================================
// Réplica das funções (privadas em agent.service.ts)
// ============================================================

function extractDataFromMessage(text: string): Record<string, string> {
  const data: Record<string, string> = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (lower.includes('nome') && line.includes(':')) {
      data.name = line.split(':')[1]?.trim()
    }

    if ((lower.includes('endereco') || lower.includes('endereço')) && line.includes(':')) {
      data.address = line.split(':')[1]?.trim()
    }
  }

  const cepMatch = text.match(/\b(\d{5})-?(\d{3})\b/)
  if (cepMatch) {
    data.cep = cepMatch[0].replace('-', '')
  }

  const cpfMatch = text.match(/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/)
  if (cpfMatch) {
    data.cpf = cpfMatch[0].replace(/\D/g, '')
  }

  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  if (emailMatch) {
    data.email = emailMatch[0]
  }

  const phoneMatch = text.match(/\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/)
  if (phoneMatch) {
    data.whatsapp = phoneMatch[0].replace(/\D/g, '')
  }

  if (!data.name) {
    const nameMatch = text.match(/^([A-ZÀ-Ú][a-zà-ú]+ ){1,3}[A-ZÀ-Ú][a-zà-ú]+/m)
    if (nameMatch) {
      data.name = nameMatch[0].trim()
    }
  }

  return data
}

function extractGlassChoice(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('incolor')) return 'incolor'
  if (lower.includes('mini boreal') || lower.includes('boreal')) return 'mini_boreal'
  if (lower.includes('fum') || lower.includes('fumê') || lower.includes('fume')) return 'fume'
  return null
}

// ============================================================
// Testes
// ============================================================

describe('extractDataFromMessage', () => {
  describe('CEP', () => {
    it('deve extrair CEP com hífen', () => {
      const result = extractDataFromMessage('Meu CEP é 04567-890')
      expect(result.cep).toBe('04567890')
    })

    it('deve extrair CEP sem hífen', () => {
      const result = extractDataFromMessage('cep: 01310100')
      expect(result.cep).toBe('01310100')
    })

    it('deve extrair CEP no meio do texto', () => {
      const result = extractDataFromMessage('Moro na zona leste, CEP 08220-610, perto do shopping')
      expect(result.cep).toBe('08220610')
    })

    it('não deve extrair número que não é CEP (6 dígitos)', () => {
      const result = extractDataFromMessage('O pedido é 123456')
      expect(result.cep).toBeUndefined()
    })
  })

  describe('CPF', () => {
    it('deve extrair CPF com pontos e hífen', () => {
      const result = extractDataFromMessage('CPF: 123.456.789-01')
      expect(result.cpf).toBe('12345678901')
    })

    it('deve extrair CPF sem formatação', () => {
      const result = extractDataFromMessage('meu cpf 12345678901')
      expect(result.cpf).toBe('12345678901')
    })

    it('deve extrair CPF parcialmente formatado', () => {
      const result = extractDataFromMessage('cpf: 123456789-01')
      expect(result.cpf).toBe('12345678901')
    })
  })

  describe('Email', () => {
    it('deve extrair email simples', () => {
      const result = extractDataFromMessage('email: joao@gmail.com')
      expect(result.email).toBe('joao@gmail.com')
    })

    it('deve extrair email com pontos', () => {
      const result = extractDataFromMessage('joao.silva@empresa.com.br')
      expect(result.email).toBe('joao.silva@empresa.com.br')
    })

    it('deve extrair email com +', () => {
      const result = extractDataFromMessage('meu email: teste+janela@outlook.com')
      expect(result.email).toBe('teste+janela@outlook.com')
    })

    it('não deve extrair texto sem @', () => {
      const result = extractDataFromMessage('meu nome é João')
      expect(result.email).toBeUndefined()
    })
  })

  describe('Telefone/WhatsApp', () => {
    it('deve extrair telefone com DDD entre parênteses', () => {
      const result = extractDataFromMessage('Whats: (11) 99887-7665')
      expect(result.whatsapp).toBe('11998877665')
    })

    it('deve extrair telefone sem formatação', () => {
      const result = extractDataFromMessage('11999887766')
      expect(result.whatsapp).toBe('11999887766')
    })

    it('deve extrair telefone com pontos', () => {
      const result = extractDataFromMessage('Tel: 11.99988.7766')
      expect(result.whatsapp).toBe('11999887766')
    })

    it('deve extrair telefone fixo (8 dígitos)', () => {
      const result = extractDataFromMessage('(11) 3456-7890')
      expect(result.whatsapp).toBe('1134567890')
    })
  })

  describe('Nome', () => {
    it('deve extrair nome com label "nome:"', () => {
      const result = extractDataFromMessage('Nome: Maria da Silva')
      expect(result.name).toBe('Maria da Silva')
    })

    it('deve extrair nome completo sem label (capitalized)', () => {
      const result = extractDataFromMessage('João Carlos Santos')
      expect(result.name).toBe('João Carlos Santos')
    })

    it('deve priorizar nome com label sobre nome capitalizado', () => {
      const result = extractDataFromMessage('Nome: Ana Paula\nJoão Carlos Santos')
      expect(result.name).toBe('Ana Paula')
    })

    it('não deve extrair nome tudo minúsculo', () => {
      const result = extractDataFromMessage('quero uma janela de 100x60')
      expect(result.name).toBeUndefined()
    })
  })

  describe('Endereço', () => {
    it('deve extrair endereço com label "endereco:"', () => {
      const result = extractDataFromMessage('Endereco: Rua das Flores, 123, Jardim Primavera')
      expect(result.address).toBe('Rua das Flores, 123, Jardim Primavera')
    })

    it('deve extrair endereço com acento "endereço:"', () => {
      const result = extractDataFromMessage('Endereço: Av. Paulista, 1000')
      expect(result.address).toBe('Av. Paulista, 1000')
    })
  })

  describe('Mensagem completa do cliente (cenário real)', () => {
    it('deve extrair todos os dados de uma mensagem estruturada', () => {
      const msg = `Nome: Maria Silva Santos
Endereço: Rua das Palmeiras, 456, apt 12
CEP: 04567-890
CPF: 123.456.789-01
Email: maria.silva@gmail.com
WhatsApp: (11) 98765-4321`

      const result = extractDataFromMessage(msg)

      expect(result.name).toBe('Maria Silva Santos')
      expect(result.address).toBe('Rua das Palmeiras, 456, apt 12')
      expect(result.cep).toBe('04567890')
      expect(result.cpf).toBe('12345678901')
      expect(result.email).toBe('maria.silva@gmail.com')
      expect(result.whatsapp).toBe('11987654321')
    })

    it('deve extrair dados de mensagem não-estruturada', () => {
      const msg = `Oi, sou o Carlos Eduardo Silva, moro no CEP 01310-100.
Meu CPF é 987.654.321-00 e email carlos@hotmail.com
Zap (11) 91234-5678`

      const result = extractDataFromMessage(msg)

      // Nome não é extraído aqui - regex só detecta nome em início de linha capitalizado
      // ou com label "nome:". Texto "Oi, sou o Carlos..." não bate.
      // Isso é uma limitação conhecida - o LLM extrai nome via CRM JSON.
      expect(result.name).toBeUndefined()
      expect(result.cep).toBe('01310100')
      expect(result.cpf).toBe('98765432100')
      expect(result.email).toBe('carlos@hotmail.com')
      expect(result.whatsapp).toBe('11912345678')
    })

    it('deve lidar com mensagem sem dados extraíveis', () => {
      const msg = 'oi bom dia, quero saber o preço de uma janela'
      const result = extractDataFromMessage(msg)

      expect(Object.keys(result).length).toBe(0)
    })
  })
})

describe('extractGlassChoice', () => {
  describe('Incolor', () => {
    it('deve detectar "incolor"', () => {
      expect(extractGlassChoice('quero incolor')).toBe('incolor')
    })

    it('deve detectar "INCOLOR" (case insensitive)', () => {
      expect(extractGlassChoice('INCOLOR por favor')).toBe('incolor')
    })

    it('deve detectar "vidro incolor"', () => {
      expect(extractGlassChoice('prefiro vidro incolor')).toBe('incolor')
    })
  })

  describe('Mini Boreal', () => {
    it('deve detectar "mini boreal"', () => {
      expect(extractGlassChoice('quero mini boreal')).toBe('mini_boreal')
    })

    it('deve detectar apenas "boreal"', () => {
      expect(extractGlassChoice('boreal, por favor')).toBe('mini_boreal')
    })

    it('deve detectar "MINI BOREAL" (case insensitive)', () => {
      expect(extractGlassChoice('MINI BOREAL')).toBe('mini_boreal')
    })
  })

  describe('Fumê', () => {
    it('deve detectar "fume" (sem acento)', () => {
      expect(extractGlassChoice('quero fume')).toBe('fume')
    })

    it('deve detectar "fumê" (com acento)', () => {
      expect(extractGlassChoice('prefiro fumê')).toBe('fume')
    })

    it('deve detectar "fum" (parcial)', () => {
      expect(extractGlassChoice('vidro fum claro')).toBe('fume')
    })

    it('deve detectar "Fume Claro"', () => {
      expect(extractGlassChoice('Fume Claro por favor')).toBe('fume')
    })
  })

  describe('Sem escolha', () => {
    it('deve retornar null quando não menciona vidro', () => {
      expect(extractGlassChoice('quero janela de 100x60')).toBeNull()
    })

    it('deve retornar null para mensagem vazia', () => {
      expect(extractGlassChoice('')).toBeNull()
    })
  })

  describe('Prioridade de detecção', () => {
    it('incolor tem prioridade sobre boreal quando ambos aparecem', () => {
      expect(extractGlassChoice('incolor ou boreal')).toBe('incolor')
    })

    it('mini boreal tem prioridade sobre fume quando ambos aparecem', () => {
      expect(extractGlassChoice('mini boreal ou fume')).toBe('mini_boreal')
    })
  })
})
