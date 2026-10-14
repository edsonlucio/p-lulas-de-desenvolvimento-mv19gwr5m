import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type {
  ClubCardStatus,
  ClubDailyCardRecord,
  ClubMemberRecord,
  ClubMemberStatus,
  UserRecord,
} from '@/lib/types'
import {
  addClubMember,
  createClubDailyCard,
  deleteClubDailyCard,
  listClubDailyCards,
  listClubMembers,
  listUsersForClub,
  removeClubMember,
  updateClubDailyCard,
  updateClubMember,
} from '@/services/club'

// Datas do ciclo de leitura
const CYCLE_START_DATE = new Date('2026-10-05T00:00:00')
const CYCLE_MEETING_DATE = new Date('2026-11-03T20:00:00')

export default function AdminClub() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<ClubMemberRecord[]>([])
  const [cards, setCards] = useState<ClubDailyCardRecord[]>([])
  const [allUsers, setAllUsers] = useState<UserRecord[]>([])

  // Modal Card Diário
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<ClubDailyCardRecord | null>(null)
  const [cardFormDate, setCardFormDate] = useState('')
  const [cardFormTitle, setCardFormTitle] = useState('')
  const [cardFormPagesFrom, setCardFormPagesFrom] = useState('')
  const [cardFormPagesTo, setCardFormPagesTo] = useState('')
  const [cardFormPergunta, setCardFormPergunta] = useState('')
  const [cardFormResumo, setCardFormResumo] = useState('')
  const [cardFormProvocacao, setCardFormProvocacao] = useState('')
  const [cardFormStatus, setCardFormStatus] = useState<ClubCardStatus>('agendado')
  const [savingCard, setSavingCard] = useState(false)

  // Modal Adicionar Membro
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberNotes, setMemberNotes] = useState('')
  const [savingMember, setSavingMember] = useState(false)

  // Carregar dados
  const loadData = async () => {
    try {
      const [membersRes, cardsRes, usersRes] = await Promise.all([
        listClubMembers(),
        listClubDailyCards(),
        listUsersForClub(),
      ])
      setMembers(membersRes)
      setCards(cardsRes)
      setAllUsers(usersRes)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados do Clube',
        description: 'Verifique se você possui permissões de administrador.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cálculos de KPIs
  const now = new Date()

  // Dias decorridos desde 05/10/2026
  const elapsedDays = useMemo(() => {
    const diff = now.getTime() - CYCLE_START_DATE.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }, [now])

  // Contagem regressiva até 03/11/2026
  const daysUntilMeeting = useMemo(() => {
    const diff = CYCLE_MEETING_DATE.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }, [now])

  const activeMembersCount = useMemo(
    () => members.filter((m) => m.status === 'ativo').length,
    [members],
  )
  const sentCardsCount = useMemo(() => cards.filter((c) => c.status === 'enviado').length, [cards])
  const scheduledCardsCount = useMemo(
    () => cards.filter((c) => c.status === 'agendado').length,
    [cards],
  )

  // Filtro de alunos disponíveis para adicionar como membro
  const existingMemberUserIds = useMemo(() => new Set(members.map((m) => m.user)), [members])

  const availableUsers = useMemo(() => {
    return allUsers
      .filter((u) => !existingMemberUserIds.has(u.id))
      .filter((u) => {
        if (!memberSearchQuery.trim()) return true
        const q = memberSearchQuery.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
  }, [allUsers, existingMemberUserIds, memberSearchQuery])

  // Abrir modal de criação de card
  const handleOpenCreateCard = () => {
    setEditingCard(null)
    const todayStr = new Date().toISOString().split('T')[0]
    setCardFormDate(todayStr)
    setCardFormTitle('')
    setCardFormPagesFrom('')
    setCardFormPagesTo('')
    setCardFormPergunta('')
    setCardFormResumo('')
    setCardFormProvocacao('')
    setCardFormStatus('agendado')
    setCardModalOpen(true)
  }

  // Abrir modal de edição de card
  const handleOpenEditCard = (card: ClubDailyCardRecord) => {
    setEditingCard(card)
    // pocketbase date ex: "2026-10-05 09:00:00.000Z" -> "2026-10-05"
    const datePart = card.date ? card.date.substring(0, 10) : ''
    setCardFormDate(datePart)
    setCardFormTitle(card.title || '')
    setCardFormPagesFrom(card.pages_from ? String(card.pages_from) : '')
    setCardFormPagesTo(card.pages_to ? String(card.pages_to) : '')
    setCardFormPergunta(card.pergunta || '')
    setCardFormResumo(card.resumo || '')
    setCardFormProvocacao(card.provocacao || '')
    setCardFormStatus(card.status)
    setCardModalOpen(true)
  }

  // Salvar card
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardFormDate || !cardFormPergunta || !cardFormResumo || !cardFormProvocacao) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Data, pergunta, resumo e provocação são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setSavingCard(true)
    try {
      const payload = {
        date: `${cardFormDate} 09:00:00.000Z`,
        title: cardFormTitle.trim() || undefined,
        pages_from: cardFormPagesFrom ? parseInt(cardFormPagesFrom, 10) : undefined,
        pages_to: cardFormPagesTo ? parseInt(cardFormPagesTo, 10) : undefined,
        pergunta: cardFormPergunta.trim(),
        resumo: cardFormResumo.trim(),
        provocacao: cardFormProvocacao.trim(),
        status: cardFormStatus,
      }

      if (editingCard) {
        await updateClubDailyCard(editingCard.id, payload)
        toast({ title: 'Card atualizado com sucesso!' })
      } else {
        await createClubDailyCard(payload)
        toast({ title: 'Card criado com sucesso!' })
      }

      setCardModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      const message =
        err instanceof Error ? err.message : 'Verifique se já não existe um card para esta data.'
      toast({
        title: 'Erro ao salvar card',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSavingCard(false)
    }
  }

  // Excluir card
  const handleDeleteCard = async (id: string) => {
    if (!confirm('Deseja realmente remover este card da agenda do Clube?')) return
    try {
      await deleteClubDailyCard(id)
      toast({ title: 'Card removido com sucesso.' })
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao remover card',
        variant: 'destructive',
      })
    }
  }

  // Adicionar membro
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) {
      toast({
        title: 'Selecione um aluno',
        description: 'Escolha um aluno cadastrado para torná-lo membro do clube.',
        variant: 'destructive',
      })
      return
    }

    setSavingMember(true)
    try {
      await addClubMember({
        user: selectedUserId,
        status: 'ativo',
        notes: memberNotes.trim() || undefined,
      })
      toast({ title: 'Membro adicionado com sucesso!' })
      setMemberModalOpen(false)
      setSelectedUserId('')
      setMemberNotes('')
      setMemberSearchQuery('')
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao adicionar membro',
        description: 'Verifique se o usuário já não faz parte do clube.',
        variant: 'destructive',
      })
    } finally {
      setSavingMember(false)
    }
  }

  // Alternar status do membro (ativo/inativo)
  const handleToggleMemberStatus = async (member: ClubMemberRecord) => {
    const nextStatus: ClubMemberStatus = member.status === 'ativo' ? 'inativo' : 'ativo'
    try {
      await updateClubMember(member.id, { status: nextStatus })
      toast({
        title: `Membro ${nextStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso.`,
      })
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)))
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  // Remover membro
  const handleRemoveMember = async (id: string) => {
    if (!confirm('Deseja remover este membro do Clube das Pílulas?')) return
    try {
      await removeClubMember(id)
      toast({ title: 'Membro removido do clube.' })
      setMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao remover membro', variant: 'destructive' })
    }
  }

  // Determinar rótulo de status visual para o card do dia
  const getCardStatusBadge = (card: ClubDailyCardRecord) => {
    const cardDateStr = card.date.substring(0, 10)
    const todayStr = new Date().toISOString().substring(0, 10)

    if (card.status === 'enviado') {
      return (
        <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 border-emerald-300">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Enviado
        </Badge>
      )
    }

    if (cardDateStr === todayStr) {
      return (
        <Badge className="bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm">
          <Send className="mr-1 h-3 w-3" /> Hoje
        </Badge>
      )
    }

    if (cardDateStr < todayStr) {
      return (
        <Badge variant="destructive" className="bg-red-500/15 text-red-700 border-red-300">
          <Clock className="mr-1 h-3 w-3" /> Atrasado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
        <Clock className="mr-1 h-3 w-3" /> Agendado
      </Badge>
    )
  }

  const formatCardDate = (dateStr: string) => {
    try {
      // Cria a data sem distorção de fuso
      const [year, month, day] = dateStr.substring(0, 10).split('-')
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
      return {
        formatted: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        day,
        monthName: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      }
    } catch (_) {
      return { formatted: dateStr, weekday: '', day: '', monthName: '' }
    }
  }

  if (loading) return <LoadingScreen label="Carregando painel do Clube das Pílulas…" />

  return (
    <div className="route-page bg-brand-sand py-10">
      <div className="container-site space-y-8">
        {/* Cabeçalho da página */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="eyebrow border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
              <BookOpen className="h-4 w-4" /> Gestão da Comunidade & Leitura
            </span>
            <h1 className="section-title mt-3 text-3xl font-extrabold sm:text-4xl text-brand-navy">
              Painel do Clube das Pílulas
            </h1>
            <p className="mt-2 text-sm text-brand-muted max-w-2xl">
              Acompanhe os KPIs do clube de leitura, organize os cards diários do WhatsApp (seg–sáb)
              e gerencie os alunos participantes do livro <strong>Metanoia</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-brand-border bg-white text-xs font-bold text-brand-navy shadow-sm hover:bg-brand-subtle"
            >
              <a
                href="https://chat.whatsapp.com/GDwgDsxlgc56o0qOBM6r7o"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Grupo WhatsApp
                <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
              </a>
            </Button>
            <Button
              onClick={handleOpenCreateCard}
              className="rounded-full bg-brand-orange px-5 text-xs font-extrabold text-white shadow-sm hover:bg-brand-orange-dark"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Criar card do dia
            </Button>
          </div>
        </div>

        {/* 1. CARDS KPI NO TOPO */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Membros Ativos */}
          <article className="surface-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </span>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50">
                {members.length} cadastrados
              </Badge>
            </div>
            <strong className="mt-4 block text-3xl font-extrabold tabular-nums text-brand-navy">
              {activeMembersCount}
            </strong>
            <span className="mt-1 block text-xs font-semibold text-brand-muted">
              Membros ativos do clube
            </span>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-muted">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>Base engajada com a leitura</span>
            </div>
          </article>

          {/* Dias Decorridos */}
          <article className="surface-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                <Calendar className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-brand-muted">Início: 05/10</span>
            </div>
            <strong className="mt-4 block text-3xl font-extrabold tabular-nums text-brand-navy">
              {elapsedDays}
            </strong>
            <span className="mt-1 block text-xs font-semibold text-brand-muted">
              Dias de leitura decorridos
            </span>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
              <span>Rotina guiada no WhatsApp</span>
            </div>
          </article>

          {/* Encontro Virtual Contagem Regressiva */}
          <article className="surface-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-purple-500/10 text-purple-600">
                <Video className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-purple-600">03/11/2026</span>
            </div>
            <strong className="mt-4 block text-3xl font-extrabold tabular-nums text-brand-navy">
              {daysUntilMeeting > 0 ? `${daysUntilMeeting}d` : 'Hoje'}
            </strong>
            <span className="mt-1 block text-xs font-semibold text-brand-muted">
              {daysUntilMeeting >= 0 ? 'Dias até o encontro virtual' : 'Encontro virtual concluído'}
            </span>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-muted">
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              <span>Debate & alinhamento ao vivo</span>
            </div>
          </article>

          {/* Cards Enviados vs Agendados */}
          <article className="surface-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Send className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-emerald-600">{cards.length} no total</span>
            </div>
            <strong className="mt-4 block text-3xl font-extrabold tabular-nums text-brand-navy">
              {sentCardsCount}{' '}
              <span className="text-xl font-normal text-brand-muted">/ {cards.length}</span>
            </strong>
            <span className="mt-1 block text-xs font-semibold text-brand-muted">
              Cards enviados vs. agendados ({scheduledCardsCount} na fila)
            </span>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-muted">
              <CheckCircle2 className="mr-0.5 h-3.5 w-3.5 text-emerald-500" />
              <span>Consistência diária seg–sáb</span>
            </div>
          </article>
        </div>

        {/* 2. CALENDÁRIO DO CICLO (LINHA DO TEMPO / DESTAQUES) */}
        <section className="surface-card relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-brand-border pb-6">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                <BookOpen className="h-6 w-6" />
              </span>
              <div>
                <span className="eyebrow text-[11px]">Ciclo Atual de Leitura</span>
                <h2 className="text-xl font-extrabold text-brand-navy sm:text-2xl">
                  Metanoia — a chave está na sua mente
                </h2>
                <p className="text-xs text-brand-muted">
                  Por JB Carvalho · Meta: 7 a 8 páginas/dia
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-brand-navy text-white hover:bg-brand-navy px-3 py-1">
                Segunda a Sábado
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                Domingo = Descanso
              </Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {/* Marco 1: Início */}
            <div className="flex items-start gap-4 rounded-2xl border border-brand-border bg-brand-subtle/50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-orange/15 text-brand-orange font-bold text-sm">
                01
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Início da Leitura
                </span>
                <strong className="block text-base font-extrabold text-brand-navy">
                  05 de Outubro
                </strong>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Abertura do ciclo e largada das pílulas diárias
                </p>
              </div>
            </div>

            {/* Marco 2: Rotina */}
            <div className="flex items-start gap-4 rounded-2xl border border-brand-border bg-brand-subtle/50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-600 font-bold text-sm">
                02
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Rotina no WhatsApp
                </span>
                <strong className="block text-base font-extrabold text-brand-navy">
                  Seg–Sáb às 09:00
                </strong>
                <p className="mt-0.5 text-xs text-brand-muted">
                  1 pergunta + resumo de 7–8 págs + 1 provocação
                </p>
              </div>
            </div>

            {/* Marco 3: Encontro Virtual */}
            <div className="flex items-start gap-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-600 text-white font-bold text-sm">
                03
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Encontro Virtual ao Vivo
                </span>
                <strong className="block text-base font-extrabold text-purple-900">
                  03 de Novembro de 2026
                </strong>
                <p className="mt-0.5 text-xs text-purple-800">
                  {daysUntilMeeting > 0
                    ? `Faltam ${daysUntilMeeting} dias para o encontro!`
                    : 'Debate ao vivo com o mentor'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. AGENDA DOS CARDS DIÁRIOS */}
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
                  <Calendar className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-extrabold text-brand-navy">Agenda dos cards diários</h2>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                Conteúdos programados para disparo no WhatsApp com a estrutura completa da leitura.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateCard}
              className="rounded-full bg-brand-orange px-4 text-xs font-bold text-white hover:bg-brand-orange-dark"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar card
            </Button>
          </div>

          {cards.length === 0 ? (
            <div className="my-10 rounded-2xl border border-dashed border-brand-border p-10 text-center">
              <Calendar className="mx-auto h-10 w-10 text-brand-muted opacity-50" />
              <h3 className="mt-3 font-extrabold text-brand-navy">Nenhum card cadastrado ainda</h3>
              <p className="mt-1 text-xs text-brand-muted">
                Comece criando o primeiro card diário do WhatsApp para orientar a leitura.
              </p>
              <Button
                onClick={handleOpenCreateCard}
                className="mt-4 rounded-full bg-brand-orange text-xs text-white"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Criar card do dia
              </Button>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border bg-white">
              {cards.map((card) => {
                const dateMeta = formatCardDate(card.date)
                return (
                  <article
                    key={card.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-brand-sand/30 sm:flex-row sm:items-start sm:justify-between"
                  >
                    {/* Bloco de Data */}
                    <div className="flex items-start gap-3 sm:w-48 sm:shrink-0">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-navy text-white text-center">
                        <div>
                          <span className="block text-xs font-normal uppercase leading-tight opacity-75">
                            {dateMeta.weekday}
                          </span>
                          <strong className="block text-base font-extrabold leading-none">
                            {dateMeta.day}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-brand-navy">
                          {dateMeta.formatted}
                        </span>
                        <div className="mt-1">{getCardStatusBadge(card)}</div>
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {card.title && (
                          <h4 className="font-extrabold text-brand-navy text-sm sm:text-base">
                            {card.title}
                          </h4>
                        )}
                        {(card.pages_from || card.pages_to) && (
                          <Badge variant="secondary" className="text-[11px] font-bold">
                            Págs: {card.pages_from || '—'} a {card.pages_to || '—'}
                          </Badge>
                        )}
                      </div>

                      {/* 1. Pergunta */}
                      <div className="rounded-xl border border-brand-border bg-brand-subtle/50 p-3 text-xs">
                        <span className="font-bold text-brand-orange block uppercase tracking-wider text-[10px]">
                          1. Pergunta direcionadora
                        </span>
                        <p className="mt-1 font-semibold text-brand-navy">{card.pergunta}</p>
                      </div>

                      {/* 2. Resumo */}
                      <div className="rounded-xl border border-brand-border bg-white p-3 text-xs">
                        <span className="font-bold text-blue-600 block uppercase tracking-wider text-[10px]">
                          2. Resumo das páginas
                        </span>
                        <p className="mt-1 leading-relaxed text-brand-text">{card.resumo}</p>
                      </div>

                      {/* 3. Provocação */}
                      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-xs">
                        <span className="font-bold text-purple-700 block uppercase tracking-wider text-[10px]">
                          3. Card de provocação
                        </span>
                        <p className="mt-1 italic text-purple-950 font-medium">
                          "{card.provocacao}"
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-1 sm:shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditCard(card)}
                        className="h-8 w-8 text-brand-muted hover:text-brand-navy hover:bg-brand-subtle"
                        title="Editar card"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteCard(card.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Excluir card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* 4. GESTÃO DE MEMBROS DO CLUBE */}
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Users className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-extrabold text-brand-navy">
                  Membros do Clube ({members.length})
                </h2>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                Alunos matriculados que foram incluídos na comunidade exclusiva de leitura pelo
                admin.
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedUserId('')
                setMemberNotes('')
                setMemberSearchQuery('')
                setMemberModalOpen(true)
              }}
              className="rounded-full bg-brand-navy px-4 text-xs font-bold text-white hover:bg-brand-navy-dark"
            >
              <UserPlus className="mr-1.5 h-4 w-4 text-brand-orange" /> Adicionar membro
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="my-10 rounded-2xl border border-dashed border-brand-border p-10 text-center">
              <Users className="mx-auto h-10 w-10 text-brand-muted opacity-50" />
              <h3 className="mt-3 font-extrabold text-brand-navy">Nenhum membro cadastrado</h3>
              <p className="mt-1 text-xs text-brand-muted">
                Adicione alunos cadastrados na plataforma para acompanharem a rotina do Clube das
                Pílulas.
              </p>
              <Button
                onClick={() => setMemberModalOpen(true)}
                className="mt-4 rounded-full bg-brand-orange text-xs text-white"
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" /> Adicionar primeiro membro
              </Button>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-brand-border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-brand-border bg-brand-subtle/50 text-brand-muted font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Aluno</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Membro desde</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Observações</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {members.map((member) => {
                      const user = member.expand?.user || allUsers.find((u) => u.id === member.user)
                      const initials =
                        user?.name
                          ?.split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'CP'
                      const avatarUrl =
                        user && user.avatar
                          ? pb.files.getURL(user, user.avatar, { thumb: '60x60' })
                          : ''

                      const joinDate = member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString('pt-BR')
                        : '—'

                      return (
                        <tr key={member.id} className="hover:bg-brand-sand/30 transition">
                          <td className="py-3 px-4 font-bold text-brand-navy">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={avatarUrl} alt={user?.name || 'Membro'} />
                                <AvatarFallback className="bg-brand-orange text-[10px] font-extrabold text-white">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user?.name || 'Usuário não localizado'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-brand-muted">{user?.email || '—'}</td>
                          <td className="py-3 px-4 text-brand-muted">{joinDate}</td>
                          <td className="py-3 px-4">
                            {member.status === 'ativo' ? (
                              <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 border-emerald-300">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500 border-gray-300">
                                Inativo
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-brand-muted max-w-xs truncate">
                            {member.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleMemberStatus(member)}
                                className="h-7 px-2 text-[11px] font-semibold text-brand-navy hover:bg-brand-subtle"
                              >
                                {member.status === 'ativo' ? 'Desativar' : 'Ativar'}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveMember(member.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Remover membro"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: CRIAR / EDITAR CARD DIÁRIO */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-brand-navy">
              {editingCard ? 'Editar Card Diário' : 'Novo Card Diário do WhatsApp'}
            </DialogTitle>
            <DialogDescription className="text-xs text-brand-muted">
              Configure a rotina do dia (seg–sáb): pergunta reflexiva, resumo das 7 a 8 páginas e a
              provocação prática.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCard} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="card-date" className="text-xs font-bold">
                  Data do card *
                </Label>
                <Input
                  id="card-date"
                  type="date"
                  value={cardFormDate}
                  onChange={(e) => setCardFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-status" className="text-xs font-bold">
                  Status de envio *
                </Label>
                <Select
                  value={cardFormStatus}
                  onValueChange={(val) => setCardFormStatus(val as ClubCardStatus)}
                >
                  <SelectTrigger id="card-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado (programado)</SelectItem>
                    <SelectItem value="enviado">Enviado no WhatsApp</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-title" className="text-xs font-bold">
                Título ou tema do dia (opcional)
              </Label>
              <Input
                id="card-title"
                placeholder="Ex: Dia 1 · O poder do alinhamento interior"
                value={cardFormTitle}
                onChange={(e) => setCardFormTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pages-from" className="text-xs font-bold">
                  Página inicial (de)
                </Label>
                <Input
                  id="pages-from"
                  type="number"
                  placeholder="Ex: 1"
                  value={cardFormPagesFrom}
                  onChange={(e) => setCardFormPagesFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pages-to" className="text-xs font-bold">
                  Página final (até)
                </Label>
                <Input
                  id="pages-to"
                  type="number"
                  placeholder="Ex: 8"
                  value={cardFormPagesTo}
                  onChange={(e) => setCardFormPagesTo(e.target.value)}
                />
              </div>
            </div>

            {/* 1. Pergunta */}
            <div className="space-y-1.5">
              <Label htmlFor="card-pergunta" className="text-xs font-bold text-brand-orange">
                1. Pergunta direcionadora *
              </Label>
              <Textarea
                id="card-pergunta"
                rows={2}
                placeholder="Pergunta para direcionar o olhar antes ou depois da leitura..."
                value={cardFormPergunta}
                onChange={(e) => setCardFormPergunta(e.target.value)}
                required
              />
            </div>

            {/* 2. Resumo */}
            <div className="space-y-1.5">
              <Label htmlFor="card-resumo" className="text-xs font-bold text-blue-600">
                2. Resumo das páginas do dia *
              </Label>
              <Textarea
                id="card-resumo"
                rows={4}
                placeholder="Síntese das 7 a 8 páginas lidas no dia..."
                value={cardFormResumo}
                onChange={(e) => setCardFormResumo(e.target.value)}
                required
              />
            </div>

            {/* 3. Provocação */}
            <div className="space-y-1.5">
              <Label htmlFor="card-provocacao" className="text-xs font-bold text-purple-700">
                3. Card de provocação prática *
              </Label>
              <Textarea
                id="card-provocacao"
                rows={2}
                placeholder="Frase ou gatilho de reflexão profunda para aplicação imediata..."
                value={cardFormProvocacao}
                onChange={(e) => setCardFormProvocacao(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCardModalOpen(false)}
                disabled={savingCard}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingCard}
                className="bg-brand-orange text-white hover:bg-brand-orange-dark"
              >
                {savingCard ? 'Salvando…' : editingCard ? 'Atualizar card' : 'Criar card'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADICIONAR MEMBRO AO CLUBE */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-brand-navy">
              Adicionar Aluno ao Clube
            </DialogTitle>
            <DialogDescription className="text-xs text-brand-muted">
              Selecione um usuário já cadastrado na plataforma para conceder acesso e registrar na
              comunidade do Clube das Pílulas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Buscar aluno por nome ou email</Label>
              <Input
                placeholder="Digite para filtrar..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="select-user" className="text-xs font-bold">
                Aluno a adicionar *
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="select-user">
                  <SelectValue placeholder="Selecione um aluno da lista" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-center text-xs text-brand-muted">
                      Nenhum aluno disponível para adicionar.
                    </div>
                  ) : (
                    availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-notes" className="text-xs font-bold">
                Observações internas (opcional)
              </Label>
              <Input
                id="member-notes"
                placeholder="Ex: Entrou pelo grupo do WhatsApp"
                value={memberNotes}
                onChange={(e) => setMemberNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberModalOpen(false)}
                disabled={savingMember}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingMember || !selectedUserId}
                className="bg-brand-navy text-white hover:bg-brand-navy-dark"
              >
                {savingMember ? 'Adicionando…' : 'Confirmar membro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
