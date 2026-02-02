'use client'

import { format } from 'date-fns'
import { User, Bot, UserCheck, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UnifiedMessage, ChannelType } from '@/types/database'

interface MessageBubbleProps {
  message: UnifiedMessage
  showChannelIcon?: boolean
}

/**
 * Componente de bolha de mensagem reutilizável
 * Suporta mensagens de WhatsApp e Mercado Livre
 */
export function MessageBubble({ message, showChannelIcon = false }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const isML = message.channel === 'mercadolivre'

  // Determinar ícone do remetente
  const getSenderIcon = () => {
    if (isOutbound) {
      if (message.senderType === 'agent') return <Bot className="h-4 w-4" />
      if (message.senderType === 'human') return <UserCheck className="h-4 w-4" />
      return <Bot className="h-4 w-4" />
    }
    return <User className="h-4 w-4" />
  }

  // Determinar cor do avatar
  const getAvatarColor = () => {
    if (isOutbound) {
      if (isML) return 'bg-yellow-500'
      return 'bg-primary'
    }
    return 'bg-muted-foreground/20'
  }

  // Determinar cor da bolha
  const getBubbleColor = () => {
    if (isOutbound) {
      if (isML) return 'bg-yellow-500 text-yellow-950'
      return 'bg-primary text-primary-foreground'
    }
    return 'bg-muted'
  }

  // Formatar timestamp
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm')
    } catch {
      return ''
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar (lado esquerdo para inbound) */}
      {!isOutbound && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          getAvatarColor()
        )}>
          {getSenderIcon()}
        </div>
      )}

      {/* Conteúdo da mensagem */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[70%] rounded-lg p-2.5 sm:p-3',
          getBubbleColor()
        )}
      >
        {/* Indicador de canal (opcional) */}
        {showChannelIcon && (
          <div className="flex items-center gap-1 mb-1 opacity-70">
            {isML ? (
              <Store className="h-3 w-3" />
            ) : (
              <span className="text-xs">📱</span>
            )}
            <span className="text-xs">
              {isML ? 'Mercado Livre' : 'WhatsApp'}
            </span>
          </div>
        )}

        {/* Texto da mensagem */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Footer com ícones e timestamp */}
        <div className={cn(
          'flex items-center gap-1.5 mt-1',
          isOutbound ? 'justify-end' : 'justify-start'
        )}>
          {isOutbound && (
            <span className="opacity-70">
              {message.senderType === 'agent' && (
                <Bot className="h-3 w-3 inline" />
              )}
              {message.senderType === 'human' && (
                <UserCheck className="h-3 w-3 inline" />
              )}
            </span>
          )}
          <span className={cn(
            'text-xs opacity-70',
            isOutbound ? '' : 'text-muted-foreground'
          )}>
            {formatTime(message.sentAt)}
          </span>
        </div>
      </div>

      {/* Avatar (lado direito para outbound) */}
      {isOutbound && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          getAvatarColor()
        )}>
          {getSenderIcon()}
        </div>
      )}
    </div>
  )
}

/**
 * Componente de lista de mensagens
 */
interface MessageListProps {
  messages: UnifiedMessage[]
  showChannelIcons?: boolean
}

export function MessageList({ messages, showChannelIcons = false }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Nenhuma mensagem ainda</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          showChannelIcon={showChannelIcons}
        />
      ))}
    </div>
  )
}

/**
 * Indicador de canal para a lista de conversas
 */
interface ChannelBadgeProps {
  channel: ChannelType
  className?: string
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const isML = channel === 'mercadolivre'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        isML ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        className
      )}
    >
      {isML ? (
        <>
          <Store className="h-3 w-3" />
          <span>ML</span>
        </>
      ) : (
        <>
          <span>📱</span>
          <span>WA</span>
        </>
      )}
    </div>
  )
}
