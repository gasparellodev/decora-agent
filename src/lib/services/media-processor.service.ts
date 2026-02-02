import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Processa uma imagem usando GPT-4o Vision
 * Analisa a imagem no contexto de vendas de janelas
 */
export async function processImage(
  base64: string, 
  mimetype: string,
  caption?: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Você é uma assistente de vendas de janelas de alumínio. 
Analise esta imagem enviada pelo cliente e descreva brevemente:
- O que você vê na imagem
- Se é uma foto de janela, vão, ambiente ou medida
- Informações relevantes para um orçamento
${caption ? `\nLegenda enviada pelo cliente: "${caption}"` : ''}

Seja breve e objetivo (máximo 2-3 frases curtas).`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimetype};base64,${base64}`,
                detail: 'low' // Economiza tokens
              }
            }
          ]
        }
      ]
    })

    return response.choices[0]?.message?.content || 'Não foi possível analisar a imagem.'
  } catch (error) {
    console.error('Error processing image with Vision:', error)
    return 'Imagem recebida (erro ao processar)'
  }
}

/**
 * Transcreve um áudio usando Whisper API
 */
export async function transcribeAudio(
  base64: string,
  mimetype: string
): Promise<string> {
  try {
    // Converter base64 para Buffer
    const buffer = Buffer.from(base64, 'base64')
    
    // Criar um File-like object para a API
    const blob = new Blob([buffer], { type: mimetype })
    
    // Determinar extensão baseada no mimetype
    const extension = mimetype.includes('ogg') ? 'ogg' 
      : mimetype.includes('mp3') ? 'mp3'
      : mimetype.includes('mp4') ? 'mp4'
      : mimetype.includes('wav') ? 'wav'
      : mimetype.includes('webm') ? 'webm'
      : 'ogg'
    
    const file = new File([blob], `audio.${extension}`, { type: mimetype })

    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
      response_format: 'text'
    })

    return response || 'Não foi possível transcrever o áudio.'
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return 'Áudio recebido (erro ao transcrever)'
  }
}

/**
 * Extrai texto de um PDF
 * Usa uma abordagem simples - requer pdf-parse instalado
 */
export async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    // Importação dinâmica para evitar erro se pdf-parse não estiver instalado
    let pdfParse: ((buffer: Buffer) => Promise<{ text?: string }>) | null = null
    
    try {
      // @ts-expect-error - dynamic import
      pdfParse = (await import('pdf-parse')).default
    } catch {
      // pdf-parse não está instalado
      console.log('[PDF] pdf-parse not installed, skipping text extraction')
      return 'Documento PDF recebido'
    }
    
    if (!pdfParse) {
      return 'Documento PDF recebido'
    }
    
    const buffer = Buffer.from(base64, 'base64')
    const data = await pdfParse(buffer)
    
    // Limitar texto extraído
    const maxChars = 2000
    const text = data.text?.substring(0, maxChars) || ''
    
    return text || 'Documento vazio ou não foi possível extrair texto.'
  } catch (error) {
    console.error('[PDF] Error extracting text:', error)
    return 'Documento PDF recebido'
  }
}

/**
 * Processa um documento (PDF ou outros tipos)
 */
export async function processDocument(
  base64: string,
  mimetype: string,
  fileName?: string
): Promise<string> {
  try {
    if (mimetype === 'application/pdf') {
      const text = await extractTextFromPDF(base64)
      if (text && text.length > 50) {
        return `📄 *Documento PDF* (${fileName || 'arquivo'}):\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`
      }
      return `📄 Documento PDF recebido: ${fileName || 'arquivo'}`
    }
    
    // Para outros tipos de documento, apenas informar
    return `📎 Documento recebido: ${fileName || 'arquivo'} (${mimetype})`
  } catch (error) {
    console.error('Error processing document:', error)
    return `📎 Documento recebido: ${fileName || 'arquivo'}`
  }
}

/**
 * Tipo de mídia detectado
 */
export type MediaType = 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'unknown'

/**
 * Resultado do processamento de mídia
 */
export interface MediaProcessingResult {
  type: MediaType
  content: string
  originalCaption?: string
  processed: boolean
  error?: string
}

/**
 * Processa mídia de forma genérica baseada no tipo
 */
export async function processMedia(
  type: MediaType,
  base64: string,
  mimetype: string,
  options?: {
    caption?: string
    fileName?: string
  }
): Promise<MediaProcessingResult> {
  try {
    switch (type) {
      case 'image':
        const imageDescription = await processImage(base64, mimetype, options?.caption)
        return {
          type: 'image',
          content: options?.caption 
            ? `${options.caption}\n\n[📷 Imagem: ${imageDescription}]`
            : `[📷 Imagem enviada: ${imageDescription}]`,
          originalCaption: options?.caption,
          processed: true
        }

      case 'audio':
        const transcription = await transcribeAudio(base64, mimetype)
        return {
          type: 'audio',
          content: `[🎤 Áudio transcrito]: "${transcription}"`,
          processed: true
        }

      case 'document':
        const docContent = await processDocument(base64, mimetype, options?.fileName)
        return {
          type: 'document',
          content: docContent,
          processed: true
        }

      case 'video':
        return {
          type: 'video',
          content: options?.caption 
            ? `${options.caption}\n\n[🎬 Vídeo recebido]`
            : '[🎬 Vídeo recebido]',
          originalCaption: options?.caption,
          processed: false // Não processamos vídeos ainda
        }

      case 'sticker':
        return {
          type: 'sticker',
          content: '[😊 Sticker recebido]',
          processed: false
        }

      default:
        return {
          type: 'unknown',
          content: '[📎 Arquivo recebido]',
          processed: false
        }
    }
  } catch (error) {
    console.error(`Error processing ${type}:`, error)
    return {
      type,
      content: `[${type} recebido - erro ao processar]`,
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
