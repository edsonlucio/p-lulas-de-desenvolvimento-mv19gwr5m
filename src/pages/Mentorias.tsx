import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Video,
  FileText,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  Users,
  Sparkles,
  ExternalLink,
  Download,
  AlertCircle,
  ShieldCheck,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import {
  getActiveMentorshipProgram,
  listMentorshipMeetings,
  checkUserMentorshipAccess,
} from '@/services/mentorship'
import { formatPrice } from '@/services/courses'
import type {
  MentorshipProgramRecord,
  MentorshipMeetingRecord,
  MentorshipEnrollmentRecord,
} from '@/lib/types'

export default function Mentorias() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<MentorshipProgramRecord | null>(null)
  const [meetings, setMeetings] = useState<MentorshipMeetingRecord[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  const [enrollment, setEnrollment] = useState<MentorshipEnrollmentRecord | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setLoading(true)
      try {
        const [progData, meetingsData] = await Promise.all([
          getActiveMentorshipProgram(),
          listMentorshipMeetings(),
        ])

        if (!isMounted) return

        setProgram(progData)
        setMeetings(meetingsData)

        if (user) {
          const access = await checkUserMentorshipAccess(user.id)
          if (isMounted) {
            setHasAccess(access.hasAccess || user.role === 'admin')
            setEnrollment(access.enrollment)
          }
        } else {
          setHasAccess(false)
          setEnrollment(null)
        }
      } catch (err) {
        console.error('Erro ao carregar dados da mentoria:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [user])

  if (loading) {
    return <LoadingScreen />
  }

  // Filtrar reuniões: próximo encontro em destaque vs encontros anteriores
  const nextMeeting =
    meetings.find((m) => m.status === 'proximo') ||
    meetings.find((m) => new Date(m.date).getTime() >= Date.now()) ||
    meetings[0]

  const pastMeetings = meetings.filter((m) => m.id !== nextMeeting?.id)

  const handleContract = () => {
    if (!program) return
    if (!user) {
      navigate(`/cadastro?redirect=${encodeURIComponent(`/checkout?mentorship=${program.id}`)}`)
    } else {
      navigate(`/checkout?mentorship=${program.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-brand-light pb-20">
      {/* Hero com Identidade Própria da Mentoria */}
      <section className="relative overflow-hidden border-b border-brand-border bg-gradient-to-b from-brand-navy via-brand-navy to-brand-navy/95 py-14 text-white sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,90,31,0.18),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-coral/40 bg-brand-coral/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-coral">
              <Sparkles className="h-3.5 w-3.5" />
              Programa de Acompanhamento Executivo
            </div>
            {hasAccess ? (
              <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600">
                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                Matrícula de Mentoria Ativa
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/20 text-white/80">
                Uma turma por semana
              </Badge>
            )}
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {program?.title || 'Mentoria Executiva Pílulas de Desenvolvimento'}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-brand-light/90 sm:text-lg">
                {program?.subtitle ||
                  'Acompanhamento semanal com Edson Lúcio: estratégia, liderança e escala de vendas.'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {program?.description ||
                  'Uma turma por semana ao vivo com análise profunda de cenários de negócios, gravação integral dos encontros anteriores e cadernos práticos de aplicação imediata.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/80">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                  <Clock className="h-4 w-4 text-brand-coral" />
                  <span>{program?.meeting_cadence || 'Uma turma por semana'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                  <Calendar className="h-4 w-4 text-brand-coral" />
                  <span>{program?.meeting_schedule || 'Toda terça-feira às 20h00'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                  <Users className="h-4 w-4 text-brand-coral" />
                  <span>Vagas Limitadas por Turma</span>
                </div>
              </div>

              {/* Botão de Contratação ou Acesso */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {hasAccess ? (
                  <Button
                    size="lg"
                    className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500 shadow-lg"
                    onClick={() => {
                      document
                        .getElementById('proximo-encontro')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Ver Meu Acesso e Gravações
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="bg-brand-coral font-bold text-white hover:bg-brand-coral-dark shadow-xl hover:shadow-brand-coral/20"
                      onClick={handleContract}
                    >
                      Garantir Minha Vaga na Turma
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {program?.contact_whatsapp && (
                      <a
                        href={program.contact_whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4"
                      >
                        Falar com Edson Lúcio no WhatsApp
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Card de Preço Próprio da Mentoria */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-coral">
                    Investimento da Mentoria
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white font-medium">
                    Preço Próprio
                  </Badge>
                </div>

                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-heading text-4xl font-black text-white">
                    {formatPrice(program?.price ?? 997)}
                  </span>
                  {program?.original_price && program.original_price > (program.price || 0) && (
                    <span className="text-sm text-white/50 line-through">
                      {formatPrice(program.original_price)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/70">
                  Acesso completo aos encontros ao vivo semanais, histórico de gravações e cadernos
                  de aplicação.
                </p>

                <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-xs sm:text-sm">
                  {(
                    program?.features_list || [
                      'Encontros semanais ao vivo com Edson Lúcio',
                      'Acesso integral a todas as gravações anteriores',
                      'Material e cadernos de aplicação em PDF para download',
                      'Grupo fechado de networking com empresários e líderes',
                      'Análise de casos reais e direcionamento de vendas',
                    ]
                  ).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-white/90">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-coral mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  {hasAccess ? (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
                      <p className="text-xs font-semibold text-emerald-300">
                        Você já faz parte deste programa de mentoria!
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-brand-coral font-bold text-white hover:bg-brand-coral-dark"
                      size="lg"
                      onClick={handleContract}
                    >
                      Quero Participar da Mentoria
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo da Mentoria */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Banner de status para quem não tem acesso */}
        {!hasAccess && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Conteúdo exclusivo para mentorados da Pílulas de Desenvolvimento
                </h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  As gravações em vídeo e os materiais práticos para download são liberados
                  imediatamente após a confirmação da matrícula na mentoria.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-800 hover:bg-amber-900 text-white shrink-0 font-medium"
              onClick={handleContract}
            >
              Contratar Acesso
            </Button>
          </div>
        )}

        {/* 1. PRÓXIMO ENCONTRO SEMANAL EM DESTAQUE */}
        {nextMeeting && (
          <section id="proximo-encontro" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-brand-coral" />
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-brand-navy">
                Próximo Encontro da Semana (Em Destaque)
              </h2>
            </div>

            <Card className="border-2 border-brand-coral/40 bg-white shadow-md overflow-hidden">
              <div className="bg-brand-coral/10 border-b border-brand-coral/20 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-coral-dark flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-coral" />
                  {nextMeeting.cohort_name || 'Turma Semanal · Encontro ao Vivo'}
                </span>
                <Badge className="bg-brand-coral text-white font-medium">
                  {new Date(nextMeeting.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Badge>
              </div>

              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-xl sm:text-2xl font-extrabold text-brand-navy">
                    {nextMeeting.title}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-brand-navy/70">
                    <Clock className="h-4 w-4 text-brand-coral" />
                    <span>
                      {new Date(nextMeeting.date).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      (Horário de Brasília)
                    </span>
                  </div>
                </div>
                {nextMeeting.summary && (
                  <CardDescription className="text-sm leading-relaxed text-brand-muted mt-2">
                    {nextMeeting.summary}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-2 border-t border-brand-border/60 bg-brand-light/30">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Sala de Transmissão ao Vivo:
                    </p>
                    {hasAccess ? (
                      <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Link liberado para sua conta de mentorado
                      </p>
                    ) : (
                      <p className="text-xs text-brand-muted flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        Disponível exclusivamente para alunos inscritos
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {hasAccess ? (
                      nextMeeting.live_meeting_url ? (
                        <a
                          href={nextMeeting.live_meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 shadow"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Entrar na Sala ao Vivo
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <Badge variant="outline" className="text-xs py-1.5 px-3">
                          Link da sala será divulgado 30 min antes
                        </Badge>
                      )
                    ) : (
                      <Button
                        className="bg-brand-coral text-white hover:bg-brand-coral-dark font-semibold text-xs sm:text-sm"
                        onClick={handleContract}
                      >
                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                        Contratar Mentoria para Entrar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 2. ENCONTROS ANTERIORES COM GRAVAÇÃO E MATERIAL */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-brand-navy" />
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-brand-navy">
                Encontros Anteriores, Gravações e Materiais
              </h2>
            </div>
            <Badge variant="outline" className="text-xs text-brand-navy/80">
              {pastMeetings.length} encontros gravados
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {pastMeetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="border border-brand-border bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-brand-coral">
                        {meeting.cohort_name || 'Encontro Semanal'}
                      </span>
                      <span className="text-xs text-brand-muted">
                        {new Date(meeting.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-brand-navy leading-snug">
                      {meeting.title}
                    </CardTitle>
                    {meeting.summary && (
                      <CardDescription className="text-xs leading-relaxed text-brand-muted line-clamp-3 mt-1.5">
                        {meeting.summary}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Material de Aplicação */}
                    <div className="rounded-lg border border-brand-border/70 bg-brand-light/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-brand-navy truncate">
                          <FileText className="h-4 w-4 text-brand-coral shrink-0" />
                          <span className="truncate">
                            {meeting.material_title || 'Caderno de Aplicação Prática'}
                          </span>
                        </div>
                        {hasAccess ? (
                          meeting.material_url ? (
                            <a
                              href={meeting.material_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs font-bold text-brand-coral hover:text-brand-coral-dark"
                            >
                              <Download className="mr-1 h-3.5 w-3.5" />
                              Baixar
                            </a>
                          ) : (
                            <span className="text-[11px] text-brand-muted">Material anexado</span>
                          )
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold text-amber-700">
                            <Lock className="mr-1 h-3 w-3" />
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0 border-t border-brand-border/40 mt-3">
                  {hasAccess ? (
                    meeting.video_url ? (
                      <a
                        href={meeting.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-lg bg-brand-navy px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-brand-navy-dark transition-colors"
                      >
                        <Video className="mr-2 h-4 w-4 text-brand-coral" />
                        Assistir Gravação Completa
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <div className="text-center text-xs text-brand-muted py-1">
                        Gravação em processamento pela mentoria
                      </div>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                      onClick={handleContract}
                    >
                      <Lock className="mr-1.5 h-3.5 w-3.5 text-amber-700" />
                      Liberar Gravação e Material
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {pastMeetings.length === 0 && (
            <div className="rounded-xl border border-dashed border-brand-border p-8 text-center text-brand-muted">
              Nenhum encontro anterior cadastrado ainda.
            </div>
          )}
        </section>

        {/* 3. DÚVIDAS E SUPORTE DIRETO */}
        <section className="rounded-2xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-coral">
                Dúvidas sobre a turma semanal?
              </span>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-brand-navy mt-1">
                Fale diretamente com Edson Lúcio
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
                Nossas turmas são mantidas em tamanho reduzido para garantir que cada participante
                consiga trazer seus desafios de liderança e vendas para a mesa.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3">
              {program?.contact_whatsapp && (
                <a
                  href={program.contact_whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 shadow"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Tirar Dúvidas via WhatsApp
                </a>
              )}
              {!hasAccess && (
                <Button
                  className="w-full sm:w-auto bg-brand-coral font-bold text-white hover:bg-brand-coral-dark"
                  onClick={handleContract}
                >
                  Contratar Agora ({formatPrice(program?.price ?? 997)})
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
