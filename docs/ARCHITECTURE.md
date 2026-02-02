# Arquitetura Decora Agent

Documentação técnica completa do sistema de atendimento automatizado via WhatsApp.

## 1. Visão Geral

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14 (App Router) |
| Backend | Next.js API Routes |
| Banco de Dados | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| WhatsApp | Evolution API |
| IA | OpenAI GPT-4o + Whisper |

### Diagrama de Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cliente       │     │   Evolution API  │     │   Shopify/      │
│   WhatsApp      │────▶│   (WhatsApp)     │     │   Yampi         │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                    ┌────────────────────────────────────────────────┐
                    │              Next.js Application               │
                    │  ┌──────────────────────────────────────────┐  │
                    │  │            Webhooks Layer                │  │
                    │  │  /api/webhooks/evolution                 │  │
                    │  │  /api/webhooks/shopify                   │  │
                    │  │  /api/webhooks/yampi                     │  │
                    │  └──────────────────┬───────────────────────┘  │
                    │                     │                          │
                    │  ┌──────────────────▼───────────────────────┐  │
                    │  │            Services Layer                │  │
                    │  │  • message-buffer.service.ts             │  │
                    │  │  • agent.service.ts                      │  │
                    │  │  • media-processor.service.ts            │  │
                    │  └──────────────────┬───────────────────────┘  │
                    │                     │                          │
                    │  ┌──────────────────▼───────────────────────┐  │
                    │  │              AI Layer                    │  │
                    │  │  • prompts/sales-agent.ts                │  │
                    │  │  • tools/executors.ts                    │  │
                    │  │  • OpenAI GPT-4o / Whisper               │  │
                    │  └──────────────────────────────────────────┘  │
                    └────────────────────┬───────────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │      Supabase       │
                              │  • dc_leads         │
                              │  • dc_conversations │
                              │  • dc_messages      │
                              │  • dc_orders        │
                              └─────────────────────┘
```

## 2. Fluxo de Mensagens

### 2.1 Recebimento (Inbound)

```
1. Cliente envia mensagem no WhatsApp
   │
2. Evolution API recebe e envia webhook
   │ POST /api/webhooks/evolution
   │
3. Webhook processa:
   │ ├─ Extrai telefone, nome, conteúdo
   │ ├─ Detecta mídia (imagem/áudio/documento)
   │ ├─ Detecta links externos (Shopify, Yampi)
   │ ├─ upsertLead() - cria/atualiza lead
   │ └─ getOrCreateConversation()
   │
4. Salva mensagem no banco (dc_messages)
   │
5. Adiciona ao buffer de mensagens
   │ bufferMessage() - aguarda 3s por mais mensagens
   │
6. Após timeout do buffer:
   │ ├─ Combina mensagens em uma só
   │ └─ Chama processMessage()
   │
7. Processamento com IA:
   │ ├─ Busca histórico (últimas 20 msgs)
   │ ├─ Busca histórico do lead
   │ ├─ Monta prompt com contexto
   │ ├─ Chama GPT-4o com tools
   │ └─ Executa tools se necessário
   │
8. Resposta formatada para WhatsApp
```

### 2.2 Envio (Outbound)

```
1. IA gera resposta
   │
2. formatForWhatsApp() - converte Markdown
   │ ├─ **texto** → *texto*
   │ ├─ ### Header → *Header*
   │ └─ - item → • item
   │
3. Typing indicator humanizado
   │ ├─ sendPresence('composing')
   │ └─ sleep(calculado por tamanho)
   │
4. Envio via Evolution API
   │ evolution.sendText()
   │
5. Salva resposta no banco (dc_messages)
```

## 3. Identificação de Leads

### 3.1 Por Telefone

O telefone é o identificador único do lead. O sistema:

1. Recebe número via webhook (remoteJid)
2. Remove `@s.whatsapp.net`
3. Remove caracteres não numéricos
4. Adiciona código do país (55) se necessário
5. Executa `upsertLead()` - cria ou atualiza

```typescript
// Formatação do telefone
const cleanPhone = phone.replace(/\D/g, '')
// 11999999999 → 5511999999999
```

### 3.2 Histórico do Lead

A função `getLeadHistory()` busca:

- Número de conversas anteriores
- Se é cliente retornando
- Pedidos em produção
- Se teve escalações anteriores

Isso é passado para a IA contextualizar a resposta.

## 4. Buffer de Mensagens

### Problema

Quando cliente envia várias mensagens seguidas:
```
Cliente: "Olá"
Cliente: "Preciso de um orçamento"  
Cliente: "Para uma janela 2 folhas"
```

Sem buffer, o agente responderia 3 vezes.

### Solução

O `message-buffer.service.ts` implementa debounce:

1. Recebe mensagem → inicia timer de 3s
2. Nova mensagem → reseta timer
3. Timer expira → processa todas juntas

```
Msg 1 → [Timer 3s]
Msg 2 → [Reset timer]
Msg 3 → [Reset timer]
        [3s sem nova msg]
        → Processa: "Olá\n\nPreciso de um orçamento\n\nPara uma janela 2 folhas"
```

### Configurações

- `BUFFER_TIMEOUT_MS`: 3000 (3 segundos)
- `MAX_BUFFER_SIZE`: 10 mensagens
- `MAX_BUFFER_AGE_MS`: 30000 (30 segundos máximo)

## 5. Processamento de Mídia

### 5.1 Imagens (GPT-4o Vision)

```typescript
// 1. Baixa imagem em base64
const media = await evolution.getMediaBase64(messageId, remoteJid)

