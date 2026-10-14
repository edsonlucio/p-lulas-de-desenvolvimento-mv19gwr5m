import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type {
  CommunityReplyRecord,
  CommunityTopicRecord,
  CourseRecord,
  EnrollmentRecord,
  ModerationStatus,
} from '@/lib/types'
import {
  createCommunityReply,
  createCommunityTopic,
  listCommunityReplies,
  listCommunityTopics,
} from '@/services/community'
import { listEnrollments } from '@/services/student'

export default function StudentCommunity() {
  const { user } = useAuth()

  // Estado geral
  const [loading, setLoading] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState<CourseRecord[]>([])
  const [activeTab, setActiveTab] = useState<'geral' | string>('geral') // 'geral' ou courseId

  // Lista de tópicos
  const [topics, setTopics] = useState<CommunityTopicRecord[]>([])
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopicRecord | null>(null)
  const [replies, setReplies] = useState<CommunityReplyRecord[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)

  // Modais de Criação
  const [newTopicModalOpen, setNewTopicModalOpen] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicContent, setNewTopicContent] = useState('')
  const [newTopicCourseId, setNewTopicCourseId] = useState<string>('geral')
  const [submittingTopic, setSubmittingTopic] = useState(false)

  // Formulário de resposta
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // 1. Carrega cursos matriculados do aluno
  const loadUserCourses = useCallback(async () => {
    if (!user) return
    try {
      const enrollments = await listEnrollments(user.id)
      const activeEnrollments = enrollments.filter((e) => e.situacao === 'ativa')

      const coursesLoaded = await Promise.all(
        activeEnrollments.map(async (e) => {
          try {
            return await pb.collection<CourseRecord>('courses').getOne(e.course)
          } catch (_) {
            return null
          }
        }),
      )
      setEnrolledCourses(coursesLoaded.filter(Boolean) as CourseRecord[])
    } catch (err) {
      console.error('Erro ao buscar matrículas:', err)
    }
  }, [user])

  // 2. Carrega tópicos da aba selecionada
  const loadTopics = useCallback(async () => {
    try {
      const courseId = activeTab === 'geral' ? null : activeTab
      const items = await listCommunityTopics({ courseId })
      setTopics(items)

      // Se havia um tópico selecionado, atualiza-o se ainda existir na lista
      if (selectedTopic) {
        const updated = items.find((t) => t.id === selectedTopic.id)
        if (updated) setSelectedTopic(updated)
      }
    } catch (err) {
      console.error('Erro ao buscar tópicos:', err)
      toast({
        title: 'Erro ao carregar tópicos',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedTopic])

  // Inicialização
  useEffect(() => {
    void loadUserCourses()
  }, [loadUserCourses])

  useEffect(() => {
    setLoading(true)
    void loadTopics()
  }, [activeTab])

  // Carrega respostas ao selecionar um tópico
  useEffect(() => {
    if (!selectedTopic) {
      setReplies([])
      return
    }

    let isCancelled = false
    setLoadingReplies(true)

    listCommunityReplies(selectedTopic.id)
      .then((data) => {
        if (!isCancelled) setReplies(data)
      })
      .catch((err) => {
        console.error('Erro ao buscar respostas:', err)
      })
      .finally(() => {
        if (!isCancelled) setLoadingReplies(false)
      })

    return () => {
      isCancelled = true
    }
  }, [selectedTopic?.id])

  // Envio de novo tópico
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!newTopicTitle.trim() || !newTopicContent.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o título e o conteúdo da mensagem.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingTopic(true)
    try {
      const targetCourse = newTopicCourseId === 'geral' ? null : newTopicCourseId
      await createCommunityTopic({
        user: user.id,
        course: targetCourse,
        title: newTopicTitle,
        content: newTopicContent,
      })

      toast({
        title: 'Tópico enviado para moderação! ⏳',
        description:
          'Seu post foi criado e está em análise. Assim que a moderação aprovar, ele ficará visível para toda a comunidade.',
      })

      setNewTopicModalOpen(false)
      setNewTopicTitle('')
      setNewTopicContent('')
      void loadTopics()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao criar tópico.'
      toast({
        title: 'Erro ao publicar tópico',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSubmittingTopic(false)
    }
  }

  // Envio de nova resposta
  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTopic) return

    if (!replyContent.trim()) {
      toast({
        title: 'Escreva sua resposta',
        description: 'A resposta não pode estar vazia.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingReply(true)
    try {
      await createCommunityReply({
        topic: selectedTopic.id,
        user: user.id,
        content: replyContent,
      })

      toast({
        title: 'Comentário enviado para moderação! ⏳',
        description:
          'Sua resposta foi registrada e ficará visível para todos após a aprovação da moderação.',
      })

      setReplyContent('')
      // Recarrega respostas do tópico selecionado
      const updatedReplies = await listCommunityReplies(selectedTopic.id)
      setReplies(updatedReplies)
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao enviar comentário',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingReply(false)
    }
  }

  // Helper de badge de moderação
  const renderStatusBadge = (status: ModerationStatus, notes?: string) => {
    if (status === 'approved') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300 text-[10px] font-bold">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Publicado
        </Badge>
      )
    }
    if (status === 'pending') {
      return (
        <Badge
          variant="outline"
          className="border-amber-400 bg-amber-50 text-amber-800 text-[10px] font-bold"
          title="Visível apenas para você enquanto aguarda aprovação da equipe"
        >
          <Clock className="mr-1 h-3 w-3 text-amber-600" /> Em análise
        </Badge>
      )
    }
    return (
      <Badge
        variant="destructive"
        className="bg-red-500/15 text-red-700 border-red-300 text-[10px] font-bold"
        title={notes ? `Motivo: ${notes}` : 'Não aprovado pela moderação'}
      >
        <XCircle className="mr-1 h-3 w-3" /> Não aprovado
      </Badge>
    )
  }

  const formatWhen = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return dateStr
    }
  }

  // Nome do espaço ativo
  const activeCourseName = useMemo(() => {
    if (activeTab === 'geral') return 'Comunidade Geral'
    const found = enrolledCourses.find((c) => c.id === activeTab)
    return found ? found.title : 'Espaço do Curso'
  }, [activeTab, enrolledCourses])

  if (loading && topics.length === 0) {
    return <LoadingScreen label="Carregando a Comunidade Pílulas…" />
  }

  return (
    <div className="route-page bg-brand-sand py-8 sm:py-12">
      <div className="container-site space-y-6">
        {/* Cabeçalho da Comunidade */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
              <Users className="h-4 w-4" /> Espaço de Troca & Aprendizado
            </span>
            <h1 className="section-title mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Comunidade Pílulas
            </h1>
            <p className="mt-1 text-sm text-brand-muted max-w-2xl">
              Tire dúvidas, compartilhe seus resultados práticos e conecte-se com outros alunos.
              Todas as postagens passam por moderação prévia para assegurar um ambiente seguro e
              construtivo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setNewTopicCourseId(activeTab)
                setNewTopicModalOpen(true)
              }}
              className="rounded-full bg-brand-orange px-5 text-xs font-extrabold text-white shadow-md hover:bg-brand-orange-dark"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Criar novo tópico
            </Button>
          </div>
        </div>

        {/* Abas: Comunidade Geral + Cursos com matrícula ativa */}
        <div className="border-b border-brand-border bg-white rounded-2xl p-2 shadow-xs">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
              <TabsTrigger
                value="geral"
                className="rounded-xl px-4 py-2 text-xs font-bold text-brand-navy data-[state=active]:bg-brand-navy data-[state=active]:text-white transition"
              >
                <Compass className="mr-1.5 h-3.5 w-3.5" />
                Geral (Todos os alunos)
              </TabsTrigger>

              {enrolledCourses.map((course) => (
                <TabsTrigger
                  key={course.id}
                  value={course.id}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-brand-navy data-[state=active]:bg-brand-navy data-[state=active]:text-white transition"
                >
                  <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-brand-orange" />
                  {course.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Aviso de Moderação Prévia / Transparência */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950">
          <ShieldAlert className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-bold">Política de Moderação Prévia</p>
            <p className="mt-0.5 text-blue-900/80">
              Para manter as discussões focadas e com alto valor educativo, novos tópicos e
              respostas são analisados por nossa equipe antes de ficarem visíveis para os demais
              alunos. Você sempre poderá ver seus próprios posts em análise na sua lista.
            </p>
          </div>
        </div>

        {/* Layout do Feed: Lista de Tópicos + Painel de Leitura/Respostas */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] items-start">
          {/* Coluna 1: Lista de Tópicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-muted">
                {activeCourseName} ({topics.length})
              </h2>
              <span className="text-[11px] text-brand-muted">Ordenado por recentes</span>
            </div>

            {topics.length === 0 ? (
              <div className="surface-card p-10 text-center rounded-3xl border border-dashed border-brand-border">
                <MessageSquare className="mx-auto h-10 w-10 text-brand-muted opacity-40" />
                <h3 className="mt-3 font-extrabold text-brand-navy text-sm">
                  Nenhum tópico neste espaço ainda
                </h3>
                <p className="mt-1 text-xs text-brand-muted max-w-xs mx-auto">
                  Seja o primeiro a abrir uma discussão ou compartilhar uma dúvida prática com os
                  colegas!
                </p>
                <Button
                  onClick={() => {
                    setNewTopicCourseId(activeTab)
                    setNewTopicModalOpen(true)
                  }}
                  className="mt-4 rounded-full bg-brand-orange text-xs text-white"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Iniciar conversa
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id
                  const isAuthor = user?.id === topic.user
                  const author = topic.expand?.user
                  const authorInitials =
                    author?.name
                      ?.split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'PD'

                  const avatarUrl =
                    author && author.avatar
                      ? pb.files.getURL(author, author.avatar, { thumb: '60x60' })
                      : ''

                  return (
                    <article
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className={`surface-card p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? 'border-brand-orange shadow-md ring-2 ring-brand-orange/20 bg-white'
                          : 'border-brand-border hover:border-brand-orange/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={avatarUrl} alt={author?.name} />
                            <AvatarFallback className="bg-brand-orange text-[10px] font-extrabold text-white">
                              {authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-brand-navy truncate">
                              {author?.name || 'Aluno Pílulas'}
                              {isAuthor && (
                                <span className="ml-1 text-[10px] font-normal text-brand-muted">
                                  (Você)
                                </span>
                              )}
                            </span>
                            <span className="block text-[10px] text-brand-muted">
                              {formatWhen(topic.created)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {topic.pinned && (
                            <Badge
                              variant="secondary"
                              className="bg-brand-navy text-white text-[9px] font-extrabold"
                            >
                              <Pin className="mr-0.5 h-2.5 w-2.5" /> Fixo
                            </Badge>
                          )}
                          {isAuthor && renderStatusBadge(topic.status, topic.moderation_notes)}
                        </div>
                      </div>

                      <h3 className="mt-3 text-sm font-extrabold text-brand-navy leading-snug line-clamp-2">
                        {topic.title}
                      </h3>

                      <p className="mt-1.5 text-xs text-brand-text/75 line-clamp-2 leading-relaxed">
                        {topic.content}
                      </p>

                      {/* Notificação especial caso esteja não aprovado para o autor */}
                      {isAuthor && topic.status === 'rejected' && (
                        <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] text-red-800 flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Observação da Moderação:</strong>{' '}
                            {topic.moderation_notes ||
                              'Este conteúdo infringiu as diretrizes da comunidade.'}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-brand-border/60 flex items-center justify-between text-[11px] text-brand-muted">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5 text-brand-orange" />
                          {topic.replies_count || 0} resposta
                          {(topic.replies_count || 0) !== 1 ? 's' : ''}
                        </span>

                        {topic.course ? (
                          <span className="truncate max-w-[150px] font-semibold text-brand-navy">
                            {topic.expand?.course?.title || 'Curso'}
                          </span>
                        ) : (
                          <span className="font-semibold text-brand-muted">Geral</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          {/* Coluna 2: Detalhe do Tópico Selecionado & Comentários */}
          <div className="lg:sticky lg:top-24">
            {selectedTopic ? (
              <div className="surface-card p-6 sm:p-7 rounded-3xl border border-brand-border bg-white shadow-sm space-y-6">
                {/* Cabeçalho do Tópico Aberto */}
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-brand-navy text-xs font-extrabold text-white">
                          {selectedTopic.expand?.user?.name
                            ?.split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'PD'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-xs font-bold text-brand-navy">
                          {selectedTopic.expand?.user?.name || 'Aluno'}
                        </h4>
                        <span className="text-[10px] text-brand-muted">
                          Publicado em {formatWhen(selectedTopic.created)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user?.id === selectedTopic.user &&
                        renderStatusBadge(selectedTopic.status, selectedTopic.moderation_notes)}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedTopic(null)}
                        className="h-8 w-8 text-brand-muted hover:text-brand-navy lg:hidden"
                        title="Fechar visualização"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-brand-navy leading-snug">
                    {selectedTopic.title}
                  </h2>

                  <div className="mt-3 text-sm text-brand-text leading-relaxed whitespace-pre-wrap">
                    {selectedTopic.content}
                  </div>
                </div>

                {/* Seção de Respostas */}
                <div className="space-y-4 border-t border-brand-border pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-brand-orange" />
                      Respostas ({replies.length})
                    </h3>
                    <span className="text-[10px] text-brand-muted">Moderação prévia ativa</span>
                  </div>

                  {loadingReplies ? (
                    <div className="py-6 text-center text-xs text-brand-muted">
                      Carregando respostas…
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-brand-border p-6 text-center text-xs text-brand-muted">
                      Nenhuma resposta publicada ainda. Deixe a sua contribuição abaixo!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {replies.map((reply) => {
                        const isReplyAuthor = user?.id === reply.user
                        const replyUser = reply.expand?.user
                        const replyInitials =
                          replyUser?.name
                            ?.split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'AL'

                        return (
                          <div
                            key={reply.id}
                            className="rounded-2xl border border-brand-border bg-brand-subtle/30 p-3.5 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-brand-orange text-[9px] font-extrabold text-white">
                                    {replyInitials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-bold text-brand-navy">
                                  {replyUser?.name || 'Aluno'}
                                  {isReplyAuthor && (
                                    <span className="ml-1 text-[10px] font-normal text-brand-muted">
                                      (Você)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-brand-muted">
                                  {formatWhen(reply.created)}
                                </span>
                                {isReplyAuthor &&
                                  renderStatusBadge(reply.status, reply.moderation_notes)}
                              </div>
                            </div>

                            <p className="text-brand-text leading-relaxed pl-8">{reply.content}</p>

                            {isReplyAuthor && reply.status === 'rejected' && (
                              <p className="text-[10px] text-red-600 pl-8 font-medium">
                                Motivo: {reply.moderation_notes || 'Não atendeu às diretrizes.'}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Caixa para Adicionar Resposta */}
                  <form onSubmit={handleCreateReply} className="pt-2 space-y-2.5">
                    <Textarea
                      rows={3}
                      placeholder="Escreva sua resposta ou contribuição para o tópico..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={submittingReply}
                      className="text-xs rounded-2xl resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-brand-muted">
                        Passará por aprovação antes de ser exibido a todos.
                      </p>
                      <Button
                        type="submit"
                        disabled={submittingReply || !replyContent.trim()}
                        className="rounded-full bg-brand-orange px-4 text-xs font-bold text-white hover:bg-brand-orange-dark h-8"
                      >
                        {submittingReply ? (
                          'Enviando…'
                        ) : (
                          <>
                            <Send className="mr-1.5 h-3 w-3" /> Responder
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="surface-card p-10 rounded-3xl border border-brand-border text-center bg-white/60">
                <Compass className="mx-auto h-12 w-12 text-brand-muted opacity-40" />
                <h3 className="mt-3 font-extrabold text-brand-navy">
                  Selecione um tópico para ler e responder
                </h3>
                <p className="mt-1 text-xs text-brand-muted max-w-sm mx-auto">
                  Clique em qualquer item da lista ao lado para ver a conversa completa, ler as
                  contribuições dos colegas e participar do debate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CRIAR NOVO TÓPICO */}
      <Dialog open={newTopicModalOpen} onOpenChange={setNewTopicModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-brand-navy flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-orange" />
              Novo Tópico na Comunidade
            </DialogTitle>
            <DialogDescription className="text-xs text-brand-muted">
              Compartilhe sua dúvida, case ou reflexão. O post passará pela moderação da equipe
              antes de ser publicado na comunidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTopic} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="topic-space" className="text-xs font-bold">
                Espaço de Discussão *
              </Label>
              <Select value={newTopicCourseId} onValueChange={setNewTopicCourseId}>
                <SelectTrigger id="topic-space">
                  <SelectValue placeholder="Selecione o espaço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Comunidade Geral (Aberto a todos)</SelectItem>
                  {enrolledCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Curso: {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic-title" className="text-xs font-bold">
                Título do Tópico *
              </Label>
              <Input
                id="topic-title"
                placeholder="Ex: Como vocês organizam o funil de vendas na prática?"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                required
                maxLength={180}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic-content" className="text-xs font-bold">
                Mensagem / Conteúdo *
              </Label>
              <Textarea
                id="topic-content"
                rows={5}
                placeholder="Descreva seu raciocínio, contexto, dúvida ou experiência para enriquecer a discussão..."
                value={newTopicContent}
                onChange={(e) => setNewTopicContent(e.target.value)}
                required
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Lembrete:</strong> Seu post ficará com status <em>"Em análise"</em> até ser
                aprovado por um moderador.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTopicModalOpen(false)}
                disabled={submittingTopic}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingTopic}
                className="bg-brand-orange text-white hover:bg-brand-orange-dark font-extrabold"
              >
                {submittingTopic ? 'Enviando…' : 'Enviar para moderação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
