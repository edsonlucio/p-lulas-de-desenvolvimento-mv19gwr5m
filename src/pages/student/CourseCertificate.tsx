import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Award,
  Download,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Calendar,
  Clock,
  Sparkles,
  Share2,
  Printer,
  ShieldCheck,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { BrandLogo } from '@/components/BrandLogo'
import { getCourseBundle } from '@/services/courses'
import { getCourseCertificateEligibility } from '@/services/quiz'
import type { CourseBundle } from '@/lib/types'

type CertificateData = Awaited<ReturnType<typeof getCourseCertificateEligibility>>

export default function CourseCertificate() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState<CourseBundle | null>(null)
  const [eligibility, setEligibility] = useState<CertificateData | null>(null)
  const certificateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)

    getCourseBundle(slug)
      .then(async (data) => {
        if (!active) return
        setBundle(data)

        const elig = await getCourseCertificateEligibility(user.id, data.course.id)
        if (active) setEligibility(elig)
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do certificado:', err)
        toast({
          title: 'Não foi possível carregar o certificado',
          description: 'Verifique se o curso existe e tente novamente.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, user, toast])

  function handlePrintOrPdf() {
    window.print()
  }

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: `Certificado de Conclusão — ${bundle?.course.title}`,
          text: `Concluí o curso ${bundle?.course.title} na Pílulas de Desenvolvimento!`,
          url: window.location.href,
        })
        .catch(() => {
          // ignora cancelamento do share
        })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe sua conquista nas suas redes e LinkedIn.',
      })
    }
  }

  if (loading) {
    return <LoadingScreen label="Carregando certificado…" />
  }

  if (!bundle) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-white">
        <h2 className="text-xl font-bold">Curso não encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/cursos')}>
          Voltar aos cursos
        </Button>
      </div>
    )
  }

  const isEligible = eligibility?.isEligible ?? false
  const studentName = user?.name || user?.email?.split('@')[0] || 'Aluno'
  const courseTitle = bundle.course.title
  const totalHours = eligibility?.totalDurationHours ?? 1
  const issueDateFormatted =
    eligibility?.issueDateFormatted ?? new Date().toLocaleDateString('pt-BR')

  return (
    <div className="min-h-screen bg-brand-navy text-white">
      {/* Barra Superior / Ações — oculta na impressão */}
      <header className="no-print border-b border-white/10 bg-brand-navy/90 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5">
          <Link
            to={`/app/curso/${slug}`}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Player do Curso</span>
          </Link>

          <div className="flex items-center gap-2">
            {isEligible && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Compartilhar
                </Button>

                <Button
                  size="sm"
                  onClick={handlePrintOrPdf}
                  className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold shadow-lg shadow-brand-orange/20"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Baixar Certificado (PDF)
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        {/* CASO 1: NÃO ELEGÍVEL AINDA — Mostra exatamente o que falta */}
        {!isEligible && eligibility && (
          <div className="no-print mb-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-brand-navy p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-300">
                <Lock className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold mb-2">
                  Certificado ainda não liberado
                </Badge>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Quase lá! Complete os requisitos para emitir seu certificado
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-white/70">
                  O certificado oficial da Pílulas de Desenvolvimento é liberado exclusivamente para
                  alunos que concluem <strong>100% das aulas</strong> e atingem{' '}
                  <strong>média final igual ou superior a 70%</strong> nas avaliações dos módulos.
                </p>

                {/* Checklist de requisitos com status */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Requisito 1: Aulas concluídas */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white/60">
                        1. Todas as Aulas Concluídas
                      </span>
                      {eligibility.completedLessons === eligibility.totalLessons ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {eligibility.completedLessons} / {eligibility.totalLessons}
                      </span>
                      <span className="text-xs text-white/60">
                        (
                        {eligibility.completedLessons === eligibility.totalLessons
                          ? '100% concluído'
                          : `Faltam ${eligibility.totalLessons - eligibility.completedLessons} aulas`}
                        )
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-brand-orange transition-all duration-500"
                        style={{
                          width: `${
                            eligibility.totalLessons > 0
                              ? Math.min(
                                  100,
                                  (eligibility.completedLessons / eligibility.totalLessons) * 100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Requisito 2: Média final >= 70% */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white/60">
                        2. Média das Avaliações ≥ 70%
                      </span>
                      {eligibility.averageScorePct >= 70 ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {eligibility.averageScorePct}%
                      </span>
                      <span className="text-xs text-white/60">
                        (Mínimo exigido: 70% • Guardamos sua melhor nota)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          eligibility.averageScorePct >= 70 ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, eligibility.averageScorePct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Módulos e status das notas */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <span className="text-xs font-bold text-white/80 block mb-2">
                    Desempenho por Módulo (melhor nota guardada):
                  </span>
                  <div className="space-y-2 text-xs">
                    {eligibility.modulesStatus.map((m) => (
                      <div
                        key={m.moduleId}
                        className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              m.allLessonsDone ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <span className="font-semibold text-white/90">{m.title}</span>
                          <span className="text-white/40">
                            ({m.completedLessons}/{m.totalLessons} aulas)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {m.hasQuiz ? (
                            m.bestScore !== null ? (
                              <span
                                className={`font-bold ${
                                  m.bestScore >= 70 ? 'text-emerald-400' : 'text-amber-300'
                                }`}
                              >
                                {m.bestScore}%
                              </span>
                            ) : (
                              <span className="text-amber-300/80">Avaliação pendente</span>
                            )
                          ) : (
                            <span className="text-white/40">Sem avaliação</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate(`/app/curso/${slug}`)}
                    className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold"
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                    Continuar Aulas e Avaliações
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MENSAGEM DE PARABÉNS (quando elegível) */}
        {isEligible && (
          <div className="no-print mb-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-brand-navy to-brand-navy p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Parabéns, {studentName}!
            </h1>
            <p className="mt-1 text-sm text-white/70 max-w-xl mx-auto">
              Você concluiu 100% das aulas com média final de{' '}
              <strong className="text-emerald-300 font-bold">
                {eligibility?.averageScorePct}%
              </strong>
              . Seu certificado oficial de conclusão está liberado com autenticidade garantida.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                onClick={handlePrintOrPdf}
                className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-orange/20"
              >
                <Download className="mr-1.5 h-4 w-4" />
                Baixar Certificado em PDF
              </Button>
            </div>
          </div>
        )}

        {/* ÁREA DO CERTIFICADO OFICIAL — Renderiza visualmente e é o alvo da impressão/PDF */}
        <div className={isEligible ? 'print-certificate-only' : 'opacity-40 pointer-events-none'}>
          <div
            ref={certificateRef}
            className="relative overflow-hidden rounded-3xl border-4 border-amber-400/50 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0B132B] p-8 sm:p-14 text-white shadow-2xl"
          >
            {/* Elementos Decorativos de Borda e Brasão de Fundo */}
            <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-dashed border-amber-400/30 pointer-events-none" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center">
              {/* Logo e Cabeçalho da Instituição */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <BrandLogo className="h-10 w-auto" />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-amber-300">
                <Award className="h-4 w-4" />
                Certificado Oficial de Conclusão
              </div>

              {/* Texto Principal */}
              <p className="mt-8 text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/60">
                Certificamos que
              </p>

              {/* Nome do Aluno em Grande Destaque */}
              <h2 className="mt-3 text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-serif underline decoration-brand-orange decoration-4 underline-offset-8">
                {studentName}
              </h2>

              <p className="mt-6 text-xs sm:text-sm text-white/75 max-w-2xl mx-auto leading-relaxed">
                concluiu com êxito todas as etapas teórico-práticas, aulas gravadas e avaliações de
                aproveitamento do curso de capacitação profissional:
              </p>

              {/* Nome do Curso */}
              <h3 className="mt-3 text-xl sm:text-2xl md:text-3xl font-extrabold text-brand-orange">
                {courseTitle}
              </h3>

              {/* Metadados: Carga Horária, Média e Data */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto border-t border-b border-white/10 py-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-white/50 mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Carga Horária</span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-white">
                    {totalHours} {totalHours === 1 ? 'hora' : 'horas'}
                  </span>
                </div>

                <div className="text-center border-t sm:border-t-0 sm:border-l sm:border-r border-white/10 pt-3 sm:pt-0">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-white/50 mb-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>Aproveitamento</span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-emerald-400">
                    {eligibility?.averageScorePct ?? 100}%
                  </span>
                </div>

                <div className="text-center border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-white/50 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Data de Emissão</span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-white">
                    {issueDateFormatted}
                  </span>
                </div>
              </div>

              {/* Assinaturas / Autenticidade */}
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-8 pt-4">
                <div className="text-left">
                  <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Certificado Digital Verificado</span>
                  </div>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">
                    ID: {bundle.course.id.slice(0, 8)}-{user?.id.slice(0, 8)}-PD
                  </p>
                </div>

                <div className="text-center sm:text-right">
                  <div className="inline-block border-b border-white/40 pb-1 px-8">
                    <span className="font-serif italic text-base text-white/90">Edson Lúcio</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-white/80">Direção Pedagógica</p>
                  <p className="text-[10px] text-white/50">Pílulas de Desenvolvimento EAD</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