// 2. Envia para GPT-4o Vision
const description = await processImage(media.base64, media.mimetype)

// 3. Adiciona ao contexto
content = `[📷 Imagem enviada: ${description}]`
```

### 5.2 Áudios (Whisper API)

```typescript
// 1. Baixa áudio em base64
const media = await evolution.getMediaBase64(messageId, remoteJid)

// 2. Transcreve com Whisper
const transcription = await transcribeAudio(media.base64, media.mimetype)

// 3. Adiciona ao contexto
content = `[🎤 Áudio transcrito]: "${transcription}"`
```

### 5.3 Documentos (PDF)

```typescript
// PDFs: extrai texto com pdf-parse
// Outros: apenas nome do arquivo
const docContent = await processDocument(media.base64, media.mimetype, fileName)
```

## 6. Integrações

### 6.1 Shopify

**Webhooks recebidos:**
- `orders/create` - Cria lead, pedido, envia confirmação
- `orders/paid` - Atualiza status
- `orders/fulfilled` - Notifica com tracking

**Fluxo:**
```
Shopify Order → Webhook → upsertLead(phone) → Criar pedido → Enviar WhatsApp
```

### 6.2 Yampi

Similar ao Shopify, com webhooks para:
- Pedidos criados
- Carrinho abandonado

### 6.3 Melhor Envio

Recebe atualizações de rastreamento e notifica cliente.

## 7. Banco de Dados

### Schema Principal

```sql
-- Leads/Clientes
dc_leads (
  id UUID PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,  -- Identificador principal
  name VARCHAR(255),
  email VARCHAR(255),
  cep VARCHAR(9),
  stage dc_lead_stage,  -- novo, qualificando, orcamento, comprou, producao, entregue
  source VARCHAR(50),   -- whatsapp, shopify, yampi
  last_message_at TIMESTAMPTZ
)

-- Conversas
dc_conversations (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES dc_leads,
  status dc_conversation_status,  -- active, waiting_human, closed
  channel VARCHAR(20)  -- whatsapp
)

-- Mensagens
dc_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES dc_conversations,
  lead_id UUID REFERENCES dc_leads,
  direction dc_message_direction,  -- inbound, outbound
  sender_type dc_sender_type,      -- lead, agent, human, system
  content TEXT,
  media_type VARCHAR(20),
  ai_tokens_used INTEGER
)

-- Pedidos
dc_orders (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES dc_leads,
  external_id VARCHAR(100),
  source VARCHAR(20),  -- shopify, yampi, manual
  order_number VARCHAR(50),
  status VARCHAR(30),
  production_status VARCHAR(30),
  tracking_code VARCHAR(100)
)
```

## 8. Formatação WhatsApp

### Conversão Markdown → WhatsApp

| Markdown | WhatsApp |
|----------|----------|
| `**texto**` | `*texto*` |
| `### Título` | `*Título*` |
| `- item` | `• item` |
| `[link](url)` | `link (url)` |

### Typing Indicator

Simula digitação humana:
- Velocidade: ~3.5 caracteres/segundo
- Mínimo: 1.5 segundos
- Máximo: 8 segundos

```typescript
function calculateTypingTime(text: string): number {
  const chars = text.length
  const typingMs = (chars / 3.5) * 1000
  return Math.min(8000, Math.max(1500, typingMs))
}
```

## 9. Detecção de Links

O sistema detecta automaticamente:

- Links Shopify (`*.myshopify.com`, `shopify.com/orders`)
- Links Yampi (`*.yampi.com.br`)
- Códigos de rastreio (`XX123456789XX`)
- Links de rastreamento

Quando detectado, adiciona contexto para a IA:
```
[Link de pedido Shopify detectado: #12345]
```

## 10. Troubleshooting

### Webhook não recebe mensagens

1. Verificar se Evolution API está conectada
2. Verificar URL do webhook configurada
3. Verificar logs: `console.log('Evolution webhook received...')`

### QR Code não aparece

1. Verificar conexão com Evolution API
2. Verificar se instância existe
3. Chamar `/api/whatsapp/connect`

### IA não responde

1. Verificar `agent_enabled` no banco
2. Verificar `OPENAI_API_KEY`
3. Verificar se conversa não está `waiting_human`

### Mídia não processa

1. Verificar se `getMediaBase64` está funcionando
2. Verificar tamanho do arquivo
3. Verificar mimetype suportado

## 11. Arquivos Principais

| Arquivo | Função |
|---------|--------|
| `src/app/api/webhooks/evolution/route.ts` | Recebe mensagens WhatsApp |
| `src/lib/services/agent.service.ts` | Processa com IA |
| `src/lib/services/message-buffer.service.ts` | Buffer de mensagens |
| `src/lib/services/media-processor.service.ts` | Processa mídia |
| `src/lib/ai/prompts/sales-agent.ts` | Prompt da Ana |
| `src/lib/ai/tools/executors.ts` | Executa ações |
| `src/lib/providers/evolution.ts` | Cliente Evolution API |
| `src/lib/utils/whatsapp-formatter.ts` | Formata para WhatsApp |
| `src/lib/utils/link-detector.ts` | Detecta links externos |
