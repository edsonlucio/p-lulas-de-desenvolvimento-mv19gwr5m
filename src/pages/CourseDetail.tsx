import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import type { CourseBundle, LessonRecord } from '@/lib/types'
import { getYoutubeEmbed } from '@/lib/youtube'
import { formatDuration, formatPrice, getCourseBundle } from '@/services/courses'
import { findEnrollment } from '@/services/student'

export default function CourseDetail() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<CourseBundle | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [preview, setPreview] = useState<LessonRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCourseBundle(slug)
      .then(async (data) => {
        setBundle(data)
        if (user) setEnrolled(Boolean(await findEnrollment(user.id, data.course.id)))
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
  const firstLesson = modules.flatMap((module) => module.lessons)[0]
  const action = () => {
    if (enrolled) return navigate(`/app/curso/${course.slug}`)
    if (!user) return navigate(`/entrar?redirect=${encodeURIComponent(`/checkout/${course.slug}`)}`)
    navigate(`/checkout/${course.slug}`)
  }

  return (
    <div className="route-page pb-24 sm:pb-0">
      <section className="relative overflow-hidden bg-brand-navy py-14 text-white sm:py-20">
        <div className="orange-glow absolute -right-28 top-[-200px] h-[600px] w-[600px]" />
        <div className="container-site relative grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-4 w-4" /> Curso · {course.category}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-.05em] sm:text-6xl">
              {course.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">{course.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/60">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-orange" />
                {modules.length} módulos
              </span>
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 text-brand-orange" />
                {lessonCount} aulas
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-orange" />
                {formatDuration(duration)}
              </span>
            </div>
            <div className="mt-9 flex items-center gap-5">
              <strong className="text-4xl font-extrabold">{formatPrice(course.price)}</strong>
              <Button
                onClick={action}
                className="pill-button bg-brand-orange px-7 hover:bg-brand-orange-dark"
              >
                {enrolled ? 'Continuar assistindo' : 'Comprar agora'}{' '}
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
      <section className="section-space">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <div>
              <span className="eyebrow">
                <GraduationCap className="h-4 w-4" /> Conteúdo do curso
              </span>
              <h2 className="section-title mt-3">Um passo claro de cada vez.</h2>
              <p className="body-muted mt-4 max-w-2xl">{course.description}</p>
            </div>
            <Accordion type="multiple" defaultValue={[modules[0]?.id]} className="mt-9 space-y-4">
              {modules.map((module, moduleIndex) => (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="overflow-hidden rounded-2xl border border-brand-border bg-white px-5 shadow-card"
                >
                  <AccordionTrigger className="py-5 hover:no-underline">
                    <div className="text-left">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                        Módulo {moduleIndex + 1}
                      </span>
                      <h3 className="mt-1 font-extrabold text-brand-navy">{module.title}</h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {module.lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 rounded-xl border border-transparent p-3 hover:border-brand-border hover:bg-brand-subtle"
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${lesson.is_free ? 'bg-brand-orange text-white' : 'bg-brand-subtle text-brand-muted'}`}
                          >
                            {lesson.is_free ? (
                              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                            ) : (
                              <span className="text-xs font-extrabold">{index + 1}</span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-brand-navy">
                              {lesson.title}
                            </p>
                            <p className="mt-0.5 text-xs text-brand-muted">
                              {lesson.duration_min} min {lesson.is_free && '· Aula gratuita'}
                            </p>
                          </div>
                          {lesson.is_free ? (
                            <button
                              onClick={() => setPreview(lesson)}
                              className="rounded-full px-3 py-1.5 text-xs font-extrabold text-brand-orange hover:bg-brand-orange/10"
                            >
                              Assistir
                            </button>
                          ) : (
                            <Lock className="h-4 w-4 text-brand-muted/50" />
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
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
                      <Check className="mt-1 h-4 w-4 shrink-0 text-green-600" />
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
                  href="https://www.instagram.com/prof_edsonlucio"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-brand-orange"
                >
                  Conhecer Edson <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-28 overflow-hidden">
              <CourseCover course={course} className="aspect-video" />
              <div className="p-6">
                <p className="text-sm text-brand-muted">Investimento</p>
                <strong className="mt-1 block text-3xl font-extrabold text-brand-navy">
                  {formatPrice(course.price)}
                </strong>
                <p className="mt-2 text-xs text-brand-muted">
                  Checkout demonstrativo · acesso liberado após confirmação
                </p>
                <Button
                  onClick={action}
                  className="pill-button mt-6 w-full bg-brand-orange hover:bg-brand-orange-dark"
                >
                  {enrolled ? 'Continuar assistindo' : 'Comprar agora'}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-brand-muted">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Acesso imediato e seguro
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white/95 p-3 shadow-[0_-8px_30px_rgba(16,24,40,.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <strong className="text-xl font-extrabold text-brand-navy">
            {formatPrice(course.price)}
          </strong>
          <Button
            onClick={action}
            className="pill-button flex-1 bg-brand-orange hover:bg-brand-orange-dark"
          >
            {enrolled ? 'Continuar' : 'Comprar'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
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
