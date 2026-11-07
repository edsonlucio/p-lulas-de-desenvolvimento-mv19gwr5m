import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Unlock,
  UsersRound,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CourseCover } from '@/components/CourseCover'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import type { ComboRecord, CourseBundle, LessonRecord } from '@/lib/types'
import { findCombosForCourse } from '@/services/combos'
import { getYoutubeEmbed } from '@/lib/youtube'
import { formatDuration, formatPrice, getCourseBundle } from '@/services/courses'
import { findEnrollment } from '@/services/student'
import { Package } from 'lucide-react'

export default function CourseDetail() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<CourseBundle | null>(null)
  const [relatedCombos, setRelatedCombos] = useState<ComboRecord[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [preview, setPreview] = useState<LessonRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCourseBundle(slug)
      .then(async (data) => {
        setBundle(data)
        if (user) setEnrolled(Boolean(await findEnrollment(user.id, data.course.id)))
        try {
          const combos = await findCombosForCourse(data.course.id)
          setRelatedCombos(combos)
        } catch {
          /* ignore */
        }
      })
      .finally(() => setLoading(false))
  }, [slug, user])

  if (loading) return <LoadingScreen />
  if (!bundle)
    return (
      <div className="container-site py-24 text-center">
        <h1 className="section-title">Curso não encontrado</h1>
        <Button asChild className="pill-button mt-6">
          <Link to="/cursos">Voltar aos cursos</Link>
        </Button>
      </div>
    )

  const { course, modules, duration, lessonCount } = bundle

  // Redireciona para o cadastro se não estiver logado, ou checkout/área do aluno
  const handleCtaClick = () => {
    if (enrolled) {
      navigate(`/app/curso/${course.slug}`)
      return
    }
    if (!user) {
      navigate(`/cadastro?redirect=${encodeURIComponent(`/checkout/${course.slug}`)}`)
      return
    }
    navigate(`/checkout/${course.slug}`)
  }

  // Gera de 3 a 5 itens práticos para "O que você vai aprender"
  const learningItems = (() => {
    const list: string[] = []

    // 1. Tentar pegar títulos significativos dos módulos
    for (const mod of modules) {
      if (mod.title && !list.includes(mod.title)) {
        list.push(mod.title)
      }
      if (list.length >= 5) break
    }

    // 2. Se tiver menos que 3, tentar completar com títulos de aulas
    if (list.length < 3) {
      for (const mod of modules) {
        for (const lesson of mod.lessons) {
          if (lesson.title && !list.includes(lesson.title)) {
            list.push(lesson.title)
          }
          if (list.length >= 4) break
        }
        if (list.length >= 4) break
      }
    }

    // 3. Fallbacks contextualizados se ainda faltarem itens
    const defaults = [
      'Visão estratégica e prática aplicada ao seu dia a dia profissional',
      'Métodos comprovados e sem rodeios para tomada de decisão ágil',
      'Passo a passo organizado para executar e mensurar seus resultados',
      'Comunicação assertiva e postura de liderança no novo mercado',
    ]

    for (const item of defaults) {
      if (list.length >= 4) break
      if (!list.includes(item)) {
        list.push(item)
      }
    }

    return list.slice(0, 5)
  })()

  return (
    <div className="route-page pb-28 sm:pb-24">
      {/* Hero do Curso */}
      <section className="relative overflow-hidden bg-brand-navy py-14 text-white sm:py-20">
        <div className="orange-glow absolute -right-28 top-[-200px] h-[600px] w-[600px]" />
        <div className="container-site relative grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-4 w-4" /> Curso · {course.category}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-.05em] sm:text-5xl lg:text-6xl">
              {course.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {course.subtitle || course.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/70">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-orange" />
                {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
              </span>
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 text-brand-orange" />
                {lessonCount} {lessonCount === 1 ? 'aula' : 'aulas'}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-orange" />
                {formatDuration(duration)}
              </span>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <strong className="text-4xl font-extrabold">{formatPrice(course.price)}</strong>
              <Button
                onClick={handleCtaClick}
                className="pill-button bg-brand-orange px-8 text-base font-extrabold shadow-lg hover:bg-brand-orange-dark"
              >
                {enrolled ? 'Continuar assistindo' : 'Quero este curso'}{' '}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <CourseCover
            course={course}
            className="aspect-video rounded-3xl border border-white/10 shadow-2xl"
            showPlay
          />
        </div>
      </section>

      {/* Conteúdo Principal */}
      <section className="section-space">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            {/* O que você vai aprender (3 a 5 itens) */}
            <div className="rounded-3xl border border-brand-border bg-white p-7 sm:p-9 shadow-card">
              <span className="eyebrow">
                <Sparkles className="h-4 w-4" /> Objetivos práticos
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-brand-navy sm:text-3xl">
                O que você vai aprender
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-muted">
                Competências diretas e aplicáveis que você dominará ao concluir este treinamento:
              </p>
              <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                {learningItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl bg-brand-subtle/80 p-4 transition-colors hover:bg-brand-subtle"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="text-sm font-bold text-brand-navy leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descrição Completa do Curso */}
            {course.description && (
              <div className="mt-10 rounded-3xl border border-brand-border bg-white p-7 sm:p-9 shadow-card">
                <span className="eyebrow">
                  <GraduationCap className="h-4 w-4" /> Sobre o treinamento
                </span>
                <h2 className="mt-3 text-2xl font-extrabold text-brand-navy">Descrição</h2>
                <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-brand-muted">
                  {course.description}
                </p>
              </div>
            )}

            {/* Selo / Bloco: Este curso faz parte de um combo */}
            {relatedCombos.length > 0 && (
              <div className="mt-10 rounded-2xl border-2 border-brand-orange/40 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/40 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-orange text-white shadow-sm">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-orange">
                          Oportunidade 3 em 1
                        </span>
                        <span className="text-xs text-brand-muted">Economia garantida</span>
                      </div>
                      <h3 className="mt-1 text-base font-extrabold text-brand-navy sm:text-lg">
                        Este curso faz parte do combo{' '}
                        <span className="text-brand-orange">{relatedCombos[0].title}</span>
                      </h3>
                      <p className="mt-1 text-xs text-brand-muted">
                        Leve este e mais 2 cursos completos juntos pagando muito menos do que
                        comprando avulso.
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 border-t border-brand-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div>
                      <span className="block text-[11px] font-bold text-brand-muted">
                        Preço do Combo (3 cursos):
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <strong className="text-2xl font-black text-brand-orange">
                          {formatPrice(relatedCombos[0].price)}
                        </strong>
                        {relatedCombos[0].original_price &&
                          relatedCombos[0].original_price > relatedCombos[0].price && (
                            <span className="text-xs text-brand-muted line-through">
                              {formatPrice(relatedCombos[0].original_price)}
                            </span>
                          )}
                      </div>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white font-extrabold shadow-sm"
                    >
                      <Link to={`/checkout?combo=${relatedCombos[0].id}`}>
                        Quero o Combo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Módulos com Duração de Cada Um e Status Liberado/Cadeado */}
            <div className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="eyebrow">
                    <BookOpen className="h-4 w-4" /> Estrutura do curso
                  </span>
                  <h2 className="section-title mt-2">Módulos e Aulas</h2>
                  <p className="body-muted mt-1 max-w-2xl">
                    O 1º módulo está aberto para demonstração. Os demais módulos são liberados após
                    a confirmação da compra. Ao final de cada módulo há avaliação prática com
                    feedback imediato e emissão de certificado oficial com média ≥ 70%.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs font-semibold text-brand-muted">
                    {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} · {lessonCount}{' '}
                    {lessonCount === 1 ? 'aula' : 'aulas'}
                  </div>
                  {enrolled && (
                    <Link
                      to={`/app/curso/${course.slug}/certificado`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline"
                    >
                      <Award className="h-3.5 w-3.5" />
                      Ver Certificado
                    </Link>
                  )}
                </div>
              </div>

              <Accordion
                type="multiple"
                defaultValue={modules.length > 0 ? [modules[0].id] : []}
                className="mt-6 space-y-4"
              >
                {modules.map((module, moduleIndex) => {
                  const isUnlocked = enrolled || moduleIndex === 0
                  const moduleDuration = module.lessons.reduce(
                    (total, l) => total + Number(l.duration_min || 0),
                    0,
                  )

                  return (
                    <AccordionItem
                      key={module.id}
                      value={module.id}
                      className={`overflow-hidden rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'border-brand-border bg-white shadow-card'
                          : 'border-brand-border/70 bg-stone-50/70 opacity-95'
                      }`}
                    >
                      <AccordionTrigger className="px-5 py-5 hover:no-underline">
                        <div className="flex flex-1 items-start justify-between gap-4 text-left pr-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                                Módulo {moduleIndex + 1}
                              </span>
                              {isUnlocked ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-700"
                                >
                                  <Unlock className="mr-1 h-3 w-3 text-emerald-600" /> Liberado
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-stone-200 bg-stone-100 text-[11px] font-bold text-stone-600"
                                >
                                  <Lock className="mr-1 h-3 w-3 text-stone-500" /> Liberado após a
                                  compra
                                </Badge>
                              )}
                            </div>
                            <h3 className="mt-1 text-base font-extrabold text-brand-navy sm:text-lg">
                              {module.title}
                            </h3>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                            <span className="flex items-center gap-1 text-xs font-bold text-brand-muted">
                              <Clock3 className="h-3.5 w-3.5 text-brand-orange" />
                              {formatDuration(moduleDuration)}
                            </span>
                            <span className="text-[11px] text-brand-muted">
                              {module.lessons.length}{' '}
                              {module.lessons.length === 1 ? 'aula' : 'aulas'}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-1">
                        <div className="space-y-2 border-t border-brand-border/50 pt-3">
                          {module.lessons.length === 0 ? (
                            <p className="py-2 text-xs italic text-brand-muted">
                              Aulas sendo preparadas para este módulo.
                            </p>
                          ) : (
                            module.lessons.map((lesson, lessonIdx) => {
                              const canPreview = isUnlocked && (lesson.is_free || moduleIndex === 0)
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-brand-border hover:bg-brand-subtle"
                                >
                                  <span
                                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                                      lesson.is_free
                                        ? 'bg-brand-orange text-white'
                                        : isUnlocked
                                          ? 'bg-brand-subtle text-brand-navy'
                                          : 'bg-stone-200 text-stone-500'
                                    }`}
                                  >
                                    {lesson.is_free ? (
                                      <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                                    ) : (
                                      lessonIdx + 1
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-brand-navy">
                                      {lesson.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-brand-muted">
                                      {lesson.duration_min} min
                                      {lesson.is_free && ' · Aula gratuita de degustação'}
                                      {!isUnlocked && ' · Bloqueado'}
                                    </p>
                                  </div>
                                  {canPreview ? (
                                    <button
                                      onClick={() => setPreview(lesson)}
                                      className="rounded-full px-3 py-1.5 text-xs font-extrabold text-brand-orange hover:bg-brand-orange/10"
                                    >
                                      Assistir
                                    </button>
                                  ) : (
                                    <Lock className="h-4 w-4 shrink-0 text-brand-muted/50" />
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>

            {/* Mentor e Para quem é */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="surface-card p-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                  <UsersRound className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-brand-navy">
                  Para quem é este curso
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-muted">
                  {[
                    'Profissionais que querem vender com mais estratégia',
                    'Empreendedores construindo presença digital',
                    'Líderes que desejam comunicar valor com clareza',
                    'Quem busca um plano prático e possível de executar',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface-card p-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-500">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-brand-navy">Seu mentor</h2>
                <p className="mt-4 text-sm leading-6 text-brand-muted">
                  Edson Lúcio une mais de 10 anos de experiência a uma comunicação motivadora e sem
                  rodeios. Cada aula termina com algo que você pode aplicar.
                </p>
                <a
                  href="https://www.instagram.com/edsonlucio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-brand-orange hover:text-brand-orange-dark transition-colors"
                >
                  Conhecer Edson (@edsonlucio) <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Coluna Lateral Desktop (Sticky com Botão Quero este curso) */}
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-28 overflow-hidden border border-brand-border shadow-xl">
              <CourseCover course={course} className="aspect-video" />
              <div className="p-6">
                <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
                  Acesso Completo
                </span>
                <p className="mt-3 text-sm text-brand-muted">Investimento único</p>
                <strong className="mt-1 block text-3xl font-extrabold text-brand-navy">
                  {formatPrice(course.price)}
                </strong>
                <p className="mt-2 text-xs text-brand-muted">
                  1º módulo liberado imediatamente · liberação integral dos demais após a compra
                </p>
                <Button
                  onClick={handleCtaClick}
                  className="pill-button mt-6 w-full bg-brand-orange py-6 text-base font-extrabold hover:bg-brand-orange-dark shadow-md"
                >
                  {enrolled ? 'Continuar assistindo' : 'Quero este curso'}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {/* Destaque do Combo na Sidebar */}
                {relatedCombos.length > 0 && (
                  <div className="mt-5 rounded-xl border border-brand-orange/30 bg-orange-50/50 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-brand-orange">
                      <Layers className="h-3.5 w-3.5" /> Também no Combo
                    </div>
                    <p className="mt-1 text-xs text-brand-navy font-bold line-clamp-1">
                      {relatedCombos[0].title}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-brand-muted">3 cursos por:</span>
                      <strong className="text-sm font-black text-brand-orange">
                        {formatPrice(relatedCombos[0].price)}
                      </strong>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="pill-button mt-2.5 w-full border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white text-xs font-bold"
                    >
                      <Link to={`/checkout?combo=${relatedCombos[0].id}`}>
                        Quero o Combo 3 em 1
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-brand-muted">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Garantia e acesso imediato
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Barra Fixa Mobile com Botão "Quero este curso" */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white/95 p-3.5 shadow-[0_-8px_30px_rgba(16,24,40,.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-brand-muted block">Investimento</span>
            <strong className="text-xl font-extrabold text-brand-navy">
              {formatPrice(course.price)}
            </strong>
          </div>
          <Button
            onClick={handleCtaClick}
            className="pill-button flex-1 bg-brand-orange py-5 text-sm font-extrabold hover:bg-brand-orange-dark shadow-md"
          >
            {enrolled ? 'Continuar' : 'Quero este curso'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal de Preview de Aula */}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden">
          <div className="aspect-video bg-brand-navy">
            {preview && (
              <iframe
                className="h-full w-full"
                src={getYoutubeEmbed(preview.video_url, 0, true)}
                title={preview.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <DialogHeader className="p-6 pt-2">
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
