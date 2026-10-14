import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  GraduationCap,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { LoadingScreen } from '@/components/LoadingScreen'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { CommunityReplyRecord, CommunityTopicRecord } from '@/lib/types'
import {
  deleteCommunityReply,
  deleteCommunityTopic,
  listPendingModerationItems,
  moderateReply,
  moderateTopic,
} from '@/services/community'

export default function AdminModeration() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'topics' | 'replies'>('topics')

  const [pendingTopics, setPendingTopics] = useState<CommunityTopicRecord[]>([])
  const [pendingReplies, setPendingReplies] = useState<CommunityReplyRecord[]>([])

  // Modal de Rejeição (com motivo opcional)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectItemType, setRejectItemType] = useState<'topic' | 'reply'>('topic')
  const [rejectItemId, setRejectItemId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const { topics, replies } = await listPendingModerationItems()
      setPendingTopics(topics)
      setPendingReplies(replies)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar itens pendentes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Aprovando tópico
  const handleApproveTopic = async (topicId: string) => {
    try {
      await moderateTopic(topicId, 'approved')
      toast({ title: 'Tópico aprovado e publicado com sucesso!' })
      setPendingTopics((prev) => prev.filter((t) => t.id !== topicId))
    } catch (err) {
      console.error(err)
      toast({ title: 'Falha ao aprovar tópico', variant: 'destructive' })
    }
  }

  // Aprovando resposta
  const handleApproveReply = async (replyId: string) => {
    try {
      await moderateReply(replyId, 'approved')
      toast({ title: 'Comentário aprovado e publicado com sucesso!' })
      setPendingReplies((prev) => prev.filter((r) => r.id !== replyId))
    } catch (err) {
      console.error(err)
      toast({ title: 'Falha ao aprovar comentário', variant: 'destructive' })
    }
  }

  // Abrir modal de rejeição
  const openRejectModal = (type: 'topic' | 'reply', id: string) => {
    setRejectItemType(type)
    setRejectItemId(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  // Confirmar rejeição
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectItemId) return

    setProcessing(true)
    try {
      if (rejectItemType === 'topic') {
        await moderateTopic(rejectItemId, 'rejected', rejectReason)
        setPendingTopics((prev) => prev.filter((t) => t.id !== rejectItemId))
      } else {
        await moderateReply(rejectItemId, 'rejected', rejectReason)
        setPendingReplies((prev) => prev.filter((r) => r.id !== rejectItemId))
      }

      toast({ title: 'Item marcado como não aprovado.' })
      setRejectModalOpen(false)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao rejeitar item', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  // Excluir definitivamente
  const handleDeleteItem = async (type: 'topic' | 'reply', id: string) => {
    if (!confirm('Deseja excluir definitivamente este item do banco de dados?')) return
    try {
      if (type === 'topic') {
        await deleteCommunityTopic(id)
        setPendingTopics((prev) => prev.filter((t) => t.id !== id))
      } else {
        await deleteCommunityReply(id)
        setPendingReplies((prev) => prev.filter((r) => r.id !== id))
      }
      toast({ title: 'Item excluído com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao excluir item', variant: 'destructive' })
    }
  }

  const formatWhen = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return dateStr
    }
  }

  if (loading) return <LoadingScreen label="Carregando fila de moderação…" />

  const totalPending = pendingTopics.length + pendingReplies.length

  return (
    <div className="route-page bg-brand-sand py-10">
      <div className="container-site space-y-8">
        {/* Topo da página */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
              <ShieldCheck className="h-4 w-4" /> Gestão da Comunidade
            </span>
            <h1 className="section-title mt-3 text-3xl font-extrabold sm:text-4xl text-brand-navy">
              Fila de Moderação da Comunidade
            </h1>
            <p className="mt-2 text-sm text-brand-muted max-w-2xl">
              Avalie e aprove tópicos e respostas criados pelos alunos antes de liberá-los no feed
              público da Comunidade Pílulas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-brand-border bg-white text-xs font-bold text-brand-navy hover:bg-brand-subtle"
            >
              <Link to="/app/comunidade" target="_blank">
                <Users className="mr-1.5 h-3.5 w-3.5 text-brand-orange" />
                Ver comunidade no app
                <ArrowRight className="ml-1 h-3 w-3 opacity-60" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Card Resumo do Status da Fila */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-5 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Total na Fila
            </span>
            <strong className="mt-2 block text-3xl font-extrabold text-brand-navy">
              {totalPending}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">
              Aguardando análise da equipe para publicação
            </p>
          </div>

          <div className="surface-card p-5 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Tópicos Pendentes
            </span>
            <strong className="mt-2 block text-3xl font-extrabold text-brand-navy">
              {pendingTopics.length}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">Novas discussões abertas por alunos</p>
          </div>

          <div className="surface-card p-5 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Respostas Pendentes
            </span>
            <strong className="mt-2 block text-3xl font-extrabold text-brand-navy">
              {pendingReplies.length}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">Comentários em tópicos existentes</p>
          </div>
        </div>

        {/* Abas: Tópicos Pendentes vs Respostas Pendentes */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'topics' | 'replies')}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
              <TabsList className="bg-brand-subtle p-1 rounded-xl">
                <TabsTrigger
                  value="topics"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-brand-navy"
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Tópicos ({pendingTopics.length})
                </TabsTrigger>
                <TabsTrigger
                  value="replies"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-brand-navy"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Respostas ({pendingReplies.length})
                </TabsTrigger>
              </TabsList>

              <Badge
                variant="outline"
                className={
                  totalPending > 0
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }
              >
                {totalPending > 0 ? (
                  <>
                    <Clock className="mr-1 h-3 w-3 text-amber-600" /> Moderação pendente
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3 text-emerald-600" /> Fila zerada!
                  </>
                )}
              </Badge>
            </div>
          </Tabs>

          {/* TAB 1: TÓPICOS PENDENTES */}
          {activeTab === 'topics' && (
            <div className="space-y-4">
              {pendingTopics.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 opacity-80" />
                  <h3 className="mt-3 font-extrabold text-brand-navy text-base">
                    Nenhum tópico aguardando aprovação
                  </h3>
                  <p className="mt-1 text-xs text-brand-muted">
                    Todos os tópicos enviados pelos alunos foram moderados.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border bg-white">
                  {pendingTopics.map((topic) => {
                    const author = topic.expand?.user
                    const authorName = author?.name || 'Aluno'
                    const courseTitle = topic.expand?.course?.title || 'Comunidade Geral'

                    return (
                      <article
                        key={topic.id}
                        className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-5 hover:bg-brand-sand/20 transition"
                      >
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-brand-navy">
                              {authorName}
                            </span>
                            <span className="text-[11px] text-brand-muted">
                              ({author?.email || 'sem email'})
                            </span>
                            <span className="text-[11px] text-brand-muted">·</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-brand-subtle text-brand-navy"
                            >
                              <GraduationCap className="mr-1 h-3 w-3 text-brand-orange" />
                              {courseTitle}
                            </Badge>
                            <span className="text-[10px] text-brand-muted">
                              {formatWhen(topic.created)}
                            </span>
                          </div>

                          <h3 className="text-base font-extrabold text-brand-navy">
                            {topic.title}
                          </h3>

                          <div className="text-xs text-brand-text/90 leading-relaxed whitespace-pre-wrap bg-brand-sand/40 p-3 rounded-xl border border-brand-border/60">
                            {topic.content}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex sm:flex-col items-center gap-2 shrink-0 justify-end">
                          <Button
                            onClick={() => handleApproveTopic(topic.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 h-9 w-full shadow-xs"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openRejectModal('topic', topic.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold px-4 h-9 w-full"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" /> Rejeitar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteItem('topic', topic.id)}
                            className="text-gray-400 hover:text-red-600 h-8 text-[11px] w-full"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESPOSTAS PENDENTES */}
          {activeTab === 'replies' && (
            <div className="space-y-4">
              {pendingReplies.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 opacity-80" />
                  <h3 className="mt-3 font-extrabold text-brand-navy text-base">
                    Nenhuma resposta aguardando aprovação
                  </h3>
                  <p className="mt-1 text-xs text-brand-muted">
                    Todas as respostas recentes foram revisadas.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border bg-white">
                  {pendingReplies.map((reply) => {
                    const author = reply.expand?.user
                    const authorName = author?.name || 'Aluno'
                    const topicTitle = reply.expand?.topic?.title || 'Tópico de discussão'

                    return (
                      <article
                        key={reply.id}
                        className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-5 hover:bg-brand-sand/20 transition"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-brand-navy">
                              {authorName}
                            </span>
                            <span className="text-[11px] text-brand-muted">
                              em resposta ao tópico:
                            </span>
                            <strong className="text-xs text-brand-orange truncate max-w-md">
                              "{topicTitle}"
                            </strong>
                            <span className="text-[10px] text-brand-muted">
                              {formatWhen(reply.created)}
                            </span>
                          </div>

                          <div className="text-xs text-brand-text/90 leading-relaxed whitespace-pre-wrap bg-brand-sand/40 p-3 rounded-xl border border-brand-border/60">
                            {reply.content}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex sm:flex-col items-center gap-2 shrink-0 justify-end">
                          <Button
                            onClick={() => handleApproveReply(reply.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 h-9 w-full shadow-xs"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openRejectModal('reply', reply.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold px-4 h-9 w-full"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" /> Rejeitar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteItem('reply', reply.id)}
                            className="text-gray-400 hover:text-red-600 h-8 text-[11px] w-full"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: MOTIVO DA REJEIÇÃO */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-brand-navy flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejeitar postagem
            </DialogTitle>
            <DialogDescription className="text-xs text-brand-muted">
              Ao rejeitar, o conteúdo não aparecerá para outros alunos. O autor verá o status "Não
              aprovado" e a justificativa opcional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReject} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason" className="text-xs font-bold">
                Motivo da não aprovação (opcional)
              </Label>
              <Input
                id="reject-reason"
                placeholder="Ex: Conteúdo fora do tema do curso, spam ou linguajar inadequado"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={250}
              />
              <p className="text-[10px] text-brand-muted">
                Ficará visível apenas para o autor do post na tela de comunidade dele.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={processing}
                variant="destructive"
                className="font-bold"
              >
                {processing ? 'Processando…' : 'Confirmar rejeição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
