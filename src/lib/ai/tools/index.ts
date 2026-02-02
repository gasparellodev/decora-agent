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
      name: 'schedule_followup',
      description: 'Agenda um follow-up automático para entrar em contato com o lead no futuro. Use para lembretes, pós-venda, ou quando o cliente pedir para entrar em contato depois.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['post_delivery', 'installation', 'reactivation', 'review', 'custom'],
            description: 'Tipo do follow-up'
          },
          days_from_now: {
            type: 'number',
            description: 'Quantos dias a partir de hoje para enviar o follow-up'
          },
          message: {
            type: 'string',
            description: 'Mensagem personalizada (opcional, se não informado usa template padrão)'
          }
        },
        required: ['type', 'days_from_now']
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
      description: 'Busca informações e preços de produtos. IMPORTANTE: Preços são fixos por medida e cor. O tipo de vidro NÃO afeta o preço. Para Kit Arremate: preço R$117 (order bump), NÃO disponível no Mercado Livre.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            enum: ['2f', '2f_grade', '3f', '3f_grade', '3f_tela', '3f_tela_grade', 'capelinha', 'capelinha_3v', 'arremate'],
            description: 'Modelo do produto. Use 2f_grade/3f_grade para janelas com grade.'
          },
          width: {
            type: 'number',
            description: 'Largura em centímetros'
          },
          height: {
            type: 'number',
            description: 'Altura em centímetros'
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
            description: 'Canal de venda (descontos aplicam em whatsapp/shopify, não em ML)'
          },
          payment_method: {
            type: 'string',
            enum: ['cartao', 'boleto', 'pix'],
            description: 'Forma de pagamento (Pix tem +5% desconto em whatsapp/shopify)'
          }
        },
        required: ['model']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_info',
      description: 'Atualiza informações do lead como nome, email, CEP, etc. Use quando o cliente fornecer novos dados.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome do cliente'
          },
          email: {
            type: 'string',
            description: 'Email do cliente'
          },
          cep: {
            type: 'string',
            description: 'CEP do cliente'
          },
          cpf: {
            type: 'string',
            description: 'CPF do cliente'
          },
          notes: {
            type: 'string',
            description: 'Observações sobre o cliente'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_measurement',
      description: 'Valida e normaliza medidas informadas pelo cliente. Use SEMPRE que o cliente informar medidas para orçamento. Retorna medida normalizada, se está dentro dos limites, e sugestão de medida padrão.',
      parameters: {
        type: 'object',
        properties: {
          width: {
            type: 'number',
            description: 'Largura em centímetros'
          },
          height: {
            type: 'number',
            description: 'Altura em centímetros'
          },
          cep: {
            type: 'string',
            description: 'CEP do cliente (para validar limite de transporte)'
          },
          wall_type: {
            type: 'string',
            enum: ['alvenaria', 'drywall', 'container'],
            description: 'Tipo de parede (se drywall, valida profundidade)'
          },
          wall_depth: {
            type: 'number',
            description: 'Profundidade da parede em cm (obrigatório para drywall)'
          },
          model: {
            type: 'string',
            enum: ['2f', '2f_grade', '3f', '3f_grade', '3f_tela', '3f_tela_grade', 'capelinha', 'capelinha_3v'],
            description: 'Modelo pretendido (para validar profundidade drywall)'
          }
        },
        required: ['width', 'height']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recommend_product',
      description: 'Recomenda o modelo ideal de janela baseado no ambiente e necessidades do cliente. Use quando o cliente não sabe qual modelo escolher.',
      parameters: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['banheiro', 'cozinha', 'lavanderia', 'sala', 'quarto', 'fachada', 'area_servico'],
            description: 'Ambiente onde a janela será instalada'
          },
          needs: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['ventilacao', 'privacidade', 'seguranca', 'insetos', 'iluminacao', 'estetica']
            },
            description: 'Necessidades específicas do cliente'
          },
          width: {
            type: 'number',
            description: 'Largura disponível do vão em cm'
          },
          height: {
            type: 'number',
            description: 'Altura disponível do vão em cm'
          },
          rain_region: {
            type: 'boolean',
            description: 'Se a região tem muita chuva e vento'
          }
        },
        required: ['environment']
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

export interface ScheduleFollowUpResult {
  success: boolean
  scheduled_for: string
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
  price?: number
  link?: string // Link direto para Shopify com variante pré-selecionada
  message: string
}

export interface UpdateLeadResult {
  success: boolean
  updated_fields: string[]
  message: string
}

export interface ValidateMeasurementResult {
  isValid: boolean
  originalWidth: number
  originalHeight: number
  normalizedWidth: number
  normalizedHeight: number
  nearestStandard: {
    width: number
    height: number
  }
  clearanceNeeded: {
    lateral: number
    top: number
  }
  errors: string[]
  warnings: string[]
  drywallCheck?: {
    isValid: boolean
    minRequired: number
    message: string
  }
  message: string
}

export interface RecommendProductResult {
  recommendedModel: string
  modelName: string
  recommendedGlass: string
  glassName: string
  suggestedSizes: {
    width: number
    height: number
    description: string
  }[]
  features: string[]
  warnings: string[]
  message: string
}
