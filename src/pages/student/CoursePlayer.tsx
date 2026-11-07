import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HelpCircle,
  Lightbulb,
  ListOrdered,
  ListVideo,
  LoaderCircle,
  Play,
  Sparkles,
  Target,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingScreen } from '@/components/LoadingScreen'
import { YouTubePlayer } from '@/components/YouTubePlayer'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type {
  CourseBundle,
  EnrollmentRecord,
  LessonMaterialRecord,
  LessonProgressRecord,
  LessonRecord,
  ModuleRecord,
} from '@/lib/types'
import { getCourseBundle } from '@/services/courses'
import { getMaterialFileUrl, getMaterialKind, listMaterialsByLesson } from '@/services/materials'
import { getModuleWorkbookUrl } from '@/services/quiz'
import { findEnrollment, listProgress, saveLessonPosition } from '@/services/student'

interface ModuleLessonsListProps {
  module: ModuleRecord & { lessons: LessonRecord[] }
  moduleIndex: number
  current: LessonRecord
  progress: LessonProgressRecord[]
  onSelect: (lesson: LessonRecord) => void
}

function ModuleLessonsList({
  module,
  moduleIndex,
  current,
  progress,
  onSelect,
}: ModuleLessonsListProps) {
  const completedInModule = module.lessons.filter((l) =>
    progress.some((p) => p.lesson === l.id && p.completed),
  ).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
            Módulo {moduleIndex + 1}
          </span>
          <h3 className="text-sm font-extrabold text-white">{module.title}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">
          {completedInModule}/{module.lessons.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {module.lessons.map((lesson, idx) => {
          const done = progress.some((entry) => entry.lesson === lesson.id && entry.completed)
          const active = lesson.id === current.id

          return (
            <button
              key={lesson.id}
              onClick={() => onSelect(lesson)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                active
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20 ring-1 ring-white/20'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-white/25 text-white'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                {done ? <Check className="h-4 w-4 stroke-[3]" /> : <span>{idx + 1}</span>}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold leading-tight">
                  {lesson.title}
                </span>
                <span
                  className={`mt-0.5 flex items-center gap-1.5 text-[10px] ${
                    active ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  <Clock3 className="h-3 w-3" />
                  {lesson.duration_min || 10} min
                  {done && <span className="ml-1 font-semibold text-emerald-300">• Concluída</span>}
                </span>
              </span>

              {active && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20 text-[10px] font-extrabold uppercase">
                  <Play className="ml-0.5 h-2.5 w-2.5 fill-current" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CourseAllModulesAccordion({
  bundle,
  current,
  progress,
  onSelect,
}: {
  bundle: CourseBundle
  current: LessonRecord
  progress: LessonProgressRecord[]
  onSelect: (lesson: LessonRecord) => void
}) {
  const currentModuleId = bundle.modules.find((m) => m.lessons.some((l) => l.id === current.id))?.id

  return (
    <Accordion
      type="multiple"
      defaultValue={currentModuleId ? [currentModuleId] : [bundle.modules[0]?.id]}
      className="space-y-2"
    >
      {bundle.modules.map((module, index) => {
        const completedCount = module.lessons.filter((l) =>
          progress.some((p) => p.lesson === l.id && p.completed),
        ).length
        const isCurrentModule = module.id === currentModuleId

        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className={`overflow-hidden rounded-xl border transition ${
              isCurrentModule
                ? 'border-brand-orange/40 bg-brand-orange/[0.04]'
                : 'border-white/10 bg-white/[0.03]'
            } px-3`}
          >
            <AccordionTrigger className="py-3 text-white hover:no-underline">
              <div className="flex w-full items-center justify-between pr-2 text-left">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                    Módulo {index + 1}
                  </span>
                  <p className="mt-0.5 text-xs font-bold leading-snug text-white">{module.title}</p>
                </div>
                <span className="text-[11px] font-bold text-white/50">
                  {completedCount}/{module.lessons.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-1">
                {module.lessons.map((lesson) => {
                  const done = progress.some(
                    (entry) => entry.lesson === lesson.id && entry.completed,
                  )
                  const active = lesson.id === current.id
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelect(lesson)}
                      className={`flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition ${
                        active
                          ? 'bg-brand-orange text-white'
                          : 'text-white/65 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : active
                              ? 'bg-white/20'
                              : 'bg-white/10'
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        ) : (
                          <Play className="ml-0.5 h-2.5 w-2.5 fill-current" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{lesson.title}</span>
                        <span
                          className={`mt-0.5 block text-[10px] ${
                            active ? 'text-white/80' : 'text-white/35'
                          }`}
                        >
                          {lesson.duration_min || 10} min
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

export default function CoursePlayer() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [bundle, setBundle] = useState<CourseBundle | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null)
  const [progress, setProgress] = useState<LessonProgressRecord[]>([])
  const [current, setCurrent] = useState<LessonRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [burst, setBurst] = useState(false)
  const [mobileLessons, setMobileLessons] = useState(false)
  const [materials, setMaterials] = useState<LessonMaterialRecord[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingWorkbook, setDownloadingWorkbook] = useState(false)

  // Guarda o último segundo salvo para evitar requisições idênticas consecutivas
  const lastSavedSecondRef = useRef<number>(-1)

  useEffect(() => {
    if (!user) return
    getCourseBundle(slug)
      .then(async (data) => {
        const enrolled = await findEnrollment(user.id, data.course.id)
        // Se for admin, permitir visualizar o curso como observador mesmo sem matrícula
        const isAdmin = user.role === 'admin'
        if (!enrolled && !isAdmin) {
          navigate(`/cursos/${slug}`, { replace: true })
          return
        }
        const userProgress = enrolled ? await listProgress(user.id, data.course.id) : []
        const lessons = data.modules.flatMap((m) => m.lessons)
        const requested = lessons.find((l) => l.id === params.get('aula'))
        const unfinished = userProgress.find(
          (entry) => !entry.completed && entry.current_minute > 0,
        )
        const defaultLesson =
          requested ||
          lessons.find((l) => l.id === unfinished?.lesson) ||
          lessons.find((l) => !userProgress.some((p) => p.lesson === l.id && p.completed)) ||
          lessons[0]

        setBundle(data)
        setEnrollment(enrolled)
        setProgress(userProgress)
        setCurrent(defaultLesson)
      })
      .finally(() => setLoading(false))
  }, [navigate, params, slug, user])

  useEffect(() => {
    if (!current) return
    let active = true
    setLoadingMaterials(true)
    listMaterialsByLesson(current.id)
      .then((items) => {
        if (active) setMaterials(items)
      })
      .finally(() => {
        if (active) setLoadingMaterials(false)
      })
    return () => {
      active = false
    }
  }, [current])

  const lessons = useMemo(() => bundle?.modules.flatMap((m) => m.lessons) ?? [], [bundle])
  const currentModule = useMemo(() => {
    if (!bundle || !current) return null
    return bundle.modules.find((m) => m.lessons.some((l) => l.id === current.id)) ?? null
  }, [bundle, current])

  const currentModuleIndex = useMemo(() => {
    if (!bundle || !currentModule) return 0
    return bundle.modules.findIndex((m) => m.id === currentModule.id)
  }, [bundle, currentModule])

  const moduleLessons = currentModule?.lessons ?? []
  const lessonIndexInModule = current ? moduleLessons.findIndex((l) => l.id === current.id) : -1
  const overallIndex = current ? lessons.findIndex((l) => l.id === current.id) : -1

  const currentProgress = current ? progress.find((p) => p.lesson === current.id) : undefined

  // Progresso do aluno no MÓDULO atual
  const moduleCompletedCount = moduleLessons.filter((l) =>
    progress.some((p) => p.lesson === l.id && p.completed),
  ).length
  const moduleTotalCount = moduleLessons.length
  const modulePercent = moduleTotalCount
    ? Math.round((moduleCompletedCount / moduleTotalCount) * 100)
    : 0

  // Próxima aula: primeiro tenta a próxima dentro do mesmo módulo; se for a última do módulo, pega a primeira do próximo
  const nextLessonInModule =
    lessonIndexInModule >= 0 && lessonIndexInModule < moduleLessons.length - 1
      ? moduleLessons[lessonIndexInModule + 1]
      : null
  const nextLessonOverall =
    overallIndex >= 0 && overallIndex < lessons.length - 1 ? lessons[overallIndex + 1] : null
  const nextLesson = nextLessonInModule || nextLessonOverall

  const prevLesson = overallIndex > 0 ? lessons[overallIndex - 1] : null

  // Segundo em que o aluno parou (retomada precisa)
  const startSeconds = useMemo(() => {
    if (!currentProgress || currentProgress.completed) return 0
    const minuteVal = currentProgress.current_minute || 0
    return Math.max(0, Math.floor(minuteVal * 60))
  }, [currentProgress])

  // Salva periodicamente os segundos assistidos
  async function handleVideoProgress(seconds: number) {
    if (!user || !bundle || !enrollment || !current || currentProgress?.completed) return
    if (Math.abs(seconds - lastSavedSecondRef.current) < 3) return // throttle leve
    lastSavedSecondRef.current = seconds

    try {
      const minuteFraction = Number((seconds / 60).toFixed(2))
      const record = await saveLessonPosition({
        userId: user.id,
        lessonId: current.id,
        courseId: bundle.course.id,
        enrollmentId: enrollment.id,
        currentMinute: minuteFraction,
      })
      setProgress((items) => [...items.filter((item) => item.lesson !== current.id), record])
    } catch {
      // Falha silenciosa de auto-save periódico para não incomodar o aluno
    }
  }

  // Concluir aula quando o vídeo chega ao fim
  async function handleVideoEnded() {
    if (!user || !bundle || !enrollment || !current) return
    if (currentProgress?.completed) return // já concluída anteriormente

    try {
      const record = await saveLessonPosition({
        userId: user.id,
        lessonId: current.id,
        courseId: bundle.course.id,
        enrollmentId: enrollment.id,
        currentMinute: current.duration_min || 10,
        completed: true,
      })
      setProgress((items) => [...items.filter((item) => item.lesson !== current.id), record])
      toast({
        title: '+10 pontos! Aula concluída',
        description: 'Você assistiu a aula até o fim. Excelente consistência!',
      })

      // Verifica se concluiu o módulo ou curso para celebrar
      const moduleDone = moduleLessons.every(
        (l) => l.id === current.id || progress.some((p) => p.lesson === l.id && p.completed),
      )
      if (moduleDone) {
        setBurst(true)
        setTimeout(() => setBurst(false), 2400)
      }
    } catch {
      toast({
        title: 'Não foi possível registrar a conclusão da aula',
        variant: 'destructive',
      })
    }
  }

  // Marcar manualmente como concluída (caso o aluno queira adiantar)
  async function completeManually() {
    if (!user || !bundle || !enrollment || !current || currentProgress?.completed) return
    try {
      const record = await saveLessonPosition({
        userId: user.id,
        lessonId: current.id,
        courseId: bundle.course.id,
        enrollmentId: enrollment.id,
        currentMinute: current.duration_min || 10,
        completed: true,
      })
      setProgress((items) => [...items.filter((item) => item.lesson !== current.id), record])
      toast({
        title: '+10 pontos! Aula concluída',
        description: 'Consistência que vira transformação.',
      })

      const moduleDone = moduleLessons.every(
        (l) => l.id === current.id || progress.some((p) => p.lesson === l.id && p.completed),
      )
      if (moduleDone) {
        setBurst(true)
        setTimeout(() => setBurst(false), 2400)
      }
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' })
    }
  }

  // Baixar apostila em PDF do módulo atual
  async function handleDownloadWorkbook() {
    if (!currentModule || !currentModule.apostila) return
    if (!enrollment && user?.role !== 'admin') {
      toast({
        title: 'Acesso restrito',
        description: 'É necessário ter matrícula ativa no curso para baixar a apostila.',
        variant: 'destructive',
      })
      return
    }

    try {
      setDownloadingWorkbook(true)
      const url = await getModuleWorkbookUrl(currentModule, true)
      if (!url) throw new Error('URL de download da apostila indisponível')

      const link = document.createElement('a')
      link.href = url
      link.download = currentModule.apostila
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Download iniciado',
        description: `Baixando apostila do ${currentModule.title}.`,
      })
    } catch {
      toast({
        title: 'Erro ao baixar apostila',
        description: 'Não foi possível gerar o link de download protegido.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingWorkbook(false)
    }
  }

  // Baixar materiais de apoio adicionais
  async function handleDownloadMaterial(mat: LessonMaterialRecord) {
    if (!enrollment && user?.role !== 'admin') {
      toast({
        title: 'Acesso restrito',
        description: 'É necessário ter matrícula ativa no curso para baixar materiais.',
        variant: 'destructive',
      })
      return
    }

    if (mat.tipo === 'link') {
      if (mat.url) {
        window.open(mat.url, '_blank', 'noopener,noreferrer')
      }
      return
    }

    if (!mat.arquivo) {
      toast({
        title: 'Arquivo indisponível',
        description: 'Este material de apoio ainda não possui arquivo anexado.',
        variant: 'destructive',
      })
      return
    }

    try {
      setDownloadingId(mat.id)
      const downloadUrl = await getMaterialFileUrl(mat, true)
      if (!downloadUrl) throw new Error('URL de download não gerada')

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = mat.arquivo
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Download iniciado',
        description: `Baixando ${mat.titulo}.`,
      })
    } catch {
      toast({
        title: 'Erro ao baixar arquivo',
        description: 'Não foi possível gerar o link de download protegido.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  function selectLesson(lesson: LessonRecord) {
    lastSavedSecondRef.current = -1
    setCurrent(lesson)
    setParams({ aula: lesson.id }, { replace: true })
    setMobileLessons(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading || !bundle || !current) return <LoadingScreen label="Abrindo sua aula…" />

  // Tópicos essenciais para renderizar no resumo (filtra vazios)
  const topicos = [current.topico_1, current.topico_2, current.topico_3].filter((t): t is string =>
    Boolean(t && t.trim()),
  )

  const hasCentralIdea = Boolean(current.ideia_central?.trim())
  const hasExercise = Boolean(current.exercicio?.trim())
  const hasWorkbook = Boolean(currentModule?.apostila)

  return (
    <div className="route-page bg-[#0B1220] text-white">
      <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-[1fr_360px]">
        {/* Coluna Principal: Player no topo + Título + Resumo em até 3 tópicos + Exercício + Ações */}
        <main className="min-w-0">
          {/* Barra superior de navegação */}
          <div className="border-b border-white/10 px-4 py-3 sm:px-8 sm:py-4">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link
                  to={user?.role === 'admin' ? '/admin/cursos' : '/app'}
                  className="flex items-center gap-2 text-sm font-bold text-white/60 transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {user?.role === 'admin' ? 'Voltar ao Admin' : 'Meus cursos'}
                </Link>
                {user?.role === 'admin' && (
                  <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 sm:inline-block">
                    Modo Observador (Admin)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs font-semibold text-white/40 md:block">
                  {bundle.course.title}
                </span>

                {/* Botão de abrir lista de aulas no celular */}
                <Sheet open={mobileLessons} onOpenChange={setMobileLessons}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                    >
                      <ListVideo className="mr-1.5 h-4 w-4 text-brand-orange" />
                      Aulas ({moduleCompletedCount}/{moduleTotalCount})
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="max-h-[85vh] rounded-t-3xl border-white/10 bg-brand-navy text-white"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-left text-white">Aulas do curso</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 max-h-[68vh] overflow-y-auto pr-1">
                      {currentModule && (
                        <div className="mb-4 rounded-2xl border border-brand-orange/30 bg-white/[0.03] p-4">
                          <ModuleLessonsList
                            module={currentModule}
                            moduleIndex={currentModuleIndex}
                            current={current}
                            progress={progress}
                            onSelect={selectLesson}
                          />
                        </div>
                      )}
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-white/40">
                        Todos os módulos
                      </p>
                      <CourseAllModulesAccordion
                        bundle={bundle}
                        current={current}
                        progress={progress}
                        onSelect={selectLesson}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-0 sm:px-8 sm:py-6">
            {/* Player de Vídeo no Topo com YouTube Iframe API */}
            <div className="overflow-hidden bg-black sm:rounded-2xl sm:shadow-2xl">
              <YouTubePlayer
                key={current.id}
                videoUrl={current.video_url}
                title={current.title}
                initialSeconds={startSeconds}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
              />
            </div>

            <div className="px-4 py-6 sm:px-0">
              {/* Título da aula + Badge de Conclusão */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                      Módulo {currentModuleIndex + 1} • Aula {lessonIndexInModule + 1} de{' '}
                      {moduleTotalCount}
                    </span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs font-semibold text-white/50">
                      Duração: {current.duration_min || 10} minutos
                    </span>
                  </div>
                  <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] sm:text-3xl">
                    {current.title}
                  </h1>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
                  {currentProgress?.completed ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-extrabold text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Aula Concluída
                    </span>
                  ) : startSeconds > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-brand-orange/15 px-3 py-1.5 text-xs font-semibold text-brand-orange border border-brand-orange/30">
                      <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                      Retomando do segundo {startSeconds}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Botões de Ação Direta Abaixo do Player: Próxima aula + Apostila em PDF + Concluir */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Botão Próxima Aula */}
                  {nextLesson && (
                    <Button
                      onClick={() => selectLesson(nextLesson)}
                      className="rounded-full bg-brand-orange px-5 font-bold text-white shadow-md shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
                    >
                      Próxima aula
                      <ChevronRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  )}

                  {/* Botão Aula Anterior */}
                  {prevLesson && (
                    <Button
                      variant="outline"
                      onClick={() => selectLesson(prevLesson)}
                      className="rounded-full border-white/15 bg-white/5 font-semibold text-white hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="mr-1.5 h-4 w-4" />
                      Anterior
                    </Button>
                  )}

                  {/* Botão de Baixar Apostila em PDF do Módulo (visível na própria página se existir) */}
                  {hasWorkbook && (
                    <Button
                      variant="outline"
                      disabled={downloadingWorkbook}
                      onClick={() => void handleDownloadWorkbook()}
                      className="rounded-full border-rose-500/40 bg-rose-500/10 font-bold text-rose-300 hover:bg-rose-500/20 hover:text-white"
                    >
                      {downloadingWorkbook ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          Baixando apostila…
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4 text-rose-400" />
                          Baixar Apostila do Módulo (PDF)
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Botão marcar como concluída manual (ou badge se já concluída) */}
                <div>
                  <Button
                    disabled={currentProgress?.completed}
                    onClick={() => void completeManually()}
                    className={`rounded-full font-bold transition ${
                      currentProgress?.completed
                        ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 cursor-default'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {currentProgress?.completed ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Concluída (+10 pts)
                      </>
                    ) : (
                      'Marcar como concluída'
                    )}
                  </Button>
                </div>
              </div>

              {/* Barra de Progresso do Aluno no Módulo */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">
                      Progresso no Módulo {currentModuleIndex + 1}:
                    </span>
                    <span className="text-white">
                      {moduleCompletedCount} de {moduleTotalCount} aulas concluídas
                    </span>
                  </div>
                  <span className="text-brand-orange">{modulePercent}%</span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="progress-shine h-full rounded-full bg-brand-orange transition-all duration-500"
                    style={{ width: `${modulePercent}%` }}
                  />
                </div>
              </div>

              {/* Blocos Pedagógicos: Ideia Central + Resumo em até 3 tópicos + Exercício Curto de Aplicação */}
              <div className="mt-8 space-y-5">
                {/* Ideia Central da Aula */}
                {hasCentralIdea && (
                  <div className="rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-brand-orange/[0.08] to-transparent p-5 sm:p-6">
                    <div className="flex items-center gap-2.5 text-brand-orange">
                      <Lightbulb className="h-5 w-5" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">
                        Ideia Central da Aula
                      </span>
                    </div>
                    <p className="mt-2.5 text-base sm:text-lg font-bold leading-relaxed text-white">
                      "{current.ideia_central}"
                    </p>
                  </div>
                )}

                {/* Resumo em até 3 Tópicos */}
                {topicos.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-white/80">
                      <ListOrdered className="h-4 w-4 text-brand-orange" />
                      <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                        Resumo em Tópicos Essenciais
                      </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                      {topicos.map((topico, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                        >
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-orange/20 text-xs font-black text-brand-orange">
                            {idx + 1}
                          </span>
                          <p className="text-sm font-medium leading-relaxed text-white/90">
                            {topico}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exercício Curto de Aplicação */}
                {hasExercise && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Target className="h-5 w-5" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">
                        Exercício Curto de Aplicação
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm sm:text-base font-medium leading-relaxed text-white/90 whitespace-pre-line">
                      {current.exercicio}
                    </p>
                  </div>
                )}

                {/* Descrição geral da aula (se existir e não tiver ideia central duplicada) */}
                {current.description && !hasCentralIdea && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
                      Sobre a aula
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70 whitespace-pre-line">
                      {current.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Lista das Aulas do Módulo abaixo do player (destaque especial no mobile e tablet) */}
              <div className="mt-10 lg:hidden">
                <div className="rounded-2xl border border-white/10 bg-brand-navy/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                        Aulas do Módulo {currentModuleIndex + 1}
                      </span>
                      <h2 className="text-base font-extrabold text-white">
                        {currentModule?.title}
                      </h2>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">
                      {moduleCompletedCount}/{moduleTotalCount} concluídas
                    </span>
                  </div>

                  {currentModule && (
                    <ModuleLessonsList
                      module={currentModule}
                      moduleIndex={currentModuleIndex}
                      current={current}
                      progress={progress}
                      onSelect={selectLesson}
                    />
                  )}
                </div>
              </div>

              {/* Seção Opcional de Materiais de Apoio da Aula */}
              {materials.length > 0 && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-brand-orange" />
                    <h3 className="text-sm font-extrabold text-white">
                      Materiais complementares desta aula ({materials.length})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {materials.map((mat) => {
                      const kind = getMaterialKind(mat)
                      const isExcel = kind === 'excel' || kind === 'csv'
                      const isPdf = kind === 'pdf'
                      const isLink = mat.tipo === 'link'
                      const isDownloading = downloadingId === mat.id

                      return (
                        <div
                          key={mat.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-brand-navy/60 p-3.5 sm:flex-row sm:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
                              {isPdf ? (
                                <FileText className="h-4 w-4 text-rose-400" />
                              ) : isExcel ? (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                              ) : isLink ? (
                                <ExternalLink className="h-4 w-4 text-sky-400" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{mat.titulo}</p>
                              {mat.descricao && (
                                <p className="text-[11px] text-white/50">{mat.descricao}</p>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => void handleDownloadMaterial(mat)}
                            className="rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 self-start sm:self-auto"
                          >
                            {isDownloading ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : isLink ? (
                              <>
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                Abrir
                              </>
                            ) : (
                              <>
                                <Download className="mr-1 h-3.5 w-3.5" />
                                Baixar
                              </>
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Coluna Lateral (Desktop): Aulas do Módulo Atual em Destaque + Apostila em PDF + Todos os Módulos */}
        <aside className="hidden border-l border-white/10 bg-brand-navy p-5 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
            {/* Bloco 1: Aulas do Módulo Atual */}
            {currentModule && (
              <div className="rounded-2xl border border-brand-orange/30 bg-white/[0.025] p-4">
                <ModuleLessonsList
                  module={currentModule}
                  moduleIndex={currentModuleIndex}
                  current={current}
                  progress={progress}
                  onSelect={selectLesson}
                />

                {/* Botão de download da apostila do módulo na lateral */}
                {hasWorkbook && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingWorkbook}
                      onClick={() => void handleDownloadWorkbook()}
                      className="w-full rounded-xl border-rose-500/40 bg-rose-500/10 text-xs font-bold text-rose-300 hover:bg-rose-500/20 hover:text-white"
                    >
                      {downloadingWorkbook ? (
                        <>
                          <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Baixando apostila…
                        </>
                      ) : (
                        <>
                          <BookOpen className="mr-1.5 h-3.5 w-3.5 text-rose-400" />
                          Baixar Apostila (PDF)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Bloco 2: Todos os Módulos do Curso */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
                  Estrutura do Curso
                </h3>
                <span className="text-[11px] font-bold text-brand-orange">
                  {progress.filter((p) => p.completed).length} de {lessons.length} aulas
                </span>
              </div>

              <CourseAllModulesAccordion
                bundle={bundle}
                current={current}
                progress={progress}
                onSelect={selectLesson}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Animação comemorativa de conclusão de módulo/curso */}
      {burst && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-brand-navy/80 backdrop-blur-sm">
          <div className="relative text-center">
            <div className="absolute inset-[-100px] animate-ping rounded-full border border-brand-orange/30" />
            <span className="mx-auto grid h-24 w-24 animate-check-pop place-items-center rounded-full bg-brand-orange text-white shadow-[0_0_80px_rgba(255,107,44,.5)]">
              <Award className="h-10 w-10" />
            </span>
            <Sparkles className="absolute -right-8 top-2 h-7 w-7 text-amber-300" />
            <Sparkles className="absolute -left-10 top-16 h-5 w-5 text-blue-300" />
            <h2 className="mt-7 text-3xl font-extrabold">Módulo Concluído!</h2>
            <p className="mt-2 text-white/70">
              Você completou todas as aulas deste módulo. Parabéns pelo foco e dedicação!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
