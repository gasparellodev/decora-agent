'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageBubble, ChannelBadge } from '@/components/conversations'
import {
  loadUnifiedConversations,
  loadUnifiedMessages,
  sendUnifiedMessage,
  getStatusLabel,
  ML_MAX_CHARS,
  answerMLQuestion,
  toggleMLAI
} from '@/lib/services/unified-conversations.service'
import {
  MessageSquare,
  Send,
  User,
  UserCheck,
  Search,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Store,
  Bot,
  BotOff,
  AlertTriangle,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { UnifiedConversation, UnifiedMessage, ChannelType, Message, MLMessage, MLConversation, MLQuestion } from '@/types/database'

type StatusFilter = 'all' | 'active' | 'waiting'
type ChannelFilter = 'all' | 'whatsapp' | 'mercadolivre'

function ConversationsPageContent() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')
  const channelParam = searchParams.get('channel') as ChannelType | null
  
  const supabase = createClient()
  const [conversations, setConversations] = useState<UnifiedConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null)
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Estado para controle de visualização mobile
  const [showChat, setShowChat] = useState(false)
  
  // Estados para controle de IA e resposta de perguntas
  const [togglingAI, setTogglingAI] = useState(false)
  const [answeringQuestion, setAnsweringQuestion] = useState(false)
  const [questionAnswer, setQuestionAnswer] = useState('')

  // Carregar conversas quando filtros mudam
  useEffect(() => {
    loadConversations()
  }, [statusFilter, channelFilter, search])

  // Configurar Realtime
  useEffect(() => {
    const channel = supabase
      .channel('unified-conversations-realtime')
      // WhatsApp messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dc_messages' },
        (payload) => {
          const newMsg = payload.new as Message
          if (selectedConversation && 
              selectedConversation.channel === 'whatsapp' && 
              newMsg.conversation_id === selectedConversation.id) {
            const unified: UnifiedMessage = {
              id: newMsg.id,
              channel: 'whatsapp',
              conversationId: newMsg.conversation_id,
              direction: newMsg.direction,
              senderType: newMsg.sender_type,
              content: newMsg.content,
              sentAt: newMsg.sent_at,
              original: newMsg
            }
            setMessages(prev => [...prev, unified])
          }
          loadConversations()
        }
      )
      // WhatsApp conversations update
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dc_conversations' },
        () => {
          loadConversations()
        }
      )
      // Mercado Livre messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dc_ml_messages' },
        (payload) => {
          const newMsg = payload.new as MLMessage
          if (selectedConversation && 
              selectedConversation.channel === 'mercadolivre' && 
              (newMsg.conversation_id === selectedConversation.id || 
               newMsg.pack_id === selectedConversation.packId)) {
            const unified: UnifiedMessage = {
              id: newMsg.id,
              channel: 'mercadolivre',
              conversationId: newMsg.conversation_id || newMsg.pack_id,
              direction: newMsg.direction,
              senderType: newMsg.sender_type,
              content: newMsg.content,
              sentAt: newMsg.created_at,
              original: newMsg
            }
            setMessages(prev => [...prev, unified])
          }
          loadConversations()
        }
      )
      // Mercado Livre conversations update
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dc_ml_conversations' },
        () => {
          loadConversations()
        }
      )
      // New ML conversations
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dc_ml_conversations' },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedConversation?.id, selectedConversation?.channel, selectedConversation?.packId])

  // Selecionar conversa da URL
  useEffect(() => {
    if (selectedId && channelParam && conversations.length > 0) {
      const conv = conversations.find(c => c.id === selectedId && c.channel === channelParam)
      if (conv) {
        handleSelectConversation(conv)
      }
    }
  }, [selectedId, channelParam, conversations])

  // Scroll to bottom quando mensagens mudam
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      const data = await loadUnifiedConversations(statusFilter, search, channelFilter)
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = async (conv: UnifiedConversation) => {
    setSelectedConversation(conv)
    setShowChat(true)
    setQuestionAnswer('') // Limpar resposta anterior
    
    // Carregar mensagens (passar subtype para perguntas)
    const msgs = await loadUnifiedMessages(conv.id, conv.channel, conv.subtype)
    setMessages(msgs)
    
    // Atualizar URL
    const subtypeParam = conv.subtype ? `&subtype=${conv.subtype}` : ''
    window.history.pushState({}, '', `/conversations?id=${conv.id}&channel=${conv.channel}${subtypeParam}`)
  }

  const handleBackToList = () => {
    setShowChat(false)
    setSelectedConversation(null)
    setMessages([])
    window.history.pushState({}, '', '/conversations')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    // Validar limite de caracteres para ML
    if (selectedConversation.channel === 'mercadolivre' && newMessage.length > ML_MAX_CHARS) {
      toast.error(`Mensagem excede o limite de ${ML_MAX_CHARS} caracteres`)
      return
    }

    setSending(true)
    try {
      const result = await sendUnifiedMessage(
        selectedConversation.id,
        selectedConversation.channel,
        newMessage,
        {
          packId: selectedConversation.packId,
          buyerId: selectedConversation.buyerId,
          phone: selectedConversation.leadPhone || undefined,
          leadId: selectedConversation.leadId
        }
      )

      if (result.success) {
        setNewMessage('')
        toast.success('Mensagem enviada!')
      } else {
        toast.error(result.error || 'Erro ao enviar mensagem')
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const handleTakeOver = async () => {
    if (!selectedConversation) return

    try {
      if (selectedConversation.channel === 'whatsapp') {
        const { error } = await supabase
          .from('dc_conversations')
          .update({ status: 'active' })
          .eq('id', selectedConversation.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dc_ml_conversations')
          .update({ status: 'active' })
          .eq('id', selectedConversation.id)
        if (error) throw error
      }

      toast.success('Você assumiu a conversa')
      loadConversations()
    } catch (error) {
      toast.error('Erro ao assumir conversa')
    }
  }

  // Verificar se conversa precisa de atenção humana
  const needsHumanAttention = (conv: UnifiedConversation) => {
    if (conv.channel === 'whatsapp') {
      return conv.status === 'waiting_human'
    }
    // Para perguntas ML
    if (conv.subtype === 'question') {
      return conv.needsHumanReview || conv.status === 'pending'
    }
    return ['waiting_data', 'waiting_glass'].includes(conv.status)
  }

  // Verificar se é uma pergunta pendente
  const isPendingQuestion = (conv: UnifiedConversation) => {
    return conv.subtype === 'question' && conv.status === 'pending'
  }

  // Toggle IA para buyer
  const handleToggleAI = async () => {
    if (!selectedConversation?.buyerId) return
    
    setTogglingAI(true)
    try {
      const newState = !(selectedConversation.aiEnabled ?? true)
      const result = await toggleMLAI(selectedConversation.buyerId, newState)
      
      if (result.success) {
        toast.success(newState ? 'IA ativada' : 'IA desativada')
        // Atualizar estado local
        setSelectedConversation(prev => prev ? { ...prev, aiEnabled: newState } : null)
        loadConversations()
      } else {
        toast.error(result.error || 'Erro ao alterar IA')
      }
    } catch (error) {
      toast.error('Erro ao alterar configuração de IA')
    } finally {
      setTogglingAI(false)
    }
  }

  // Responder pergunta manualmente
  const handleAnswerQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionAnswer.trim() || !selectedConversation) return

    // Validar limite de caracteres
    if (questionAnswer.length > ML_MAX_CHARS) {
      toast.error(`Resposta excede o limite de ${ML_MAX_CHARS} caracteres`)
      return
    }

    setAnsweringQuestion(true)
    try {
      const result = await answerMLQuestion(selectedConversation.id, questionAnswer)
      
      if (result.success) {
        toast.success('Pergunta respondida!')
        setQuestionAnswer('')
        // Recarregar mensagens e conversas
        const msgs = await loadUnifiedMessages(selectedConversation.id, selectedConversation.channel, selectedConversation.subtype)
        setMessages(msgs)
        loadConversations()
      } else {
        toast.error(result.error || 'Erro ao responder pergunta')
      }
    } catch (error) {
      toast.error('Erro ao responder pergunta')
    } finally {
      setAnsweringQuestion(false)
    }
  }

  // Contador de caracteres para ML
  const charCount = newMessage.length
  const isOverLimit = selectedConversation?.channel === 'mercadolivre' && charCount > ML_MAX_CHARS

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Lista de conversas */}
      <Card className={cn(
        "flex-shrink-0 flex flex-col",
        "w-full lg:w-80 xl:w-96",
        "h-full lg:h-auto",
        showChat && "hidden lg:flex"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversas</CardTitle>
          <div className="space-y-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-base"
              />
            </div>
            
            {/* Filtro de status */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm">Todas</TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs sm:text-sm">Ativas</TabsTrigger>
                <TabsTrigger value="waiting" className="flex-1 text-xs sm:text-sm">Aguardando</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtro de canal */}
            <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as ChannelFilter)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">Todos</TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex-1 text-xs">
                  <span className="mr-1">📱</span> WhatsApp
                </TabsTrigger>
                <TabsTrigger value="mercadolivre" className="flex-1 text-xs">
                  <Store className="h-3 w-3 mr-1" /> ML
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground px-4">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={`${conv.channel}-${conv.id}`}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      'w-full p-3 sm:p-4 text-left hover:bg-accent transition-colors',
                      selectedConversation?.id === conv.id && 
                      selectedConversation?.channel === conv.channel && 'bg-accent'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar com indicador de canal */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative",
                        conv.channel === 'mercadolivre' 
                          ? "bg-yellow-500/20" 
                          : "bg-primary/10"
                      )}>
                        <span className="text-sm font-medium">
                          {conv.leadName?.[0]?.toUpperCase() || conv.buyerName?.[0]?.toUpperCase() || '?'}
                        </span>
                        {/* Indicador de canal */}
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs",
                          conv.channel === 'mercadolivre' 
                            ? "bg-yellow-500 text-yellow-950" 
                            : "bg-green-500 text-white"
                        )}>
                          {conv.channel === 'mercadolivre' ? (
                            <Store className="h-3 w-3" />
                          ) : (
                            <span>📱</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate text-sm">
                            {conv.leadName || conv.buyerName || conv.leadPhone || conv.packId}
                          </p>
                          {/* Badge de tipo: Pergunta */}
                          {conv.subtype === 'question' && (
                            <Badge variant="secondary" className="text-xs">
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Pergunta
                            </Badge>
                          )}
                          {/* Badge de revisão necessária */}
                          {conv.needsHumanReview && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Revisão
                            </Badge>
                          )}
                          {/* Badge de status */}
                          {needsHumanAttention(conv) && !conv.needsHumanReview && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                              {getStatusLabel(conv.status, conv.channel, conv.subtype)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.channel === 'whatsapp' 
                              ? conv.leadPhone 
                              : conv.subtype === 'question'
                                ? conv.itemTitle || `Item: ${conv.itemId}`
                                : `Pack: ${conv.packId}`}
                          </p>
                        </div>
                        {/* Preview da mensagem para perguntas */}
                        {conv.lastMessagePreview && conv.subtype === 'question' && (
                          <p className="text-xs text-muted-foreground truncate mt-1 italic">
                            "{conv.lastMessagePreview}"
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className={cn(
        "flex-1 flex flex-col min-h-0",
        !showChat && "hidden lg:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Header do chat */}
            <CardHeader className="pb-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Botão voltar - apenas mobile */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="lg:hidden flex-shrink-0"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    selectedConversation.channel === 'mercadolivre' 
                      ? "bg-yellow-500/20" 
                      : "bg-primary/10"
                  )}>
                    <span className="font-medium">
                      {selectedConversation.leadName?.[0]?.toUpperCase() || 
                       selectedConversation.buyerName?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {selectedConversation.leadName || 
                         selectedConversation.buyerName || 
                         selectedConversation.leadPhone ||
                         selectedConversation.packId}
                      </p>
                      <ChannelBadge channel={selectedConversation.channel} />
                      {selectedConversation.subtype === 'question' && (
                        <Badge variant="secondary" className="text-xs">Pergunta</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedConversation.channel === 'whatsapp' 
                        ? selectedConversation.leadPhone 
                        : selectedConversation.subtype === 'question'
                          ? selectedConversation.itemTitle || `Item: ${selectedConversation.itemId}`
                          : `Pack: ${selectedConversation.packId}`}
                    </p>
                  </div>
                </div>
                
                {/* Controles para ML */}
                {selectedConversation.channel === 'mercadolivre' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Badge de revisão */}
                    {selectedConversation.needsHumanReview && (
                      <Badge variant="destructive" className="hidden sm:flex">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Revisão
                      </Badge>
                    )}
                    
                    {/* Toggle IA */}
                    {selectedConversation.buyerId && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleToggleAI}
                        disabled={togglingAI}
                        className={cn(
                          selectedConversation.aiEnabled === false && "border-orange-500 text-orange-500"
                        )}
                      >
                        {togglingAI ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : selectedConversation.aiEnabled === false ? (
                          <>
                            <BotOff className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">IA Off</span>
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">IA On</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Botão assumir */}
                {needsHumanAttention(selectedConversation) && selectedConversation.subtype !== 'question' && (
                  <Button onClick={handleTakeOver} size="sm" className="flex-shrink-0">
                    <UserCheck className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Assumir</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Mensagens */}
            <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input - Para perguntas pendentes, mostrar formulário de resposta */}
            {isPendingQuestion(selectedConversation) ? (
              <div className="p-3 sm:p-4 border-t flex-shrink-0 bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2 mb-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">Esta pergunta ainda não foi respondida</p>
                </div>
                <form onSubmit={handleAnswerQuestion} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Responder pergunta (máx. ${ML_MAX_CHARS} caracteres)...`}
                      value={questionAnswer}
                      onChange={(e) => setQuestionAnswer(e.target.value)}
                      disabled={answeringQuestion}
                      className={cn(
                        "text-base bg-white dark:bg-background",
                        questionAnswer.length > ML_MAX_CHARS && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={answeringQuestion || !questionAnswer.trim() || questionAnswer.length > ML_MAX_CHARS}
                      className="flex-shrink-0"
                    >
                      {answeringQuestion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Responder</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Contador de caracteres */}
                  {questionAnswer.length > 0 && (
                    <div className={cn(
                      "text-xs text-right",
                      questionAnswer.length > ML_MAX_CHARS ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {questionAnswer.length}/{ML_MAX_CHARS}
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="p-3 sm:p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedConversation.channel === 'mercadolivre' 
                        ? `Mensagem (máx. ${ML_MAX_CHARS} caracteres)...` 
                        : "Mensagem..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending || selectedConversation.subtype === 'question'}
                      className={cn(
                        "text-base",
                        isOverLimit && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={sending || !newMessage.trim() || isOverLimit || selectedConversation.subtype === 'question'}
                      size="icon"
                      className="flex-shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Contador de caracteres para ML */}
                  {selectedConversation.channel === 'mercadolivre' && newMessage.length > 0 && (
                    <div className={cn(
                      "text-xs text-right",
                      isOverLimit ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {charCount}/{ML_MAX_CHARS}
                    </div>
                  )}
                  
                  {/* Aviso para perguntas já respondidas */}
                  {selectedConversation.subtype === 'question' && (
                    <p className="text-xs text-muted-foreground text-center">
                      Pergunta já respondida. Não é possível enviar novas mensagens.
                    </p>
                  )}
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center p-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Carregando...</div>}>
      <ConversationsPageContent />
    </Suspense>
  )
}
