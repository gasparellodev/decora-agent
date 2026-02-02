/**
 * Formatador para mensagens do Mercado Livre
 * Aplica regras específicas: sem emojis, sem markdown, máximo 350 caracteres
 */

/**
 * Remove emojis de uma string
 */
function removeEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]/gu, '')
}

/**
 * Remove formatação markdown
 */
function removeMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **negrito**
    .replace(/\*(.*?)\*/g, '$1')       // *italico*
    .replace(/_(.*?)_/g, '$1')         // _italico_
    .replace(/`(.*?)`/g, '$1')         // `codigo`
    .replace(/^[-*+]\s+/gm, '')        // listas com -, *, +
    .replace(/^\d+\.\s+/gm, '')        // listas numeradas
    .replace(/^#+\s+/gm, '')           // headers #
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links [texto](url)
}

/**
 * Trunca texto em uma frase completa, respeitando limite de caracteres
 */
function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  
  const truncated = text.slice(0, maxLength)
  
  // Tentar encontrar fim de frase
  const lastPeriod = truncated.lastIndexOf('.')
  const lastQuestion = truncated.lastIndexOf('?')
  const lastExclaim = truncated.lastIndexOf('!')
  
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclaim)
  
  // Se encontrou fim de frase e não está muito no início
  if (lastSentenceEnd > maxLength * 0.5) {
    return text.slice(0, lastSentenceEnd + 1)
  }
  
  // Se não encontrar fim de frase, trunca na última palavra
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...'
  }
  
  // Último recurso: trunca direto
  return truncated.slice(0, maxLength - 3) + '...'
}

/**
 * Normaliza espaços e quebras de linha
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')  // Máximo 2 quebras de linha
    .replace(/\s{2,}/g, ' ')     // Máximo 1 espaço
    .replace(/^\s+|\s+$/gm, '')  // Trim linhas
    .trim()
}

/**
 * Formata texto para o Mercado Livre
 * - Remove emojis
 * - Remove markdown
 * - Normaliza espaços
 * - Limita a 350 caracteres
 */
export function formatForML(text: string): string {
  let formatted = text
  
  // 1. Remove emojis
  formatted = removeEmojis(formatted)
  
  // 2. Remove markdown
  formatted = removeMarkdown(formatted)
  
  // 3. Normaliza espaços e quebras de linha
  formatted = normalizeWhitespace(formatted)
  
  // 4. Trunca em 350 caracteres (limite do ML)
  formatted = truncateAtSentence(formatted, 350)
  
  return formatted
}

/**
 * Verifica se texto está dentro do limite do ML
 */
export function isWithinMLLimit(text: string): boolean {
  return formatForML(text).length <= 350
}

/**
 * Retorna quantos caracteres restam após formatação
 */
export function remainingMLChars(text: string): number {
  return 350 - formatForML(text).length
}

/**
 * Divide texto em múltiplas mensagens se necessário
 * (para casos onde não é possível resumir)
 */
export function splitForML(text: string, maxMessages: number = 3): string[] {
  const formatted = formatForML(text)
  
  if (formatted.length <= 350) {
    return [formatted]
  }
  
  const messages: string[] = []
  let remaining = formatted
  
  while (remaining.length > 0 && messages.length < maxMessages) {
    const chunk = truncateAtSentence(remaining, 350)
    messages.push(chunk)
    remaining = remaining.slice(chunk.length).trim()
  }
  
  return messages
}
