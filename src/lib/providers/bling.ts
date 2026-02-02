import { createAdminClient } from '@/lib/supabase/admin'

interface BlingTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

export class BlingProvider {
  private baseUrl = 'https://api.bling.com.br/Api/v3'
  private oauthUrl = 'https://www.bling.com.br/Api/v3/oauth'

  private getSupabase() {
    return createAdminClient()
  }

  // OAuth - Gerar URL de autorização
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.BLING_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/bling/callback`,
      state
    })
    return `${this.oauthUrl}/authorize?${params}`
  }

  // OAuth - Trocar code por tokens
  async exchangeCode(code: string): Promise<BlingTokens> {
    const credentials = Buffer.from(
      `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
    ).toString('base64')

    const response = await fetch(`${this.oauthUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bling OAuth Error: ${error}`)
    }

    const data = await response.json()
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    }
  }

  // OAuth - Refresh token
  async refreshTokens(refreshToken: string): Promise<BlingTokens> {
    const credentials = Buffer.from(
      `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
    ).toString('base64')

    const response = await fetch(`${this.oauthUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      throw new Error('Failed to refresh Bling token')
    }

    const data = await response.json()
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    }
  }

  // Obter token válido (refresh se necessário)
  async getValidToken(): Promise<string | null> {
    const supabase = this.getSupabase()
    
    const { data: integration } = await supabase
      .from('dc_integrations')
      .select('*')
      .eq('provider', 'bling')
      .single()

    if (!integration?.access_token) {
      return null
    }

    // Verificar se o token expirou
    if (integration.expires_at && new Date(integration.expires_at) <= new Date()) {
      if (!integration.refresh_token) {
        return null
      }

      try {
        const tokens = await this.refreshTokens(integration.refresh_token)
        
        await supabase
          .from('dc_integrations')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at
          })
          .eq('provider', 'bling')

        return tokens.access_token
      } catch {
        return null
      }
    }

    return integration.access_token
  }

  // Request genérico
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getValidToken()
    if (!token) {
      throw new Error('No valid Bling token available')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bling API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Pedidos
  async getPedidos(params?: {
    dataInicial?: string
    dataFinal?: string
    situacao?: number
    limite?: number
    pagina?: number
  }) {
    const query = new URLSearchParams()
    if (params?.dataInicial) query.append('dataInicial', params.dataInicial)
    if (params?.dataFinal) query.append('dataFinal', params.dataFinal)
    if (params?.situacao) query.append('situacao', params.situacao.toString())
    if (params?.limite) query.append('limite', params.limite.toString())
    if (params?.pagina) query.append('pagina', params.pagina.toString())

    return this.request<{ data: any[] }>(`/pedidos/vendas?${query}`)
  }

  async getPedido(id: string) {
    return this.request<{ data: any }>(`/pedidos/vendas/${id}`)
  }

  // Contatos
  async getContatos(params?: {
    nome?: string
    cpfCnpj?: string
    email?: string
    telefone?: string
    limite?: number
    pagina?: number
  }) {
    const query = new URLSearchParams()
    if (params?.nome) query.append('nome', params.nome)
    if (params?.cpfCnpj) query.append('cpfCnpj', params.cpfCnpj)
    if (params?.email) query.append('email', params.email)
    if (params?.telefone) query.append('telefone', params.telefone)
    if (params?.limite) query.append('limite', params.limite.toString())
    if (params?.pagina) query.append('pagina', params.pagina.toString())

    return this.request<{ data: any[] }>(`/contatos?${query}`)
  }

  async getContato(id: string) {
    return this.request<{ data: any }>(`/contatos/${id}`)
  }

  // Produtos
  async getProdutos(params?: {
    nome?: string
    codigo?: string
    limite?: number
    pagina?: number
  }) {
    const query = new URLSearchParams()
    if (params?.nome) query.append('nome', params.nome)
    if (params?.codigo) query.append('codigo', params.codigo)
    if (params?.limite) query.append('limite', params.limite.toString())
    if (params?.pagina) query.append('pagina', params.pagina.toString())

    return this.request<{ data: any[] }>(`/produtos?${query}`)
  }

  // Notas Fiscais
  async getNotasFiscais(params?: {
    dataInicial?: string
    dataFinal?: string
    situacao?: number
    limite?: number
    pagina?: number
  }) {
    const query = new URLSearchParams()
    if (params?.dataInicial) query.append('dataInicial', params.dataInicial)
    if (params?.dataFinal) query.append('dataFinal', params.dataFinal)
    if (params?.situacao) query.append('situacao', params.situacao.toString())
    if (params?.limite) query.append('limite', params.limite.toString())
    if (params?.pagina) query.append('pagina', params.pagina.toString())

    return this.request<{ data: any[] }>(`/nfe?${query}`)
  }
}

// Singleton
let blingInstance: BlingProvider | null = null

export function getBlingProvider(): BlingProvider {
  if (!blingInstance) {
    blingInstance = new BlingProvider()
  }
  return blingInstance
}
