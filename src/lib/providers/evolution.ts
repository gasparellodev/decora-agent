export interface EvolutionConfig {
  baseUrl: string
  apiKey: string
  instanceName: string
}

export interface SendMessageOptions {
  number: string
  text: string
  delay?: number
}

export interface SendMediaOptions {
  number: string
  mediatype: 'image' | 'video' | 'audio' | 'document'
  media: string // base64 or URL
  caption?: string
  fileName?: string
}

export interface ConnectionState {
  instance: {
    instanceName: string
    state: 'open' | 'close' | 'connecting'
  }
  // Fallback para formato antigo
  state?: 'open' | 'close' | 'connecting'
}

export interface QRCodeResponse {
  pairingCode: string | null
  code: string
  base64: string
  count: number
}

export class EvolutionProvider {
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor(config: EvolutionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.instanceName = config.instanceName
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Evolution API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Instance Management
  async createInstance(name: string = this.instanceName) {
    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: name,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        reject_call: true,
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: false,
        syncFullHistory: false,
      })
    })
  }

  async deleteInstance(name: string = this.instanceName) {
    return this.request(`/instance/delete/${name}`, {
      method: 'DELETE'
    })
  }

  async fetchInstances() {
    return this.request<{ instances: any[] }>('/instance/fetchInstances')
  }

  // Connection
  async connect(name: string = this.instanceName): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(`/instance/connect/${name}`)
  }

  async getConnectionState(name: string = this.instanceName): Promise<ConnectionState> {
    return this.request<ConnectionState>(`/instance/connectionState/${name}`)
  }

  async logout(name: string = this.instanceName) {
    return this.request(`/instance/logout/${name}`, {
      method: 'DELETE'
    })
  }

  async restart(name: string = this.instanceName) {
    return this.request(`/instance/restart/${name}`, {
      method: 'PUT'
    })
  }

  // Presence (typing indicator)
  async sendPresence(
    phone: string, 
    presence: 'composing' | 'recording' | 'paused' | 'available',
    delayMs: number = 1000,
    name: string = this.instanceName
  ) {
    const formattedPhone = this.formatPhone(phone)
    
    return this.request(`/chat/sendPresence/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        presence,
        delay: delayMs
      })
    })
  }

  // Messages
  async sendText(phone: string, text: string, name: string = this.instanceName) {
    // Formatar número (remover caracteres não numéricos e adicionar código do país se necessário)
    const formattedPhone = this.formatPhone(phone)
    
    return this.request(`/message/sendText/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        text: text
      })
    })
  }

  async sendMedia(options: SendMediaOptions, name: string = this.instanceName) {
    const formattedPhone = this.formatPhone(options.number)
    
    return this.request(`/message/sendMedia/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: options.mediatype,
        media: options.media,
        caption: options.caption,
        fileName: options.fileName
      })
    })
  }

  // Get media as base64
  async getMediaBase64(
    messageId: string,
    remoteJid: string,
    name: string = this.instanceName
  ): Promise<{ base64: string; mimetype: string }> {
    return this.request(`/chat/getBase64FromMediaMessage/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        message: {
          key: {
            id: messageId,
            remoteJid: remoteJid
          }
        },
        convertToMp4: false
      })
    })
  }

  async sendButtons(
    phone: string, 
    title: string, 
    description: string, 
    buttons: { buttonId: string; buttonText: { displayText: string } }[],
    name: string = this.instanceName
  ) {
    const formattedPhone = this.formatPhone(phone)
    
    return this.request(`/message/sendButtons/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        title,
        description,
        buttons
      })
    })
  }

  async sendList(
    phone: string,
    title: string,
    description: string,
    buttonText: string,
    sections: { title: string; rows: { title: string; description?: string; rowId: string }[] }[],
    name: string = this.instanceName
  ) {
    const formattedPhone = this.formatPhone(phone)
    
    return this.request(`/message/sendList/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        title,
        description,
        buttonText,
        sections
      })
    })
  }

  // Webhook Configuration
  async setWebhook(url: string, events: string[], name: string = this.instanceName) {
    return this.request(`/webhook/set/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        enabled: true,
        url,
        webhookByEvents: true,
        events
      })
    })
  }

  async getWebhook(name: string = this.instanceName) {
    return this.request(`/webhook/find/${name}`)
  }

  // Utility
  private formatPhone(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '')
    
    // Se não começar com 55 (Brasil), adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    
    return cleaned
  }

  // Check if connected
  async isConnected(name: string = this.instanceName): Promise<boolean> {
    try {
      const state = await this.getConnectionState(name)
      // Suporta tanto o formato novo (instance.state) quanto o antigo (state)
      return state.instance?.state === 'open' || state.state === 'open'
    } catch {
      return false
    }
  }

  // Helper para extrair o estado da conexão (suporta ambos os formatos)
  static extractState(connectionState: ConnectionState): string {
    return connectionState.instance?.state || connectionState.state || 'unknown'
  }
}

// Singleton instance
let evolutionInstance: EvolutionProvider | null = null

export function getEvolutionProvider(): EvolutionProvider {
  if (!evolutionInstance) {
    evolutionInstance = new EvolutionProvider({
      baseUrl: process.env.EVOLUTION_API_URL!,
      apiKey: process.env.EVOLUTION_API_KEY!,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'decora-main'
    })
  }
  return evolutionInstance
}
