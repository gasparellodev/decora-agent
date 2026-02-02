# Guia do Usuário - Decora Agent

> Sistema de Atendimento Inteligente para WhatsApp

---

## Índice

1. [Introdução](#1-introdução)
2. [Configuração Inicial](#2-configuração-inicial)
3. [Primeiro Acesso](#3-primeiro-acesso)
4. [Módulos do Sistema](#4-módulos-do-sistema)
   - [4.1 Dashboard](#41-dashboard)
   - [4.2 Conversas](#42-conversas)
   - [4.3 Leads](#43-leads)
   - [4.4 Pedidos](#44-pedidos)
   - [4.5 Follow-ups](#45-follow-ups)
   - [4.6 Templates](#46-templates)
   - [4.7 Base de Conhecimento](#47-base-de-conhecimento)
   - [4.8 Métricas](#48-métricas)
   - [4.9 Integrações](#49-integrações)
   - [4.10 Configurações](#410-configurações)
5. [Agente de IA](#5-agente-de-ia)
6. [Administração](#6-administração)
7. [Automações](#7-automações)
8. [Troubleshooting](#8-troubleshooting)
9. [Dicas e Boas Práticas](#9-dicas-e-boas-práticas)

---

## 1. Introdução

### O que é o Decora Agent?

O **Decora Agent** é um sistema completo de atendimento automatizado para WhatsApp, desenvolvido especificamente para a Decora Esquadrias. Ele utiliza inteligência artificial (GPT-4o) para atender clientes de forma natural e eficiente, 24 horas por dia.

### Principais Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Atendimento Automático** | Agente de IA responde mensagens automaticamente |
| **Gestão de Leads** | Capture e acompanhe todos os contatos |
| **Conversas em Tempo Real** | Visualize e participe das conversas |
| **Pedidos Integrados** | Receba pedidos de Shopify, Yampi e Bling |
| **Follow-ups Automáticos** | Envie mensagens de acompanhamento |
| **Métricas e Analytics** | Acompanhe performance e custos |
| **Base de Conhecimento** | Treine o agente com informações da empresa |

### Arquitetura Simplificada

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    WhatsApp     │────▶│  Evolution API   │────▶│  Decora Agent   │
│   (Clientes)    │◀────│    (Webhook)     │◀────│   (Next.js)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │     OpenAI       │◀─────────────┤
                        │    (GPT-4o)      │              │
                        └──────────────────┘              │
                                                          │
                        ┌──────────────────┐              │
                        │    Supabase      │◀─────────────┘
                        │  (Banco + Auth)  │
                        └──────────────────┘
```

---

## 2. Configuração Inicial

### 2.1 Pré-requisitos

Antes de começar, você precisa ter:

- **Node.js** versão 18 ou superior
- **NPM** ou **Yarn**
- **Docker** e **Docker Compose** (para Evolution API)
- Conta no **Supabase** (gratuita)
- Chave de API da **OpenAI**
- Servidor para hospedar a Evolution API (VPS ou similar)

### 2.2 Instalação

1. **Clone o repositório** e instale as dependências:

```bash
cd decora-agent
npm install
```

2. **Copie o arquivo de ambiente**:

```bash
cp .env.example .env.local
```

3. **Configure as variáveis de ambiente** (veja seção 2.3)

4. **Execute o projeto**:

```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

### 2.3 Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais:

#### Supabase (Obrigatório)

```env
# Obtenha em: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
```

**Como obter:**
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie um novo projeto ou selecione existente
3. Vá em **Settings > API**
4. Copie a **URL**, **anon key** e **service_role key**

#### Evolution API (WhatsApp)

```env
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=sua-api-key-aqui
EVOLUTION_INSTANCE_NAME=decora-main
```

**Como configurar:**
Veja a seção [2.5 Instalação da Evolution API](#25-instalação-da-evolution-api)

#### OpenAI

```env
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxx
```

**Como obter:**
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Vá em **API Keys**
3. Clique em **Create new secret key**
4. Copie a chave gerada

#### Integrações (Opcional)

```env
# Bling ERP
BLING_CLIENT_ID=
BLING_CLIENT_SECRET=

# Shopify
SHOPIFY_WEBHOOK_SECRET=

# Yampi
YAMPI_ALIAS=sua-loja
YAMPI_TOKEN=
YAMPI_WEBHOOK_SECRET=

# Melhor Envio
MELHOR_ENVIO_TOKEN=
MELHOR_ENVIO_SECRET=
```

#### Aplicação

```env
NEXT_PUBLIC_APP_URL=https://seudominio.com
CRON_SECRET=gere-uma-string-aleatoria-segura
```

### 2.4 Configuração do Supabase

1. **Acesse o SQL Editor** no painel do Supabase

2. **Execute as migrations** na ordem:

**Migration 1 - Schema Inicial** (`001_initial_schema.sql`):
- Cria todas as tabelas principais
- Configura Row Level Security (RLS)
- Cria índices e triggers

**Migration 2 - Templates e Conhecimento** (`002_templates_users_knowledge.sql`):
- Cria tabelas de templates
- Cria tabela de base de conhecimento
- Cria tabela de perfis de usuário

3. **Verifique as tabelas criadas**:

| Tabela | Descrição |
|--------|-----------|
| `dc_leads` | Leads/contatos |
| `dc_conversations` | Conversas |
| `dc_messages` | Mensagens |
| `dc_orders` | Pedidos |
| `dc_follow_ups` | Follow-ups agendados |
| `dc_integrations` | Configurações de integrações |
| `dc_agent_metrics` | Métricas diárias |
| `dc_agent_settings` | Configurações do agente |
| `dc_message_templates` | Templates de mensagens |
| `dc_knowledge_base` | Base de conhecimento |
| `dc_profiles` | Perfis de usuário |
| `dc_whatsapp_connections` | Conexões WhatsApp |

### 2.5 Instalação da Evolution API

A Evolution API é responsável pela comunicação com o WhatsApp.

1. **Em um servidor VPS**, crie o arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://evolution.seudominio.com
      - AUTHENTICATION_API_KEY=sua-api-key-segura
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/db
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=https://seuapp.com/api/webhooks/evolution
    volumes:
      - evolution_instances:/evolution/instances
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  evolution_instances:
```

2. **Inicie os containers**:

```bash
docker-compose up -d
```

3. **Configure DNS** para apontar `evolution.seudominio.com` para seu servidor

4. **Configure HTTPS** (recomendado usar Nginx + Let's Encrypt)

### 2.6 Deploy em Produção

#### Opção 1: Vercel (Recomendado)

1. Faça push do código para GitHub
2. Conecte o repositório na [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy automático

#### Opção 2: VPS com PM2

1. Clone o repositório no servidor
2. Instale dependências: `npm install`
3. Build: `npm run build`
4. Inicie com PM2:

```bash
pm2 start ecosystem.config.js
```

---

## 3. Primeiro Acesso

### 3.1 Criar Primeiro Usuário

1. **Acesse o Supabase Dashboard**
2. Vá em **Authentication > Users**
3. Clique em **Add user > Create new user**
4. Preencha email e senha
5. Marque **Auto Confirm User**

6. **Crie o perfil no banco de dados**:

```sql
INSERT INTO dc_profiles (id, full_name, role, is_active)
VALUES (
  'uuid-do-usuario-criado',
  'Nome do Admin',
  'admin',
  true
);
```

### 3.2 Tela de Login

Acesse `https://seudominio.com/login`:

1. Digite seu **email**
2. Digite sua **senha**
3. Clique em **Entrar**

Após login, você será redirecionado para o Dashboard.

### 3.3 Tour Inicial

Ao entrar pela primeira vez, você verá:

- **Sidebar** à esquerda com menu de navegação
- **Header** no topo com notificações e perfil
- **Dashboard** principal com métricas e ações rápidas

#### Navegação Principal (Sidebar)

| Menu | Descrição |
|------|-----------|
| Dashboard | Visão geral e métricas |
| Conversas | Chat com clientes |
| Leads | Gestão de contatos |
| Pedidos | Pedidos de todas as fontes |
| Follow-ups | Acompanhamentos agendados |
| Templates | Modelos de mensagem |
| Conhecimento | Base de conhecimento da IA |
| Métricas | Analytics detalhado |
| Integrações | Configurar e-commerces |
| Configurações | WhatsApp e agente |

---

## 4. Módulos do Sistema

### 4.1 Dashboard

O Dashboard é a página inicial do sistema, mostrando uma visão geral do negócio.

#### Cards de Métricas

No topo, você encontra 4 cards principais:

| Card | Descrição |
|------|-----------|
| **Total de Leads** | Quantidade total de leads cadastrados, com variação % |
| **Conversas Ativas** | Conversas em andamento no momento |
| **Mensagens Hoje** | Total de mensagens do dia, com variação % |
| **Conversões Hoje** | Leads que compraram hoje |

#### Gráfico de Mensagens

Mostra a quantidade de mensagens recebidas e enviadas nos últimos 7 dias, permitindo identificar padrões de atendimento.

#### Conversas Recentes

Lista as 5 conversas mais recentes com:
- Nome do lead
- Prévia da última mensagem
- Horário da mensagem
- Status da conversa

Clique em uma conversa para abrir os detalhes.

#### Ações Rápidas

Botões de acesso rápido para:
- **Novo Lead**: Cadastrar lead manualmente
- **Ver Pedidos**: Ir para lista de pedidos
- **Templates**: Gerenciar templates
- **Conhecimento**: Editar base de conhecimento

### 4.2 Conversas

Acesse em **Menu > Conversas** para visualizar e gerenciar todas as conversas.

#### Lista de Conversas (Lateral Esquerda)

- **Barra de busca**: Pesquise por nome ou telefone
- **Filtros**:
  - **Todas**: Mostra todas as conversas
  - **Ativas**: Conversas em andamento
  - **Aguardando**: Conversas aguardando atendente humano
- **Badge vermelho**: Indica conversas que precisam de atenção

#### Área de Chat (Centro)

Ao selecionar uma conversa:

1. **Cabeçalho**: Nome do lead, telefone e status
2. **Histórico**: Todas as mensagens da conversa
   - Mensagens do **cliente** aparecem à esquerda
   - Mensagens do **bot/atendente** aparecem à direita
   - Cada mensagem mostra horário e remetente
3. **Campo de envio**: Digite e envie mensagens manuais

#### Como Assumir uma Conversa

Quando o agente escala para humano (por exemplo, cliente pediu para falar com atendente):

1. A conversa aparece com badge **"Aguardando Humano"**
2. Selecione a conversa
3. Clique no botão **"Assumir Conversa"**
4. A conversa muda de status e você pode responder manualmente
5. O agente não responderá automaticamente enquanto você estiver atendendo

#### Como Devolver para o Agente

Após resolver a questão do cliente:

1. A conversa pode ser arquivada ou
2. Você pode alterar o status para permitir que o agente volte a atender

### 4.3 Leads

Acesse em **Menu > Leads** para gerenciar todos os contatos.

#### Visão Geral

No topo, cards mostram:
- **Novos**: Leads recém-cadastrados
- **Convertidos**: Leads que já compraram
- **Inativos**: Leads sem contato recente
- **Total**: Todos os leads

#### Criar Novo Lead

1. Clique no botão **"Novo Lead"**
2. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome | Não | Nome do cliente |
| Telefone | **Sim** | Número com DDD (ex: 11999999999) |
| Email | Não | Email do cliente |
| Origem | Não | De onde veio (whatsapp, shopify, etc) |
| Status | Não | Estágio inicial do lead |
| Notas | Não | Observações internas |

3. Clique em **"Salvar"**

#### Estágios do Lead

O lead passa por diferentes estágios durante o funil:

| Estágio | Descrição |
|---------|-----------|
| `novo` | Lead recém-chegado |
| `qualificando` | Em processo de qualificação |
| `orcamento` | Aguardando ou analisando orçamento |
| `comprou` | Realizou a compra |
| `producao` | Pedido em produção |
| `entregue` | Pedido entregue |
| `pos_venda` | Acompanhamento pós-venda |
| `inativo` | Sem interação há muito tempo |

#### Detalhes do Lead

Clique em um lead para ver:

- **Resumo**: Telefone, email, data de criação
- **Aba Conversas**: Histórico de todas as conversas
- **Aba Pedidos**: Todos os pedidos do cliente
- **Aba Follow-ups**: Acompanhamentos agendados

### 4.4 Pedidos

Acesse em **Menu > Pedidos** para visualizar pedidos de todas as fontes.

#### Lista de Pedidos

- **Busca**: Por número, cliente ou código de rastreio
- **Filtro por Status**:
  - `cadastrado`: Pedido recebido
  - `em_producao`: Em fabricação
  - `pronto`: Pronto para envio
  - `enviado`: Despachado
  - `entregue`: Entregue ao cliente
- **Filtro por Origem**: Shopify, Yampi, Bling, Manual

#### Informações do Pedido

Cada pedido mostra:

| Campo | Descrição |
|-------|-----------|
| Número | Identificador do pedido |
| Cliente | Nome do comprador |
| Origem | Plataforma de origem |
| Total | Valor do pedido |
| Status | Situação atual |
| Rastreio | Código de rastreamento |
| Data | Data do pedido |

#### Detalhes do Pedido

Clique em um pedido para ver:

- Status atual e histórico
- Dados completos do cliente
- Itens do pedido
- Informações de entrega
- Metadados da plataforma origem

### 4.5 Follow-ups

Acesse em **Menu > Follow-ups** para gerenciar acompanhamentos.

#### O que são Follow-ups?

Follow-ups são mensagens automáticas enviadas em momentos específicos para:
- Recuperar carrinhos abandonados
- Fazer pós-venda
- Solicitar avaliações
- Reativar leads inativos

#### Tipos de Follow-up

| Tipo | Descrição | Quando Usar |
|------|-----------|-------------|
| `abandoned_cart` | Carrinho abandonado | Cliente não finalizou compra |
| `post_delivery` | Pós-entrega | Após produto ser entregue |
| `installation` | Instalação | Perguntar sobre instalação |
| `review` | Avaliação | Solicitar avaliação do produto |
| `reactivation` | Reativação | Lead inativo há muito tempo |
| `custom` | Personalizado | Qualquer outro motivo |

#### Lista de Follow-ups

Visualize todos os follow-ups com:
- **Lead**: Para quem será enviado
- **Tipo**: Categoria do follow-up
- **Status**: pending, sent, responded, cancelled
- **Data Agendada**: Quando será enviado

#### Gerenciar Follow-up

Clique em um follow-up para:
- **Editar data/hora** de envio
- **Alterar status** (cancelar, por exemplo)
- **Ver template** da mensagem que será enviada

### 4.6 Templates

Acesse em **Menu > Templates** para gerenciar modelos de mensagem.

#### O que são Templates?

Templates são mensagens pré-definidas que podem ser usadas pelo agente ou enviadas manualmente. Eles suportam variáveis dinâmicas para personalização.

#### Criar Template

1. Clique em **"Novo Template"**
2. Preencha:

| Campo | Descrição |
|-------|-----------|
| Nome | Identificação do template |
| Categoria | Tipo (saudação, venda, suporte, etc) |
| Conteúdo | Texto da mensagem |
| Variáveis | Lista separada por vírgula |
| Ativo | Se está disponível para uso |

3. Clique em **"Salvar"**

#### Usando Variáveis

Variáveis são substituídas automaticamente pelos dados reais:

```
Olá {{nome}}! 

Seu pedido #{{numero_pedido}} está {{status}}.

Qualquer dúvida, estamos à disposição!
```

**Variáveis disponíveis**:
- `{{nome}}` - Nome do cliente
- `{{telefone}}` - Telefone do cliente
- `{{numero_pedido}}` - Número do pedido
- `{{status}}` - Status do pedido
- `{{rastreio}}` - Código de rastreamento
- `{{valor}}` - Valor do pedido

### 4.7 Base de Conhecimento

Acesse em **Menu > Conhecimento** para treinar o agente.

#### O que é a Base de Conhecimento?

É um repositório de informações que o agente de IA consulta para responder perguntas dos clientes. Quanto mais completa, melhor o atendimento.

#### Criar Artigo

1. Clique em **"Novo Artigo"**
2. Preencha:

| Campo | Descrição |
|-------|-----------|
| Título | Nome do artigo |
| Status | draft, published, archived |
| Tags | Palavras-chave (separadas por vírgula) |
| Conteúdo | Informação completa |

3. Clique em **"Salvar"**

#### Dicas para Bons Artigos

- **Seja específico**: "Prazo de entrega para São Paulo" em vez de "Prazos"
- **Use linguagem simples**: Escreva como você falaria com o cliente
- **Inclua exemplos**: "Para janelas 2F, o prazo é de 5 dias úteis"
- **Mantenha atualizado**: Revise periodicamente as informações

#### Exemplos de Artigos Úteis

1. **Produtos e Preços**
   - Lista de produtos disponíveis
   - Tabela de preços
   - Medidas mínimas e máximas

2. **Prazos e Entregas**
   - Prazo de produção
   - Formas de entrega
   - Frete grátis

3. **Políticas**
   - Garantia
   - Trocas e devoluções
   - Formas de pagamento

4. **Perguntas Frequentes**
   - Como medir a janela?
   - Vocês instalam?
   - Qual a diferença entre vidro comum e temperado?

### 4.8 Métricas

Acesse em **Menu > Métricas** para análises detalhadas.

#### Seleção de Período

No topo, escolha o período de análise:
- **7 dias**: Última semana
- **30 dias**: Último mês
- **90 dias**: Último trimestre

#### Cards de Métricas

| Métrica | Descrição |
|---------|-----------|
| **Total de Mensagens** | Todas as mensagens (entrada + saída) |
| **Conversas Iniciadas** | Novas conversas no período |
| **Leads Criados** | Novos leads cadastrados |
| **Conversões** | Leads que compraram |
| **Tokens Usados** | Consumo de tokens da OpenAI |
| **Custo de IA** | Valor gasto com a IA (USD) |

#### Gráficos Disponíveis

1. **Mensagens por Dia**
   - Barras comparando recebidas vs enviadas
   - Identifique dias de maior movimento

2. **Leads e Conversões**
   - Linha mostrando evolução
   - Compare criação vs conversão

3. **Consumo de Tokens**
   - Barras com uso diário
   - Monitore gastos com IA

4. **Custo de IA**
   - Linha com custo acumulado
   - Planeje orçamento

### 4.9 Integrações

Acesse em **Menu > Integrações** para configurar plataformas externas.

#### Shopify

Integração para receber pedidos da sua loja Shopify.

**Como configurar:**

1. Acesse sua loja Shopify
2. Vá em **Configurações > Notificações > Webhooks**
3. Crie webhooks para os eventos:
   - `orders/create`
   - `orders/updated`
   - `orders/paid`
   - `orders/fulfilled`
4. Use a URL mostrada no painel: `https://seudominio.com/api/webhooks/shopify`
5. Copie o **Webhook Secret** e cole no Decora Agent
6. Ative a integração

**O que acontece automaticamente:**
- Novos pedidos são cadastrados
- Lead é criado/atualizado
- Cliente recebe confirmação via WhatsApp
- Status é atualizado conforme eventos

#### Yampi

Integração para lojas Yampi.

**Como configurar:**

1. Acesse o painel Yampi
2. Vá em **Configurações > API**
3. Copie o **Alias** da loja e o **Token**
4. Configure webhooks em **Configurações > Webhooks**:
   - `cart.reminder`
   - `order.created`
   - `order.paid`
   - `order.invoiced`
   - `order.shipped`
   - `order.delivered`
5. Use a URL: `https://seudominio.com/api/webhooks/yampi`
6. Cole as credenciais no Decora Agent
7. Ative a integração

**Funcionalidades especiais:**
- Carrinho abandonado automático (3 tentativas com descontos progressivos)
- Notificações de status via WhatsApp
- Follow-ups pós-entrega

#### Melhor Envio

Integração para cálculo de frete e rastreamento.

**Como configurar:**

1. Acesse [melhorenvio.com.br](https://melhorenvio.com.br)
2. Vá em **Integrações > Área Dev**
3. Crie uma aplicação
4. Copie o **Token** e **Secret**
5. Cole no Decora Agent
6. Ative a integração

**Funcionalidades:**
- Cálculo de frete automático via agente
- Atualização de status de entrega

#### Bling ERP

Integração OAuth com o Bling.

**Como configurar:**

1. Acesse [developer.bling.com.br](https://developer.bling.com.br)
2. Crie um novo aplicativo
3. Copie **Client ID** e **Client Secret**
4. Cole no Decora Agent
5. Clique em **Conectar** para autorizar

### 4.10 Configurações

Acesse em **Menu > Configurações** para configurar WhatsApp e agente.

#### Conexão WhatsApp

**Status da conexão:**
- **Conectado** (verde): WhatsApp funcionando
- **Desconectado** (vermelho): Precisa reconectar
- **Conectando** (amarelo): Aguardando conexão

**Como conectar:**

1. Clique em **"Gerar QR Code"**
2. Aguarde o QR Code aparecer
3. No celular, abra o **WhatsApp**
4. Vá em **Configurações > Dispositivos Conectados**
5. Clique em **Conectar Dispositivo**
6. Escaneie o QR Code
7. Aguarde o status mudar para **Conectado**

**Importante:**
- Mantenha o celular conectado à internet
- O QR Code expira após alguns minutos
- Se desconectar, repita o processo

#### Agente de IA

**Toggle Ativar/Desativar:**
- **Ativado**: Agente responde automaticamente
- **Desativado**: Apenas humanos respondem

**Informações do Agente:**
- **Nome**: Ana (assistente virtual)
- **Modelo**: GPT-4o
- **Contexto**: 20 mensagens de histórico
- **Delay**: 1.2s entre mensagens (simula digitação)

**Palavras de Escalação:**
Quando o cliente menciona estas palavras, a conversa é transferida para humano:
- atendente
- humano
- pessoa
- reclamação
- problema
- etc.

---

## 5. Agente de IA

### 5.1 Como Funciona

O agente de IA processa automaticamente as mensagens recebidas:

1. **Mensagem chega** via WhatsApp (Evolution API)
2. **Webhook recebe** e salva no banco
3. **Agente analisa** o contexto (últimas 20 mensagens)
4. **IA processa** usando GPT-4o com tools
5. **Resposta é gerada** e enviada ao cliente
6. **Métricas são salvas** (tokens, tempo, custo)

### 5.2 Ferramentas do Agente (Tools)

O agente tem acesso a ferramentas especiais:

| Tool | Descrição |
|------|-----------|
| `check_order_status` | Consulta status de pedidos |
| `escalate_to_human` | Transfere para atendente |
| `schedule_followup` | Agenda follow-up |
| `calculate_shipping` | Calcula frete |
| `get_product_info` | Busca info de produtos |
| `update_lead_info` | Atualiza dados do lead |

### 5.3 Personalidade: Ana

A assistente virtual se chama **Ana** e foi configurada para:

- Ser **simpática e profissional**
- Usar linguagem **clara e objetiva**
- Responder sobre **produtos, preços e prazos**
- **Escalar** quando necessário
- Nunca inventar informações

### 5.4 Regras de Negócio Configuradas

O agente conhece:

**Produtos:**
- Janelas 2 Folhas, 3 Folhas
- Com tela mosquiteira
- Capelinha, Grades, Arremates

**Vidros:**
- Incolor 4mm
- Temperado 4mm
- Mini Boreal
- Fumê

**Cores:**
- Branco, Preto, Bronze

**Medidas:**
- Mínimo: 30x60cm
- Máximo SP: 200x150cm
- Máximo outros estados: 180cm altura

**Prazos:**
- Produção: 5-7 dias úteis
- Entrega SP: Quintas-feiras
- Outros estados: Via transportadora

**Frete:**
- Grátis para SP acima de R$500

### 5.5 Quando o Agente Escala

O agente transfere para humano quando:

1. Cliente pede explicitamente
2. Menciona palavras de escalação
3. Assunto fora do escopo (jurídico, técnico complexo)
4. Reclamação ou problema grave
5. Negociação de preços especiais

---

## 6. Administração

### 6.1 Gestão de Usuários

Acesse em **Menu > Usuários** para gerenciar a equipe.

#### Tipos de Usuário (Roles)

| Role | Permissões |
|------|------------|
| `admin` | Acesso total ao sistema |
| `attendant` | Acesso a conversas, leads e pedidos |

#### Criar Novo Usuário

1. No Supabase, vá em **Authentication > Users**
2. Clique em **Add user**
3. Preencha email e senha
4. No SQL Editor, crie o perfil:

```sql
INSERT INTO dc_profiles (id, full_name, role, is_active)
VALUES ('uuid-do-usuario', 'Nome Completo', 'attendant', true);
```

#### Desativar Usuário

```sql
UPDATE dc_profiles
SET is_active = false
WHERE id = 'uuid-do-usuario';
```

### 6.2 Segurança

- **Row Level Security (RLS)**: Dados protegidos por políticas
- **Autenticação obrigatória**: Exceto webhooks públicos
- **Validação de webhooks**: Assinatura HMAC verificada
- **Service Role**: Usado apenas no servidor

---

## 7. Automações

### 7.1 Follow-ups Automáticos

Follow-ups são processados automaticamente via CRON job.

**Configurar CRON:**

1. Use um serviço como [cron-job.org](https://cron-job.org)
2. Configure chamada POST para:
   ```
   https://seudominio.com/api/agent/followup
   ```
3. Header: `x-cron-secret: seu-cron-secret`
4. Frequência: A cada 5-15 minutos

**O que é processado:**
- Follow-ups com status `pending`
- Data agendada já passou
- Máximo de 3 tentativas
- Limite de 10 por execução

### 7.2 Webhooks de Pedidos

Os webhooks são chamados automaticamente pelas plataformas:

| Plataforma | Eventos |
|------------|---------|
| Shopify | Pedido criado, atualizado, pago, enviado |
| Yampi | Carrinho abandonado, pedidos, entregas |
| Melhor Envio | Atualizações de rastreamento |

### 7.3 Métricas Diárias

Métricas são salvas automaticamente a cada interação:
- Mensagens enviadas/recebidas
- Tokens consumidos
- Tempo de resposta
- Escalações

---

## 8. Troubleshooting

### 8.1 WhatsApp Desconectado

**Sintomas:**
- Mensagens não chegam
- Status mostra "Desconectado"

**Soluções:**

1. Verifique se o celular está conectado à internet
2. Verifique se a Evolution API está rodando:
   ```bash
   docker-compose ps
   docker-compose logs evolution-api
   ```
3. Gere novo QR Code e reconecte
4. Reinicie a Evolution API:
   ```bash
   docker-compose restart evolution-api
   ```

### 8.2 Agente Não Responde

**Sintomas:**
- Cliente envia mensagem mas não recebe resposta
- Conversa fica sem resposta

**Soluções:**

1. Verifique se o agente está **ativado** (Configurações)
2. Verifique se a conversa não está em **"Aguardando Humano"**
3. Verifique a chave da OpenAI no `.env.local`
4. Verifique os logs do servidor:
   ```bash
   pm2 logs
   ```
5. Verifique se há créditos na conta OpenAI

### 8.3 Webhooks Não Funcionam

**Sintomas:**
- Pedidos não aparecem automaticamente
- Carrinhos abandonados não são criados

**Soluções:**

1. Verifique se a URL do webhook está correta
2. Verifique se o `WEBHOOK_SECRET` está configurado
3. Teste o webhook manualmente:
   ```bash
   curl -X POST https://seudominio.com/api/webhooks/shopify \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
4. Verifique os logs na plataforma de origem

### 8.4 Erros de Banco de Dados

**Sintomas:**
- Telas não carregam
- Erro 500

**Soluções:**

1. Verifique as variáveis de ambiente do Supabase
2. Verifique se as migrations foram executadas
3. Verifique as políticas RLS no Supabase
4. Verifique se o usuário tem perfil criado

---

## 9. Dicas e Boas Práticas

### 9.1 Configurar Templates Eficientes

- Crie templates para situações frequentes
- Use variáveis para personalização
- Mantenha mensagens curtas e objetivas
- Teste antes de ativar

### 9.2 Treinar a Base de Conhecimento

- Adicione respostas para perguntas frequentes
- Inclua informações detalhadas de produtos
- Mantenha políticas atualizadas
- Use tags para organização

### 9.3 Monitorar Métricas

- Acompanhe diariamente o volume de mensagens
- Monitore o custo de IA
- Identifique horários de pico
- Analise taxa de conversão

### 9.4 Quando Escalar para Humano

Oriente o agente a escalar quando:
- Cliente está insatisfeito
- Assunto é sensível (reclamação, jurídico)
- Negociação especial necessária
- Dúvida técnica complexa

### 9.5 Manter o Sistema Saudável

- **Diariamente**: Verifique conexão do WhatsApp
- **Semanalmente**: Revise métricas e custos
- **Mensalmente**: Atualize base de conhecimento
- **Sempre**: Mantenha backups do banco

---

## Suporte

Para dúvidas ou problemas técnicos, entre em contato com a equipe de desenvolvimento.

---

**Versão do Documento**: 1.0  
**Última Atualização**: Fevereiro 2026  
**Sistema**: Decora Agent v1.0
