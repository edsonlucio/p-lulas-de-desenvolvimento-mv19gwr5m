import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  ExternalLink,
  GraduationCap,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  STUDENT_QUICK_PROMPTS,
  VISITOR_QUICK_PROMPTS,
  sendTutorMessage,
  type TutorMessage,
} from '@/services/tutor'

export function TutorWidget() {
  const { user } = useAuth()
  const isStudent = !!user

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [hasUnread, setHasUnread] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Mensagem inicial de boas-vindas personalizada conforme o perfil
  const getWelcomeMessage = (): TutorMessage => {
    if (isStudent) {
      const firstName = user?.name ? user.name.split(' ')[0] : 'Aluno'
      return {
        id: 'welcome-student',
        role: 'assistant',
        content: `Oi, ${firstName}! 👋 Sou o **Tutor Pílulas**.\n\nEstou aqui para tirar dúvidas das aulas dos seus cursos matriculados, sugerir seu próximo passo de estudo e acelerar seus resultados!\n\nEm que aula ou assunto posso te ajudar hoje? 🚀`,
        createdAt: new Date().toISOString(),
      }
    }

    return {
      id: 'welcome-visitor',
      role: 'assistant',
      content: `Oi! Sou o **Tutor Pílulas** 👋\n\nPosso te explicar nossos cursos práticos, mentorias empresariais de **Edson Lúcio** e tudo sobre o **Clube das Pílulas** (leitura de *Metanoia* com rotina diária no WhatsApp).\n\nComo posso te ajudar a dar o próximo passo hoje? ✨`,
      createdAt: new Date().toISOString(),
    }
  }

  // Inicializa mensagens ao carregar ou trocar de estado de login
  useEffect(() => {
    setMessages([getWelcomeMessage()])
    setConversationId(null)
  }, [user?.id])

  // Rola até o fim da conversa
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const quickPrompts = isStudent ? STUDENT_QUICK_PROMPTS : VISITOR_QUICK_PROMPTS

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    setInputMessage('')

    const userMsg: TutorMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    const assistantMsgId = `asst-${Date.now()}`
    const assistantMsgPlaceholder: TutorMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsgPlaceholder])
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await sendTutorMessage({
        message: text,
        conversationId,
        signal: controller.signal,
        onChunk: (_chunk, accumulated) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: accumulated } : msg)),
          )
        },
        onCitations: (citations) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, citations } : msg)),
          )
        },
      })

      if (result.conversationId) {
        setConversationId(result.conversationId)
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: result.content || msg.content,
                citations: result.citations,
              }
            : msg,
        ),
      )

      if (!isOpen) {
        setHasUnread(true)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Não foi possível obter resposta no momento.'

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `⚠️ Desculpe, tive uma instabilidade temporária: ${errorMessage}\n\nPor favor, tente perguntar novamente em alguns instantes.`,
              }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleResetConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setConversationId(null)
    setMessages([getWelcomeMessage()])
  }

  // Renderizador simplificado de links e markdown básico nas respostas
  const renderMessageContent = (content: string) => {
    // Quebra por linhas
    const paragraphs = content.split('\n')

    return paragraphs.map((paragraph, pIdx) => {
      if (!paragraph.trim()) {
        return <div key={pIdx} className="h-2" />
      }

      // Detecção de títulos/destaques
      const formatted = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

      return (
        <p
          key={pIdx}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })
  }

  return (
    <aside
      aria-label="Tutor Pílulas"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50"
    >
      {/* Botão Flutuante discreto e compacto (quando fechado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'group relative flex items-center gap-2.5 rounded-full py-2 pl-3 pr-3.5 shadow-xl transition-all duration-300',
            'bg-brand-navy hover:bg-[#111c33] text-white border border-brand-orange/70 hover:border-brand-orange',
            'hover:scale-102 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-orange/30',
          )}
          aria-label="Abrir conversa com o Tutor Pílulas"
        >
          {/* Indicador de status online discreto */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange" />
          </span>

          <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-orange text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold tracking-tight">Tutor Pílulas</span>
              <span className="rounded bg-brand-orange/20 px-1 py-0.2 text-[9px] font-extrabold text-brand-orange">
                IA
              </span>
            </div>
            <p className="text-[10px] text-white/65 leading-tight">
              {isStudent ? 'Dúvidas das aulas' : 'Cursos & Clube'}
            </p>
          </div>

          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
              !
            </span>
          )}
        </button>
      )}

      {/* Janela de Chat Compacta (~340-360px, altura ~65-70vh) */}
      {isOpen && (
        <div
          className={cn(
            'flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-brand-navy text-white shadow-2xl backdrop-blur-xl transition-all duration-200',
            isExpanded
              ? 'fixed inset-3 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[460px] sm:h-[620px] max-h-[85vh]'
              : 'w-[calc(100vw-32px)] sm:w-[350px] h-[500px] max-h-[68vh]',
          )}
        >
          {/* Cabeçalho do Chat Compacto */}
          <div className="flex items-center justify-between border-b border-white/10 bg-brand-navy/95 px-3.5 py-2.5 sm:px-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-brand-orange-dark to-brand-orange text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-brand-navy bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold tracking-tight truncate">Tutor Pílulas</h3>
                  <span className="shrink-0 rounded-full bg-brand-orange/20 px-1.5 py-0.2 text-[9px] font-extrabold text-brand-orange">
                    {isStudent ? 'Aluno' : 'Prospect'}
                  </span>
                </div>
                <p className="text-[10px] text-white/55 truncate">
                  {isStudent ? 'Tira-dúvidas pedagógico' : 'Consultor educacional'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleResetConversation}
                className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Reiniciar conversa"
                aria-label="Reiniciar conversa"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition"
                title={isExpanded ? 'Reduzir tamanho' : 'Expandir painel'}
                aria-label={isExpanded ? 'Reduzir tamanho' : 'Expandir painel'}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Fechar chat"
                aria-label="Fechar chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Subheader Informativo / Identidade */}
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-[10px] text-white/50">
            <span className="flex items-center gap-1 truncate">
              <Sparkles className="h-2.5 w-2.5 text-brand-orange shrink-0" />
              <span className="truncate">Pequenas pílulas, grandes transformações.</span>
            </span>
            {isStudent ? (
              <span className="flex items-center gap-1 text-emerald-400 shrink-0 font-medium">
                <UserCheck className="h-2.5 w-2.5" />
                {user?.points || 0} pts
              </span>
            ) : (
              <Link
                to="/cadastro"
                className="font-semibold text-brand-orange hover:underline flex items-center gap-0.5 shrink-0"
              >
                Criar conta <ArrowUpRight className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>

          {/* Corpo das Mensagens */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-orange text-white shadow-xs mt-0.5">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[88%] rounded-xl p-2.5 text-xs shadow-xs transition-all leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-brand-orange text-white rounded-br-xs'
                      : 'bg-white/10 text-white/95 rounded-bl-xs border border-white/10',
                  )}
                >
                  {/* Se estiver carregando ainda vazio */}
                  {!msg.content && isLoading ? (
                    <div className="flex items-center gap-1.5 text-white/70 py-0.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                      <span className="text-[11px]">Pensando e consultando acervo…</span>
                    </div>
                  ) : (
                    <div className="space-y-1">{renderMessageContent(msg.content)}</div>
                  )}

                  {/* Atalhos rápidos caso a mensagem cite aula ou catálogo */}
                  {msg.role === 'assistant' && isStudent && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[10px]">
                      <Link
                        to="/app"
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <PlayCircle className="h-2.5 w-2.5" />
                        Meus cursos
                      </Link>
                      <Link
                        to="/app/busca"
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <GraduationCap className="h-2.5 w-2.5" />
                        Buscar aulas
                      </Link>
                    </div>
                  )}

                  {msg.role === 'assistant' && !isStudent && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[10px]">
                      <Link
                        to="/cursos"
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Ver catálogo
                      </Link>
                      <a
                        href="/#clube"
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Clube das Pílulas
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões Rápidas de Perguntas */}
          {messages.length <= 2 && (
            <div className="border-t border-white/5 bg-white/[0.02] p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold text-white/50">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-1">
                {quickPrompts.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-left text-[10px] text-white/75 hover:border-brand-orange hover:bg-brand-orange/20 hover:text-white transition disabled:opacity-50 truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé / Input de Mensagem Compacto */}
          <div className="border-t border-white/10 bg-brand-navy p-2.5 sm:p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={isLoading}
                placeholder={
                  isStudent ? 'Dúvida de aula ou conceito…' : 'Pergunte sobre cursos ou Clube…'
                }
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40',
                  'focus:border-brand-orange focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-brand-orange transition',
                )}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="h-8 w-8 shrink-0 rounded-xl bg-brand-orange hover:bg-brand-orange-dark text-white p-0 shadow-xs transition disabled:opacity-40"
                aria-label="Enviar mensagem"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
            <p className="mt-1.5 text-center text-[9px] text-white/35">
              Acervo oficial Pílulas de Desenvolvimento.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
