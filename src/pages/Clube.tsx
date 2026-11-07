import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { ClubDailyCardRecord, CourseRecord } from '@/lib/types'
import {
  addClubMember,
  getClubStats,
  joinCourseWaitlist,
  listClubDailyCards,
} from '@/services/club'
import { listPublishedCourses } from '@/services/courses'

const WHATSAPP_CLUB_LINK = 'https://chat.whatsapp.com/GDwgDsxlgc56o0qOBM6r7o'
const CLUB_STORAGE_KEY = 'pilulas_club_registered'

export default function Clube() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Estado de acesso liberado
  const [hasAccess, setHasAccess] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(CLUB_STORAGE_KEY) === 'true'
  })

  // Formulário de Cadastro Obrigatório do Clube (Nome, E-mail, WhatsApp)
  const [regName, setRegName] = useState(user?.name || '')
  const [regEmail, setRegEmail] = useState(user?.email || '')
  const [regWhatsapp, setRegWhatsapp] = useState(user?.phone || '')
  const [submittingReg, setSubmittingReg] = useState(false)

  // Conteúdo interno
  const [cards, setCards] = useState<ClubDailyCardRecord[]>([])
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [stats, setStats] = useState<{ totalMembers: number; totalWaitlist: number }>({
    totalMembers: 0,
    totalWaitlist: 0,
  })
  const [loadingContent, setLoadingContent] = useState(false)

  // Lista de espera
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [waitlistNotes, setWaitlistNotes] = useState('')
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)

  // Filtro de cards
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all')

  // Se o usuário logado já tiver perfil, podemos pré-preencher
  useEffect(() => {
    if (user) {
      if (!regName) setRegName(user.name || '')
      if (!regEmail) setRegEmail(user.email || '')
      if (!regWhatsapp && user.phone) setRegWhatsapp(user.phone)
    }
  }, [user])

  // Se tem acesso, carrega o conteúdo do clube
  useEffect(() => {
    if (hasAccess) {
      loadClubContent()
    }
  }, [hasAccess])

  async function loadClubContent() {
    setLoadingContent(true)
    try {
      const [cardsList, coursesList, st] = await Promise.all([
        listClubDailyCards(),
        listPublishedCourses(),
        getClubStats(),
      ])
      setCards(cardsList)
      setCourses(coursesList)
      if (coursesList.length > 0) {
        setSelectedCourseId(coursesList[0].id)
      }
      setStats(st)
    } catch {
      // Fallback gracioso
    } finally {
      setLoadingContent(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim() || !regWhatsapp.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description:
          'Por favor, preencha nome, e-mail e WhatsApp para acessar o Clube gratuitamente.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingReg(true)
    try {
      if (user?.id) {
        await addClubMember({
          user: user.id,
          status: 'ativo',
          notes: `WhatsApp: ${regWhatsapp.trim()} | Nome: ${regName.trim()}`,
        })
      }

      localStorage.setItem(CLUB_STORAGE_KEY, 'true')
      setHasAccess(true)
      toast({
        title: 'Bem-vindo(a) ao Clube das Pílulas!',
        description: 'Seu acesso gratuito foi liberado com sucesso.',
      })
    } catch {
      localStorage.setItem(CLUB_STORAGE_KEY, 'true')
      setHasAccess(true)
      toast({
        title: 'Acesso liberado!',
        description: 'Bem-vindo ao Clube das Pílulas.',
      })
    } finally {
      setSubmittingReg(false)
    }
  }

  async function handleJoinWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCourseId) return

    setSubmittingWaitlist(true)
    try {
      await joinCourseWaitlist({
        courseId: selectedCourseId,
        userId: user?.id,
        name: regName || user?.name || 'Membro do Clube',
        email: regEmail || user?.email || '',
        whatsapp: regWhatsapp || user?.phone || '',
        notes: waitlistNotes,
      })
      setWaitlistSuccess(true)
      toast({
        title: 'Interesse registrado na Lista de Espera!',
        description: 'Você receberá prioridade e condições exclusivas assim que as vagas abrirem.',
      })
    } catch {
      toast({
        title: 'Erro ao registrar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingWaitlist(false)
    }
  }

  const filteredCards = useMemo(() => {
    if (selectedWeek === 'all') return cards
    return cards.filter((c) => c.week_number === selectedWeek)
  }, [cards, selectedWeek])

  const weeks = useMemo(() => {
    const list = Array.from(new Set(cards.map((c) => c.week_number))).sort((a, b) => a - b)
    return list
  }, [cards])

  return (
    <div className="route-page bg-[#F4F6F8] py-10 min-h-screen">
      {/* Banner de Identidade Visual Própria do Clube (Gratuito e Separado do Conteúdo Pago) */}
      <div className="container-site mb-8">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-brand-navy p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider">
              Área 100% Gratuita
            </Badge>
            <Badge
              variant="outline"
              className="border-white/30 text-emerald-200 bg-white/5 text-xs"
            >
              Comunidade Aberta
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Clube das Pílulas
          </h1>
          <p className="mt-3 text-base sm:text-lg text-emerald-100/90 max-w-2xl leading-relaxed">
            Um hábito diário de leitura, reflexão e conexões de alto nível. Encontro ao vivo mensal,
            cards semanais de provocação e lista de espera exclusiva para os cursos da plataforma.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-emerald-200">
            <span className="flex items-center gap-1.5 font-bold">
              <BookOpen className="h-4 w-4 text-emerald-400" /> Livro atual: Metanoia (JB Carvalho)
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5 font-bold">
              <Calendar className="h-4 w-4 text-emerald-400" /> Encontro mensal: 03/11/2026
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5 font-bold">
              <Users className="h-4 w-4 text-emerald-400" /> {stats.totalMembers || '100+'} membros
            </span>
          </div>
        </div>
      </div>

      {/* CASO NÃO TENHA CADASTRO: BARREIRA OBRIGATÓRIA ANTES DE ENTRAR */}
      {!hasAccess ? (
        <div className="container-site max-w-2xl py-6">
          <div className="surface-card p-6 sm:p-10 border-2 border-emerald-500/30 shadow-xl bg-white rounded-3xl">
            <div className="text-center">
              <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 mb-4 shadow-sm">
                <Lock className="h-7 w-7" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
                Acesse o Clube Gratuitamente
              </h2>
              <p className="mt-2 text-sm text-brand-muted max-w-md mx-auto">
                Para liberar o conteúdo interno do Clube das Pílulas (encontro ao vivo, pílulas
                semanais e lista de espera), informe seus dados abaixo.
              </p>
            </div>

            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              <div>
                <Label className="text-xs font-bold text-brand-navy">Nome completo</Label>
                <Input
                  placeholder="Seu nome completo"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="mt-1.5 rounded-xl border-brand-border h-12 bg-brand-sand/30"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-brand-navy">E-mail</Label>
                <Input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="mt-1.5 rounded-xl border-brand-border h-12 bg-brand-sand/30"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-brand-navy">
                  WhatsApp com DDD (para avisos do encontro e grupo)
                </Label>
                <Input
                  placeholder="(84) 99999-9999"
                  value={regWhatsapp}
                  onChange={(e) => setRegWhatsapp(e.target.value)}
                  className="mt-1.5 rounded-xl border-brand-border h-12 bg-brand-sand/30"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submittingReg}
                  className="h-12 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-md transition-all"
                >
                  {submittingReg ? 'Liberando acesso…' : 'Entrar no Clube Gratuitamente'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-brand-muted">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Cadastro 100% gratuito. Seus dados estão seguros e sem spam.</span>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* CONTEÚDO INTERNO LIBERADO */
        <div className="container-site space-y-10">
          {/* 1. ENCONTRO AO VIVO MENSAL EM DESTAQUE */}
          <section className="surface-card border-2 border-emerald-500/20 p-6 sm:p-8 bg-gradient-to-br from-white via-white to-emerald-50/50 rounded-3xl shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1">
                    Encontro ao Vivo Mensal
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs"
                  >
                    Google Meet
                  </Badge>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-brand-navy">
                  Debate Virtual: "Metanoia — A Chave Está na Sua Mente"
                </h2>
                <p className="text-sm text-brand-muted leading-relaxed">
                  Nosso grande encontro mensal para consolidar os insights do livro do mês, trocar
                  experiências práticas de negócios e aplicar as transformações na rotina.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-brand-navy pt-1">
                  <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-emerald-600" /> 03 de Novembro de 2026
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
                    <Clock className="h-4 w-4 text-emerald-600" /> 20h00 às 21h30 (Horário de
                    Brasília)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
                    <Users className="h-4 w-4 text-emerald-600" /> Mentoria com Edson Lúcio
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <Button
                  asChild
                  className="h-12 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md"
                >
                  <a href={WHATSAPP_CLUB_LINK} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Entrar no Grupo VIP WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 rounded-full border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
                >
                  <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4 text-emerald-600" /> Sala Virtual (Abre no dia)
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* 2. CONTEÚDO CURTO SEMANAL (CARDS DIÁRIOS / SEMANAIS) */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Rotina de Leitura Seg-Sáb às 9h
                </span>
                <h2 className="text-2xl font-black text-brand-navy mt-1">
                  Conteúdo Curto Semanal & Pílulas do Livro
                </h2>
                <p className="text-xs sm:text-sm text-brand-muted">
                  Resumos de 7-8 páginas por dia, perguntas de fixação e provocações para o dia a
                  dia.
                </p>
              </div>

              {weeks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedWeek === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedWeek('all')}
                    className={
                      selectedWeek === 'all'
                        ? 'rounded-full bg-emerald-700 text-white text-xs'
                        : 'rounded-full border-brand-border text-xs'
                    }
                  >
                    Todas ({cards.length})
                  </Button>
                  {weeks.map((w) => (
                    <Button
                      key={w}
                      size="sm"
                      variant={selectedWeek === w ? 'default' : 'outline'}
                      onClick={() => setSelectedWeek(w)}
                      className={
                        selectedWeek === w
                          ? 'rounded-full bg-emerald-700 text-white text-xs'
                          : 'rounded-full border-brand-border text-xs'
                      }
                    >
                      Semana {w}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {filteredCards.length === 0 ? (
              <div className="surface-card p-10 text-center rounded-3xl border border-dashed border-brand-border">
                <BookOpen className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-brand-navy">
                  Carregando os cards da rotina
                </h3>
                <p className="text-xs text-brand-muted mt-1">
                  Os resumos e provocações diárias estão sendo atualizados no grupo do WhatsApp.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCards.map((c) => {
                  const cardDate = c.date
                    ? new Date(c.date).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : ''
                  return (
                    <article
                      key={c.id}
                      className="surface-card flex flex-col justify-between p-6 rounded-3xl border border-brand-border hover:border-emerald-500/40 hover:shadow-lg transition-all bg-white"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold">
                            Dia {c.day_number} · Semana {c.week_number}
                          </Badge>
                          <span className="font-semibold text-brand-muted capitalize">
                            {cardDate}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                            Páginas {c.pages_range}
                          </span>
                          <h3 className="font-extrabold text-brand-navy text-base mt-1 line-clamp-2">
                            {c.title}
                          </h3>
                        </div>

                        {/* Card 1: Pergunta */}
                        {c.question && (
                          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                              <HelpCircle className="h-3.5 w-3.5 text-amber-600" /> Pergunta de
                              Fixação
                            </div>
                            <p className="text-xs text-amber-950 font-medium">{c.question}</p>
                          </div>
                        )}

                        {/* Card 2: Resumo 7-8 páginas */}
                        {c.summary && (
                          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/60 p-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                              <BookOpen className="h-3.5 w-3.5 text-emerald-600" /> Resumo das
                              Páginas
                            </div>
                            <p className="text-xs text-emerald-950 line-clamp-4 leading-relaxed">
                              {c.summary}
                            </p>
                          </div>
                        )}

                        {/* Card 3: Provocação */}
                        {c.provocation && (
                          <div className="rounded-2xl bg-purple-50/70 border border-purple-200/60 p-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                              <Flame className="h-3.5 w-3.5 text-purple-600" /> Provocação do Dia
                            </div>
                            <p className="text-xs text-purple-950 italic">"{c.provocation}"</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 border-t border-brand-border/60 pt-3 text-[11px] text-brand-muted flex items-center justify-between">
                        <span>Rotina Seg-Sáb às 9h</span>
                        <a
                          href={WHATSAPP_CLUB_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          Debater no WhatsApp <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* 3. LISTA DE ESPERA DOS CURSOS PAGOS (EXCLUSIVA PARA MEMBROS DO CLUBE) */}
          <section className="surface-card p-6 sm:p-10 rounded-3xl border-2 border-brand-orange/30 bg-gradient-to-br from-white via-white to-orange-50/40 shadow-lg">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-brand-orange text-white text-xs font-extrabold px-3 py-1">
                  Exclusivo para Membros do Clube
                </Badge>
                <Badge
                  variant="outline"
                  className="border-brand-orange/30 text-brand-orange bg-white text-xs"
                >
                  Prioridade de Vagas
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-brand-navy">
                Lista de Espera dos Cursos Pagos da Plataforma
              </h2>
              <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                Membros do Clube têm prioridade nas próximas turmas dos cursos oficiais da Pílulas
                de Desenvolvimento, com acesso a bônus especiais e condições antes do público geral.
                Selecione o curso do seu interesse:
              </p>

              {waitlistSuccess ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
                  <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h3 className="font-extrabold text-emerald-950 text-lg">
                    Inscrição na Lista de Espera Confirmada!
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Entraremos em contato pelo seu WhatsApp assim que as vagas do curso escolhido
                    forem liberadas com a sua condição exclusiva de membro do Clube.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWaitlistSuccess(false)}
                    className="rounded-full border-emerald-300 text-emerald-900"
                  >
                    Registrar interesse em outro curso
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="mt-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-brand-navy">
                        Qual curso você deseja fazer?
                      </Label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-xs font-bold text-brand-navy"
                        required
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.workload_hours}h)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-brand-navy">
                        WhatsApp para contato prioritário
                      </Label>
                      <Input
                        value={regWhatsapp}
                        onChange={(e) => setRegWhatsapp(e.target.value)}
                        placeholder="(84) 99999-9999"
                        className="mt-1.5 rounded-xl border-brand-border h-11 bg-white text-xs font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-brand-navy">
                      O que você mais busca desenvolver neste momento? (Opcional)
                    </Label>
                    <Input
                      placeholder="Ex: Aumentar as vendas do meu serviço, liderar equipe comercial, etc."
                      value={waitlistNotes}
                      onChange={(e) => setWaitlistNotes(e.target.value)}
                      className="mt-1.5 rounded-xl border-brand-border h-11 bg-white text-xs"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      type="submit"
                      disabled={submittingWaitlist}
                      className="h-12 w-full sm:w-auto px-8 rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white font-extrabold shadow-md"
                    >
                      {submittingWaitlist
                        ? 'Registrando…'
                        : 'Garantir Prioridade na Lista de Espera'}
                    </Button>
                    <span className="text-xs text-brand-muted">
                      Sem custo. Você só paga quando a turma abrir e decidir se matricular.
                    </span>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
