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
    <aside aria-label="Tutor Pílulas" className="fixed bottom-5 right-5 z-50">
      {/* Botão Flutuante (quando fechado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'group relative flex items-center gap-3 rounded-full py-3 pl-4 pr-5 shadow-2xl transition-all duration-300',
            'bg-brand-navy hover:bg-[#111c33] text-white border-2 border-brand-orange/80 hover:border-brand-orange',
            'hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand-orange/30',
          )}
          aria-label="Abrir conversa com o Tutor Pílulas"
        >
          {/* Indicador de status online / novo */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-orange" />
          </span>

          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-orange text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight">Tutor Pílulas</span>
              <span className="rounded bg-brand-orange/20 px-1 py-0.2 text-[10px] font-bold text-brand-orange">
                IA
              </span>
            </div>
            <p className="text-[11px] text-white/70">
              {isStudent ? 'Tire dúvidas das aulas' : 'Conheça cursos e o Clube'}
            </p>
          </div>

          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
              !
            </span>
          )}
        </button>
      )}

      {/* Painel Flutuante do Chat */}
      {isOpen && (
        <div
          className={cn(
            'flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-brand-navy text-white shadow-2xl backdrop-blur-xl transition-all duration-300',
            isExpanded
              ? 'fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[540px] sm:h-[700px]'
              : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]',
          )}
        >
          {/* Cabeçalho do Chat */}
          <div className="flex items-center justify-between border-b border-white/10 bg-brand-navy/95 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-brand-orange-dark to-brand-orange text-white shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-brand-navy bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold tracking-tight">Tutor Pílulas</h3>
                  <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-[10px] font-extrabold text-brand-orange">
                    {isStudent ? 'Modo Aluno' : 'Modo Prospect'}
                  </span>
                </div>
                <p className="text-[11px] text-white/60">
                  {isStudent ? 'Mentor pedagógico e tira-dúvidas' : 'Consultor de cursos e Clube'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetConversation}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Reiniciar conversa"
                aria-label="Reiniciar conversa"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                title={isExpanded ? 'Reduzir tamanho' : 'Expandir painel'}
                aria-label={isExpanded ? 'Reduzir tamanho' : 'Expandir painel'}
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Fechar chat"
                aria-label="Fechar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Subheader Informativo / Identidade */}
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] text-white/50">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-brand-orange" />
              Pequenas pílulas, grandes transformações.
            </span>
            {isStudent ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <UserCheck className="h-3 w-3" />
                {user?.points || 0} pts
              </span>
            ) : (
              <Link
                to="/cadastro"
                className="font-semibold text-brand-orange hover:underline flex items-center gap-0.5"
              >
                Criar conta <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {/* Corpo das Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand-orange text-white shadow-sm mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl p-3.5 text-sm shadow-md transition-all',
                    msg.role === 'user'
                      ? 'bg-brand-orange text-white rounded-br-xs'
                      : 'bg-white/10 text-white/95 rounded-bl-xs border border-white/10',
                  )}
                >
                  {/* Se estiver carregando ainda vazio */}
                  {!msg.content && isLoading ? (
                    <div className="flex items-center gap-2 text-white/70 py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
                      <span className="text-xs">Pensando e consultando acervo…</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">{renderMessageContent(msg.content)}</div>
                  )}

                  {/* Atalhos rápidos caso a mensagem cite aula ou catálogo */}
                  {msg.role === 'assistant' && isStudent && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2 text-[11px]">
                      <Link
                        to="/app"
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Ir para meus cursos
                      </Link>
                      <Link
                        to="/app/busca"
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <GraduationCap className="h-3 w-3" />
                        Buscar nas transcrições
                      </Link>
                    </div>
                  )}

                  {msg.role === 'assistant' && !isStudent && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2 text-[11px]">
                      <Link
                        to="/cursos"
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver catálogo de cursos
                      </Link>
                      <a
                        href="/#clube"
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-white/80 hover:bg-brand-orange hover:text-white transition"
                      >
                        <Sparkles className="h-3 w-3" />
                        Conhecer o Clube das Pílulas
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
            <div className="border-t border-white/5 bg-white/[0.02] p-3">
              <p className="mb-2 text-[11px] font-semibold text-white/50">
                Sugestões de perguntas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-left text-[11px] text-white/75 hover:border-brand-orange hover:bg-brand-orange/20 hover:text-white transition disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé / Input de Mensagem */}
          <div className="border-t border-white/10 bg-brand-navy p-3 sm:p-4">
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
                  isStudent
                    ? 'Tire sua dúvida sobre uma aula ou módulo…'
                    : 'Pergunte sobre os cursos, mentorias ou o Clube…'
                }
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40',
                  'focus:border-brand-orange focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-brand-orange transition',
                )}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="h-10 w-10 shrink-0 rounded-2xl bg-brand-orange hover:bg-brand-orange-dark text-white p-0 shadow-md transition disabled:opacity-40"
                aria-label="Enviar mensagem"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="mt-2 text-center text-[10px] text-white/40">
              Respostas baseadas no acervo oficial da Pílulas de Desenvolvimento.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
