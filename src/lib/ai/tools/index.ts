import OpenAI from 'openai'

export const agentTools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_order_status',
      description: 'Consulta o status de um pedido pelo número do pedido ou telefone do cliente. Use quando o cliente perguntar sobre seu pedido, entrega ou produção.',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'string',
            description: 'Número do pedido (ex: #1234 ou 1234)'
          },
          phone: {
            type: 'string',
            description: 'Telefone do cliente para buscar pedidos'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Transfere a conversa para um atendente humano. Use quando o cliente pedir explicitamente, estiver muito insatisfeito, ou a situação exigir intervenção humana.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Motivo da transferência (ex: "cliente solicitou atendente", "reclamação sobre entrega")'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Prioridade: low=pode esperar, medium=importante, high=urgente/cliente irritado'
          },
          summary: {
            type: 'string',
            description: 'Resumo breve da conversa para o atendente'
          }
        },
        required: ['reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_shipping',
      description: 'Calcula o frete para entrega em um CEP específico. Use quando o cliente perguntar sobre valor ou prazo de frete para sua região.',
      parameters: {
        type: 'object',
        properties: {
          cep: {
            type: 'string',
            description: 'CEP de destino (apenas números, ex: 01310100)'
          },
          width: {
            type: 'number',
            description: 'Largura da janela em centímetros'
          },
          height: {
            type: 'number',
            description: 'Altura da janela em centímetros'
          },
          quantity: {
            type: 'number',
            description: 'Quantidade de janelas'
          }
        },
        required: ['cep']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_info',
      description: 'Busca informações e preços de produtos. Pode ser chamada SEM medidas para retornar as dimensões disponíveis e faixa de preço, ou COM medidas para retornar o preço exato e link de compra. Preços são fixos por medida e cor. O tipo de vidro NÃO afeta o preço. Para Kit Arremate: preço R$117 (order bump), NÃO disponível no Mercado Livre.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            enum: ['2f', '2f_grade', '3f', '3f_grade', '3f_tela', '3f_tela_grade', 'capelinha', 'capelinha_3v', 'arremate'],
            description: 'Modelo do produto. capelinha = Pivotante 1 Vidro (basico). capelinha_3v = Pivotante 3 Vidros (3 divisoes). SEMPRE pergunte ao cliente qual variacao antes de usar capelinha vs capelinha_3v. Use 2f_grade/3f_grade para janelas com grade.'
          },
          width: {
            type: 'number',
            description: 'Largura em centímetros (opcional - sem medidas retorna dimensões disponíveis)'
          },
          height: {
            type: 'number',
            description: 'Altura em centímetros (opcional - sem medidas retorna dimensões disponíveis)'
          },
          glass_type: {
            type: 'string',
            enum: ['incolor', 'mini_boreal', 'fume'],
            description: 'Tipo de vidro (NÃO afeta o preço, apenas para registro)'
          },
          color: {
            type: 'string',
            enum: ['branco', 'preto'],
            description: 'Cor do alumínio (afeta o preço - preto é mais caro)'
          },
          orientation: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
            description: 'Orientação (apenas para capelinha). Auto-detectado se não informado.'
          },
          quantity: {
            type: 'number',
            description: 'Quantidade de janelas (para cálculo de desconto por quantidade)'
          },
          channel: {
            type: 'string',
            enum: ['whatsapp', 'mercadolivre', 'shopify'],
            description: 'Canal de venda'
          }
        },
        required: ['model']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_payment_link',
      description: 'Cria um link de pagamento personalizado na Yampi para o cliente finalizar a compra. Use APENAS quando o cliente CONFIRMAR que quer comprar E escolher a forma de pagamento (pix/cartão/boleto). NÃO use antes da confirmação de compra.',
      parameters: {
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'Nome do produto (ex: "Janela de Correr 2 Folhas Branco 100x40")'
          },
          model: {
            type: 'string',
            enum: ['2f', '2f_grade', '3f', '3f_grade', '3f_tela', '3f_tela_grade', 'capelinha', 'capelinha_3v', 'arremate'],
            description: 'Modelo do produto'
          },
          color: {
            type: 'string',
            enum: ['branco', 'preto'],
            description: 'Cor do alumínio'
          },
          width: {
            type: 'number',
            description: 'Largura em cm'
          },
          height: {
            type: 'number',
            description: 'Altura em cm'
          },
          glass_type: {
            type: 'string',
            enum: ['incolor', 'mini_boreal', 'fume'],
            description: 'Tipo de vidro'
          },
          quantity: {
            type: 'number',
            description: 'Quantidade de janelas'
          },
          customer_name: {
            type: 'string',
            description: 'Nome do cliente'
          },
          customer_phone: {
            type: 'string',
            description: 'Telefone do cliente (WhatsApp)'
          },
          include_kit_acabamento: {
            type: 'boolean',
            description: 'Se inclui Kit Acabamento R$117'
          }
        },
        required: ['product_name', 'model', 'quantity', 'customer_name', 'customer_phone']
      }
    }
  }
]

// Tipos para os resultados das tools
export interface CheckOrderResult {
  found: boolean
  orders?: {
    order_number: string
    status: string
    production_status: string
    tracking_code?: string
    created_at: string
  }[]
  message: string
}

export interface EscalateResult {
  success: boolean
  message: string
}

export interface CalculateShippingResult {
  cep: string
  is_sp: boolean
  delivery_type: 'sp_delivery' | 'carrier' | 'error'
  estimated_days: number
  shipping_cost?: number
  next_delivery_date?: string
  carrier?: string
  is_free?: boolean
  message: string
  // Informações adicionais para fora de SP
  unit_price?: number
  quantity?: number
}

export interface ProductInfoResult {
  available: boolean
  model: string
  dimensions?: {
    width: number
    height: number
  }
  availableSizes?: {
    alturas: number[]
    larguras: number[]
  }
  priceRange?: {
    min: number
    max: number
  }
  price?: number
  priceTotal?: number
  priceFinal?: number
  originalPrice?: number
  discount?: {
    quantityPercent: number
    pixPercent: number
    totalValue: number
  }
  link?: string
  color?: string
  glass?: string
  quantity?: number
  alerts?: string[]
  message: string
}

export interface CreatePaymentLinkResult {
  success: boolean
  payment_url?: string
  whatsapp_url?: string
  message: string
}
