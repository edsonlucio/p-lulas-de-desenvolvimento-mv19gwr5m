import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
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
  Info,
  ListVideo,
  LoaderCircle,
  Play,
  Sparkles,
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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type {
  CourseBundle,
  EnrollmentRecord,
  LessonMaterialRecord,
  LessonProgressRecord,
  LessonRecord,
} from '@/lib/types'
import { getYoutubeEmbed } from '@/lib/youtube'
import { getCourseBundle } from '@/services/courses'
import { getMaterialFileUrl, getMaterialKind, listMaterialsByLesson } from '@/services/materials'
import { findEnrollment, listProgress, saveLessonPosition } from '@/services/student'

function LessonsList({
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
  return (
    <Accordion type="multiple" defaultValue={bundle.modules.map((m) => m.id)} className="space-y-2">
      {bundle.modules.map((module, index) => (
        <AccordionItem
          key={module.id}
          value={module.id}
          className="overflow-hidden rounded-xl border border-white/10 bg-white/[.035] px-3"
        >
          <AccordionTrigger className="py-3 text-white hover:no-underline">
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                Módulo {index + 1}
              </span>
              <p className="mt-0.5 text-xs font-bold">{module.title}</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-1">
              {module.lessons.map((lesson) => {
                const done = progress.some((entry) => entry.lesson === lesson.id && entry.completed)
                const active = lesson.id === current.id
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelect(lesson)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                      active
                        ? 'bg-brand-orange text-white'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                        done ? 'bg-green-500 text-white' : active ? 'bg-white/20' : 'bg-white/10'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="ml-0.5 h-3 w-3 fill-current" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{lesson.title}</span>
                      <span
                        className={`mt-0.5 block text-[10px] ${active ? 'text-white/70' : 'text-white/35'}`}
                      >
                        {lesson.duration_min} min
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
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
  const index = current ? lessons.findIndex((l) => l.id === current.id) : -1
  const currentProgress = current ? progress.find((p) => p.lesson === current.id) : undefined
  const completedCount = progress.filter((p) => p.completed).length
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0

  async function handleDownload(mat: LessonMaterialRecord) {
    if (!enrollment || enrollment.situacao !== 'ativa') {
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

  function select(lesson: LessonRecord) {
    setCurrent(lesson)
    setParams({ aula: lesson.id }, { replace: true })
    setMobileLessons(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function complete() {
    if (!user || !bundle || !enrollment || !current || currentProgress?.completed) return
    try {
      const record = await saveLessonPosition({
        userId: user.id,
        lessonId: current.id,
        courseId: bundle.course.id,
        enrollmentId: enrollment.id,
        currentMinute: current.duration_min,
        completed: true,
      })
      setProgress((items) => [...items.filter((item) => item.lesson !== current.id), record])
      toast({
        title: '+10 pontos! Aula concluída',
        description: 'Consistência que vira transformação.',
      })

      const module = bundle.modules.find((item) => item.lessons.some((l) => l.id === current.id))
      const moduleDone = module?.lessons.every(
        (l) => l.id === current.id || progress.some((p) => p.lesson === l.id && p.completed),
      )
      const courseDone = lessons.every(
        (l) => l.id === current.id || progress.some((p) => p.lesson === l.id && p.completed),
      )
      if (moduleDone || courseDone) {
        setBurst(true)
        setTimeout(() => setBurst(false), 2200)
      }
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' })
    }
  }

  async function savePosition(minute: number) {
    if (!user || !bundle || !enrollment || !current || currentProgress?.completed) return
    try {
      const record = await saveLessonPosition({
        userId: user.id,
        lessonId: current.id,
        courseId: bundle.course.id,
        enrollmentId: enrollment.id,
        currentMinute: minute,
      })
      setProgress((items) => [...items.filter((item) => item.lesson !== current.id), record])
      toast({ title: `Ponto de retomada salvo no minuto ${minute}` })
    } catch {
      toast({ title: 'Não foi possível salvar a posição', variant: 'destructive' })
    }
  }

  if (loading || !bundle || !current) return <LoadingScreen label="Abrindo sua aula…" />
  const startSeconds = Math.floor((currentProgress?.current_minute || 0) * 60)

  return (
    <div className="route-page bg-[#0B1220] text-white">
      <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-[1fr_340px]">
        <main className="min-w-0">
          <div className="border-b border-white/10 px-5 py-4 sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to={user?.role === 'admin' ? '/admin/cursos' : '/app'}
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {user?.role === 'admin' ? 'Voltar ao Admin' : 'Meus cursos'}
                </Link>
                {user?.role === 'admin' && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                    Modo Observador (Admin)
                  </span>
                )}
              </div>
              <span className="hidden text-xs font-semibold text-white/40 sm:block">
                {bundle.course.title}
              </span>
              <Sheet open={mobileLessons} onOpenChange={setMobileLessons}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                  >
                    <ListVideo className="mr-2 h-4 w-4" />
                    Aulas
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[82vh] rounded-t-3xl border-white/10 bg-brand-navy text-white"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">Aulas do curso</SheetTitle>
                  </SheetHeader>
                  <div className="mt-5 max-h-[65vh] overflow-y-auto">
                    <LessonsList
                      bundle={bundle}
                      current={current}
                      progress={progress}
                      onSelect={select}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-0 sm:px-8 sm:py-8">
            <div className="aspect-video overflow-hidden bg-black sm:rounded-2xl sm:shadow-2xl">
              <iframe
                key={`${current.id}-${startSeconds}`}
                className="h-full w-full"
                src={getYoutubeEmbed(current.video_url, startSeconds, false)}
                title={current.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="px-5 py-7 sm:px-0">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                    Aula {index + 1} de {lessons.length}
                  </p>
                  <h1 className="mt-2 text-2xl font-extrabold tracking-[-.03em] sm:text-3xl">
                    {current.title}
                  </h1>
                </div>
                {currentProgress?.completed && (
                  <span className="hidden rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-extrabold text-green-400 sm:inline-flex">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Concluída
                  </span>
                )}
              </div>

              {currentProgress &&
                !currentProgress.completed &&
                currentProgress.current_minute > 0 && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-brand-orange/10 p-3 text-sm font-semibold text-brand-orange">
                    <Clock3 className="h-4 w-4" />
                    Retomando do minuto {Math.floor(currentProgress.current_minute)}
                  </div>
                )}

              {/* Abas da aula: Sobre & Materiais */}
              <div className="mt-7">
                <Tabs defaultValue="conteudo" className="w-full">
                  <TabsList className="h-11 rounded-full border border-white/10 bg-white/5 p-1">
                    <TabsTrigger
                      value="conteudo"
                      className="rounded-full px-5 text-xs font-bold data-[state=active]:bg-brand-orange data-[state=active]:text-white"
                    >
                      <Info className="mr-2 h-3.5 w-3.5" />
                      Sobre a aula
                    </TabsTrigger>
                    <TabsTrigger
                      value="materiais"
                      className="rounded-full px-5 text-xs font-bold data-[state=active]:bg-brand-orange data-[state=active]:text-white"
                    >
                      <FolderOpen className="mr-2 h-3.5 w-3.5" />
                      Materiais
                      {materials.length > 0 && (
                        <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                          {materials.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="conteudo" className="mt-5 space-y-5">
                    <p className="max-w-3xl leading-7 text-white/70">{current.description}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="mr-1 text-xs font-bold text-white/35">
                        Salvar posição rápida:
                      </span>
                      {[3, 5, 7, 10]
                        .filter((minute) => minute < current.duration_min)
                        .map((minute) => (
                          <button
                            key={minute}
                            onClick={() => void savePosition(minute)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/55 transition hover:border-brand-orange hover:text-brand-orange"
                          >
                            minuto {minute}
                          </button>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="materiais" className="mt-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h3 className="text-base font-extrabold text-white">
                            Materiais de apoio da aula
                          </h3>
                          <p className="text-xs text-white/45">
                            Arquivos para download (PDF, planilhas Excel) e links de aprofundamento.
                          </p>
                        </div>
                      </div>

                      {loadingMaterials ? (
                        <div className="flex items-center justify-center py-10 text-white/50">
                          <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-brand-orange" />
                          <span className="text-sm">Carregando materiais…</span>
                        </div>
                      ) : materials.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                          <FolderOpen className="mx-auto h-8 w-8 text-white/25" />
                          <p className="mt-2 text-sm font-semibold text-white/60">
                            Esta aula ainda não tem materiais.
                          </p>
                          <p className="text-xs text-white/35">
                            Quando o professor anexar PDFs, planilhas ou links, eles aparecerão
                            aqui.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {materials.map((mat) => {
                            const kind = getMaterialKind(mat)
                            const isExcel = kind === 'excel' || kind === 'csv'
                            const isPdf = kind === 'pdf'
                            const isLink = mat.tipo === 'link'
                            const isDownloading = downloadingId === mat.id

                            return (
                              <div
                                key={mat.id}
                                className="group flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-brand-navy/60 p-4 transition hover:border-white/25 hover:bg-brand-navy/90 sm:flex-row sm:items-center"
                              >
                                <div className="flex items-start gap-3.5">
                                  <div
                                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                      isPdf
                                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                        : isExcel
                                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                          : isLink
                                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {isPdf && <FileText className="h-5 w-5" />}
                                    {isExcel && <FileSpreadsheet className="h-5 w-5" />}
                                    {isLink && <ExternalLink className="h-5 w-5" />}
                                    {!isPdf && !isExcel && !isLink && (
                                      <FileText className="h-5 w-5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-sm font-bold text-white group-hover:text-brand-orange transition">
                                        {mat.titulo}
                                      </h4>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                          isPdf
                                            ? 'bg-rose-500/20 text-rose-300'
                                            : isExcel
                                              ? 'bg-emerald-500/20 text-emerald-300'
                                              : isLink
                                                ? 'bg-sky-500/20 text-sky-300'
                                                : 'bg-white/10 text-white/60'
                                        }`}
                                      >
                                        {isPdf
                                          ? 'PDF'
                                          : isExcel
                                            ? 'Excel'
                                            : isLink
                                              ? 'Link Externo'
                                              : 'Arquivo'}
                                      </span>
                                    </div>
                                    {mat.descricao && (
                                      <p className="mt-1 text-xs text-white/50 leading-relaxed">
                                        {mat.descricao}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2 sm:self-center">
                                  {isLink ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownload(mat)}
                                      className="rounded-full border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-white"
                                    >
                                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                      Abrir link
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      disabled={isDownloading}
                                      onClick={() => handleDownload(mat)}
                                      className={`rounded-full font-bold shadow-sm ${
                                        isExcel
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                          : 'bg-brand-orange hover:bg-brand-orange-dark text-white'
                                      }`}
                                    >
                                      {isDownloading ? (
                                        <>
                                          <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                          Baixando…
                                        </>
                                      ) : (
                                        <>
                                          <Download className="mr-1.5 h-3.5 w-3.5" />
                                          Baixar
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    disabled={index <= 0}
                    onClick={() => select(lessons[index - 1])}
                    variant="outline"
                    className="pill-button border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    disabled={index >= lessons.length - 1}
                    onClick={() => select(lessons[index + 1])}
                    variant="outline"
                    className="pill-button border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    Próxima <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <Button
                  disabled={currentProgress?.completed}
                  onClick={() => void complete()}
                  className={`pill-button ${
                    currentProgress?.completed
                      ? 'bg-green-600'
                      : 'bg-brand-orange hover:bg-brand-orange-dark'
                  }`}
                >
                  {currentProgress?.completed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Aula concluída
                    </>
                  ) : (
                    'Marcar como concluída'
                  )}
                </Button>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white/45">Progresso do curso</span>
                  <span className="text-brand-orange">{percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="progress-shine h-full rounded-full bg-brand-orange transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden border-l border-white/10 bg-brand-navy p-5 lg:block">
          <div className="sticky top-24">
            <h2 className="text-lg font-extrabold">{bundle.course.title}</h2>
            <p className="mt-1 text-xs text-white/40">
              {completedCount} de {lessons.length} aulas concluídas
            </p>
            <div className="mt-5 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              <LessonsList
                bundle={bundle}
                current={current}
                progress={progress}
                onSelect={select}
              />
            </div>
          </div>
        </aside>
      </div>

      {burst && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-brand-navy/80 backdrop-blur-sm">
          <div className="relative text-center">
            <div className="absolute inset-[-100px] animate-ping rounded-full border border-brand-orange/30" />
            <span className="mx-auto grid h-24 w-24 animate-check-pop place-items-center rounded-full bg-brand-orange text-white shadow-[0_0_80px_rgba(255,107,44,.5)]">
              <Award className="h-10 w-10" />
            </span>
            <Sparkles className="absolute -right-8 top-2 h-7 w-7 text-amber-300" />
            <Sparkles className="absolute -left-10 top-16 h-5 w-5 text-blue-300" />
            <h2 className="mt-7 text-3xl font-extrabold">Conquista desbloqueada!</h2>
            <p className="mt-2 text-white/60">Você concluiu uma etapa importante da sua trilha.</p>
          </div>
        </div>
      )}
    </div>
  )
}
