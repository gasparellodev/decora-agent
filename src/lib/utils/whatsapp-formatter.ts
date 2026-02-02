/**
 * Formata texto para o padrão nativo do WhatsApp
 * 
 * Converte formatação Markdown para formatação WhatsApp:
 * - **texto** ou __texto__ → *texto* (negrito)
 * - *texto* ou _texto_ → _texto_ (itálico)
 * - ### Header → *Header* (negrito simples)
 * - - item → • item (bullet point)
 * - [texto](url) → texto (url)
 */

export function formatForWhatsApp(text: string): string {
  if (!text) return ''

  return text
    // Headers markdown (###, ##, #) -> negrito WhatsApp
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    
    // Negrito markdown **texto** ou __texto__ -> *texto*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '*$1*')
    
    // Itálico que já está correto (_texto_) - manter
    // Itálico com * simples pode conflitar, então ignoramos
    
    // Bullets markdown "- " no início da linha -> "• "
    .replace(/^-\s+/gm, '• ')
    
    // Sub-bullets markdown "  - " -> "  • "
    .replace(/^(\s+)-\s+/gm, '$1• ')
    
    // Links markdown [texto](url) -> texto (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    
    // Código inline `texto` -> manter como está (WhatsApp suporta ```)
    // Não alteramos blocos de código
    
    // Limpar linhas vazias excessivas (máximo 2 seguidas)
    .replace(/\n{3,}/g, '\n\n')
    
    // Remover espaços em branco no final das linhas
    .replace(/[ \t]+$/gm, '')
    
    .trim()
}

/**
 * Calcula o tempo de digitação humanizado baseado no tamanho da mensagem
 * Simula velocidade de digitação humana mais natural
 */
export function calculateTypingTime(text: string): number {
  const CHARS_PER_SECOND = 5 // Velocidade mais rápida e natural
  const MIN_TYPING_MS = 800   // mínimo 0.8 segundos
  const MAX_TYPING_MS = 4000  // máximo 4 segundos

  const chars = text.length
  const typingMs = (chars / CHARS_PER_SECOND) * 1000

  // Adicionar pequena variação aleatória para parecer mais humano
  const variation = Math.random() * 500 - 250 // ±250ms
  const finalTime = typingMs + variation

  return Math.min(MAX_TYPING_MS, Math.max(MIN_TYPING_MS, finalTime))
}

/**
 * Adiciona delay para simular digitação humana
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Delay entre mensagens sequenciais para parecer mais natural
 */
export function getDelayBetweenMessages(): number {
  const MIN_DELAY = 600
  const MAX_DELAY = 1200
  return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY)
}

/**
 * Divide mensagens longas em partes menores para envio sequencial
 * Respeita parágrafos e sentenças para não cortar no meio
 */
export function splitLongMessage(text: string, maxChars: number = 350): string[] {
  // Se a mensagem já é curta, retornar como está
  if (text.length <= maxChars) return [text]

  const messages: string[] = []
  
  // Primeiro tenta dividir por parágrafos (dupla quebra de linha)
  const paragraphs = text.split(/\n\n+/)
  
  let currentMessage = ''
  
  for (const paragraph of paragraphs) {
    // Se o parágrafo sozinho é muito grande, dividir por sentenças
    if (paragraph.length > maxChars) {
      // Salva mensagem atual se houver
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim())
        currentMessage = ''
      }
      
      // Divide por sentenças (ponto final, exclamação, interrogação)
      const sentences = paragraph.split(/(?<=[.!?])\s+/)
      
      for (const sentence of sentences) {
        if ((currentMessage + ' ' + sentence).trim().length <= maxChars) {
          currentMessage = (currentMessage + ' ' + sentence).trim()
        } else {
          if (currentMessage.trim()) {
            messages.push(currentMessage.trim())
          }
          currentMessage = sentence
        }
      }
    } else {
      // Parágrafo cabe em uma mensagem
      const combined = currentMessage 
        ? currentMessage + '\n\n' + paragraph 
        : paragraph
      
      if (combined.length <= maxChars) {
        currentMessage = combined
      } else {
        // Não cabe, salva atual e começa nova
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim())
        }
        currentMessage = paragraph
      }
    }
  }
  
  // Adiciona última mensagem se houver
  if (currentMessage.trim()) {
    messages.push(currentMessage.trim())
  }
  
  // Se não conseguiu dividir bem, faz divisão simples por caracteres
  if (messages.length === 0 || messages.some(m => m.length > maxChars * 1.2)) {
    return splitByChars(text, maxChars)
  }
  
  return messages
}

/**
 * Divisão simples por caracteres quando a divisão inteligente falha
 */
function splitByChars(text: string, maxChars: number): string[] {
  const messages: string[] = []
  let remaining = text
  
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      messages.push(remaining.trim())
      break
    }
    
    // Encontra um ponto de quebra (espaço, pontuação)
    let breakPoint = maxChars
    
    // Procura por espaço ou pontuação antes do limite
    for (let i = maxChars; i > maxChars * 0.7; i--) {
      if ([' ', '.', '!', '?', ',', ';', '\n'].includes(remaining[i])) {
        breakPoint = i + 1
        break
      }
    }
    
    messages.push(remaining.substring(0, breakPoint).trim())
    remaining = remaining.substring(breakPoint).trim()
  }
  
  return messages
}
