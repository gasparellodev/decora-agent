/**
 * Classificador de intencao do cliente
 *
 * Roda ANTES da chamada principal ao GPT-4o.
 * Usa regras regex primeiro (rapido, 0 custo) e so recorre ao LLM para casos ambiguos.
 *
 * Resultado e persistido em dc_conversations.detected_intent
 * e usado para rotear o estado inicial da maquina de estados.
 */

export type CustomerIntent =
  | 'buy_window'         // Quer comprar
  | 'get_quote'          // Quer um orcamento/preco
  | 'technical_doubt'    // Duvida tecnica sobre produto
  | 'installation_help'  // Precisa de ajuda com instalacao
  | 'order_status'       // Quer saber do pedido
  | 'complaint'          // Reclamacao
  | 'return_exchange'    // Devolucao/troca
  | 'general_question'   // Pergunta geral (FAQ)
  | 'returning_customer' // Cliente retornando
  | 'unknown'            // Nao foi possivel classificar

export interface IntentResult {
  intent: CustomerIntent
  confidence: number  // 0-1
  reason: string
}

// =====================================================
// REGRAS DE CLASSIFICACAO (REGEX - RAPIDO, 0 CUSTO)
// =====================================================

interface IntentRule {
  intent: CustomerIntent
  patterns: RegExp[]
  confidence: number
}

const INTENT_RULES: IntentRule[] = [
  // PEDIDO/ENTREGA - alta prioridade
  {
    intent: 'order_status',
    patterns: [
      /\b(meu pedido|minha encomenda|rastreio|rastrear|codigo de rastreio)\b/i,
      /\b(cad[eê] (meu|minha|o)|onde (t[aá]|est[aá]) (meu|minha|o))\b/i,
      /\b(entrega|entreg(ou|aram)|chegou|vai chegar|quando chega)\b/i,
      /\b(status|acompanhar|acompanhamento)\s*(do|da|de)?\s*(pedido|compra|janela)\b/i,
      /\b(numero|n[uú]mero)\s*(do)?\s*(pedido)\b/i,
    ],
    confidence: 0.9
  },

  // RECLAMACAO
  {
    intent: 'complaint',
    patterns: [
      /\b(reclama[çc][aã]o|reclamar|insatisfeito|absurdo|vergonha)\b/i,
      /\b(defeito|defeituos[ao]|quebr(ou|ado|ada)|riscad[ao]|amassad[ao]|tort[ao])\b/i,
      /\b(errad[ao]|veio errad|mandaram errad|trocad[ao])\b/i,
      /\b(lixo|p[eé]ssim[ao]|hor[rí]vel|n[aã]o funciona|n[aã]o abre|n[aã]o fecha)\b/i,
      /\b(procon|processo|advogado|justi[çc]a|consumidor)\b/i,
    ],
    confidence: 0.9
  },

  // DEVOLUCAO/TROCA
  {
    intent: 'return_exchange',
    patterns: [
      /\b(devolv|devolu[çc][aã]o|devolver)\b/i,
      /\b(troc(ar|a)|trocar por|quero trocar)\b/i,
      /\b(arrepend|cancel(ar|amento)|n[aã]o quero mais)\b/i,
      /\b(reembols|dinheiro de volta|estorn)\b/i,
    ],
    confidence: 0.9
  },

  // INSTALACAO
  {
    intent: 'installation_help',
    patterns: [
      /\b(instal(ar|a[çc][aã]o|ador|ei)|como (instala|coloca|monta))\b/i,
      /\b(esquadro|chumbar|contrama[çr]co|contramarco)\b/i,
      /\b(chapatex|cinta(s)?\s*lateral|remover cinta)\b/i,
      /\b(parafuso|buchas?|como fixar|fixar na parede)\b/i,
      /\b(veda[çc][aã]o|vedante|silicone|espuma)\b/i,
      /\b(como medir|medir o v[aã]o|folga de instala)\b/i,
    ],
    confidence: 0.85
  },

  // DUVIDA TECNICA
  {
    intent: 'technical_doubt',
    patterns: [
      /\b(qual (a )?(diferen[çc]a|melhor)|diferença entre)\b/i,
      /\b(boreal|incolor|fum[eê]|temperado)\s*(ou|x|vs|versus)\s*(boreal|incolor|fum[eê]|temperado)\b/i,
      /\b(serve (pra|para|em)|funciona (pra|para|em)|cabe (no|na))\b/i,
      /\b(drywall|gesso|parede fina|tipo de parede)\b/i,
      /\b(garantia|quanto dura|durabilidade|material|qualidade)\b/i,
      /\b(medida (m[ií]nima|m[aá]xima)|limite|at[eé] quanto)\b/i,
      /\b(pintura eletrost[aá]tica|descasca|desbota|enferruja)\b/i,
    ],
    confidence: 0.85
  },

  // COMPRAR
  {
    intent: 'buy_window',
    patterns: [
      /\b(quero comprar|vou comprar|vou levar|quero pedir|fa[çc]o o pedido)\b/i,
      /\b(fechar|fecha(r)? (o |a )?compra|finalizar|pode mandar)\b/i,
      /\b(me manda o link|link (pra|para|do) comprar|como (eu )?compro)\b/i,
      /\b(vou (de|no) pix|pode ser (pix|cart[aã]o|boleto))\b/i,
    ],
    confidence: 0.9
  },

  // ORCAMENTO/PRECO
  {
    intent: 'get_quote',
    patterns: [
      /\b(quanto (custa|fica|sai|[eé])|qual (o )?(valor|pre[çc]o))\b/i,
      /\b(or[çc]amento|or[çc]ar|me passa(r)? (o )?(valor|pre[çc]o))\b/i,
      /\b(pre[çc]o (da|de|do)|quanto (t[aá]|est[aá]))\b/i,
      /\b(tabela de pre[çc]o|lista de pre[çc]o)\b/i,
      /\b(preciso (de )?(um |uma )?janela|quero (um |uma )?janela)\b/i,
      /\b(tem (janela|esquadria)|voc[eê]s (vendem|fazem|fabricam))\b/i,
    ],
    confidence: 0.85
  },

  // PERGUNTA GERAL
  {
    intent: 'general_question',
    patterns: [
      /\b(hor[aá]rio|funciona(mento)?|abre|fecha|atend(e|em|imento))\b/i,
      /\b(onde fica|endere[çc]o|localiza[çc][aã]o|loja f[ií]sica)\b/i,
      /\b(frete|entrega(m)? (pra|para|em)|enviam (pra|para))\b/i,
      /\b(prazo|demora|quanto tempo|dias [uú]teis)\b/i,
      /\b(parcel(a|am)|pagamento|forma(s)? de pagamento)\b/i,
    ],
    confidence: 0.7
  }
]

// =====================================================
// CLASSIFICACAO
// =====================================================

/**
 * Classifica a intencao do cliente usando regras regex
 * Roda em <1ms, 0 custo de API
 */
export function classifyIntent(
  messageContent: string,
  hasActiveOrders: boolean,
  isReturningCustomer: boolean
): IntentResult {
  // Se e cliente retornando com pedidos ativos, prioriza order_status
  if (hasActiveOrders && isReturningCustomer) {
    // Mas so se a mensagem NAO e claramente sobre compra nova
    const isBuyIntent = INTENT_RULES
      .filter(r => r.intent === 'buy_window' || r.intent === 'get_quote')
      .some(r => r.patterns.some(p => p.test(messageContent)))

    if (!isBuyIntent) {
      // Verifica se menciona pedido
      const isAboutOrder = INTENT_RULES
        .filter(r => r.intent === 'order_status')
        .some(r => r.patterns.some(p => p.test(messageContent)))

      if (isAboutOrder) {
        return {
          intent: 'order_status',
          confidence: 0.95,
          reason: 'Cliente retornando com pedidos ativos + mencionou pedido'
        }
      }
    }
  }

  // Avaliar cada regra
  const matches: IntentResult[] = []

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(messageContent)) {
        matches.push({
          intent: rule.intent,
          confidence: rule.confidence,
          reason: `Pattern match: ${pattern.source.slice(0, 50)}`
        })
        break // Uma match por regra e suficiente
      }
    }
  }

  // Se nao encontrou nenhuma match
  if (matches.length === 0) {
    // Saudacao simples
    if (/^(oi|ola|ol[aá]|bom dia|boa tarde|boa noite|e a[ií]|opa|fala)\b/i.test(messageContent.trim())) {
      return {
        intent: isReturningCustomer ? 'returning_customer' : 'unknown',
        confidence: 0.6,
        reason: 'Saudacao simples'
      }
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      reason: 'Nenhum pattern correspondeu'
    }
  }

  // Retornar a match com maior confianca
  matches.sort((a, b) => b.confidence - a.confidence)
  return matches[0]
}

/**
 * Mapeia intencao para estado inicial da maquina de estados
 */
export function mapIntentToInitialState(intent: CustomerIntent): string {
  const mapping: Record<CustomerIntent, string> = {
    'buy_window': 'identifying_need',
    'get_quote': 'identifying_need',
    'technical_doubt': 'support',
    'installation_help': 'support',
    'order_status': 'post_sale',
    'complaint': 'escalated',
    'return_exchange': 'escalated',
    'general_question': 'support',
    'returning_customer': 'greeting',
    'unknown': 'greeting'
  }
  return mapping[intent] || 'greeting'
}
