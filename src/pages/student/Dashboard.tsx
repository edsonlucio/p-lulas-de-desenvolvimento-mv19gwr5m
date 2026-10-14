import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronRight,
  Clock3,
  Flame,
  Lock,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CourseCover } from '@/components/CourseCover'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import { getLevel } from '@/lib/gamification'
import type {
  CourseBundle,
  CourseRecord,
  EnrollmentRecord,
  LessonProgressRecord,
  LessonRecord,
} from '@/lib/types'
import { formatDuration, getCourseBundle } from '@/services/courses'
import { listEnrollments, listProgress } from '@/services/student'
import {
  effectiveStreak,
  getGamificationSnapshot,
  type GamificationSnapshot,
} from '@/services/gamification'
import { useRealtime } from '@/hooks/use-realtime'

interface DashboardCourse {
  enrollment: EnrollmentRecord
  bundle: CourseBundle
  progress: LessonProgressRecord[]
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState<DashboardCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [gamification, setGamification] = useState<GamificationSnapshot | null>(null)
  const load = useCallback(async () => {
    if (!user) return
    const [enrollments, snapshot] = await Promise.all([
      listEnrollments(user.id),
      getGamificationSnapshot(user.id).catch(() => null),
    ])
    setGamification(snapshot)
    const loaded = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await import('@/lib/pocketbase/client').then(({ default: pb }) =>
          pb.collection<CourseRecord>('courses').getOne(enrollment.course),
        )
        const [bundle, progress] = await Promise.all([
          getCourseBundle(course.slug),
          listProgress(user.id, enrollment.course),
        ])
        return { enrollment, bundle, progress }
      }),
    )
    setItems(loaded)
    setLoading(false)
  }, [user])
  useEffect(() => {
    void load()
  }, [load])
  useRealtime<EnrollmentRecord>(
    'enrollments',
    () => {
      void load()
    },
    Boolean(user),
  )
  useRealtime<LessonProgressRecord>(
    'lesson_progress',
    () => {
      void load()
    },
    Boolean(user),
  )

  const continueData = useMemo(() => {
    for (const item of items) {
      const lessons = item.bundle.modules.flatMap((module) => module.lessons)
      const byUpdated = [...item.progress].sort((a, b) => b.updated.localeCompare(a.updated))
      const unfinished = byUpdated.find((entry) => !entry.completed && entry.current_minute > 0)
      if (unfinished) {
        const lesson = lessons.find((entry) => entry.id === unfinished.lesson)
        if (lesson) return { item, lesson, progress: unfinished }
      }
      const next = lessons.find(
        (lesson) => !item.progress.some((entry) => entry.lesson === lesson.id && entry.completed),
      )
      if (next) return { item, lesson: next, progress: undefined }
    }
    return null
  }, [items])
  const level = getLevel(user?.points || 0)
  if (loading) return <LoadingScreen label="Organizando sua trilha…" />

  return (
    <div className="route-page py-10 sm:py-14">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Sua área de desenvolvimento
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-4xl">
              Olá, {user?.name?.split(' ')[0] || 'Pílula'}! 👋
            </h1>
            <p className="mt-2 text-brand-muted">Qual será o seu próximo movimento hoje?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="pill-button">
              <Link to="/app/comunidade">
                <MessageSquare className="mr-2 h-4 w-4 text-brand-orange" />
                Comunidade
              </Link>
            </Button>
            <Button asChild variant="outline" className="pill-button">
              <Link to="/app/busca">
                <Search className="mr-2 h-4 w-4" />
                Buscar aulas
              </Link>
            </Button>
            <Button asChild variant="outline" className="pill-button">
              <Link to="/app/perfil">
                <UserRound className="mr-2 h-4 w-4" />
                Meu perfil
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-9 grid gap-7 lg:grid-cols-[1fr_330px]">
          <div className="min-w-0 space-y-10">
            {continueData ? (
              <section>
                <h2 className="text-xl font-extrabold text-brand-navy">Continue de onde parou</h2>
                <article className="mt-4 overflow-hidden rounded-3xl bg-brand-navy text-white shadow-xl">
                  <div className="grid sm:grid-cols-[260px_1fr]">
                    <CourseCover
                      course={continueData.item.bundle.course}
                      className="min-h-[210px]"
                      showPlay
                    />
                    <div className="relative flex flex-col justify-center p-7">
                      <div className="orange-glow absolute right-[-100px] top-[-140px] h-80 w-80" />
                      <div className="relative">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                          {continueData.item.bundle.course.title}
                        </span>
                        <h3 className="mt-2 text-2xl font-extrabold">
                          {continueData.lesson.title}
                        </h3>
                        <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                          <Clock3 className="h-4 w-4" />
                          {continueData.progress
                            ? `Continuar do minuto ${Math.floor(continueData.progress.current_minute)}`
                            : `Começar · ${continueData.lesson.duration_min} min`}
                        </p>
                        <Button
                          asChild
                          className="pill-button mt-6 bg-brand-orange hover:bg-brand-orange-dark"
                        >
                          <Link
                            to={`/app/curso/${continueData.item.bundle.course.slug}?aula=${continueData.lesson.id}`}
                          >
                            {continueData.progress ? 'Retomar aula' : 'Começar aula'}{' '}
                            <Play className="ml-2 h-4 w-4 fill-current" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Sua próxima aula começa aqui"
                description="Escolha um curso no catálogo para iniciar sua trilha."
                action={
                  <Button asChild className="pill-button bg-brand-orange">
                    <Link to="/cursos">Explorar cursos</Link>
                  </Button>
                }
              />
            )}
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-brand-navy">Meus cursos</h2>
                <Link
                  to="/cursos"
                  className="flex items-center gap-1 text-sm font-bold text-brand-orange"
                >
                  Explorar mais <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {items.length ? (
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {items.map(({ bundle, progress }) => {
                    const completed = progress.filter((item) => item.completed).length
                    const percent = bundle.lessonCount
                      ? Math.round((completed / bundle.lessonCount) * 100)
                      : 0
                    return (
                      <Link
                        key={bundle.course.id}
                        to={`/app/curso/${bundle.course.slug}`}
                        className="interactive-card group overflow-hidden"
                      >
                        <CourseCover course={bundle.course} className="aspect-video" />
                        <div className="p-5">
                          <h3 className="text-lg font-extrabold text-brand-navy">
                            {bundle.course.title}
                          </h3>
                          <p className="mt-1 text-xs text-brand-muted">
                            {bundle.modules.length} módulos · {bundle.lessonCount} aulas ·{' '}
                            {formatDuration(bundle.duration)}
                          </p>
                          <div className="mt-5 flex items-center justify-between text-xs font-bold">
                            <span className="text-brand-muted">
                              {completed} de {bundle.lessonCount} aulas
                            </span>
                            <span className="text-brand-orange">{percent}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-subtle">
                            <div
                              className="progress-shine h-full rounded-full bg-brand-orange transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon={BookOpen}
                    title="Nenhum curso por enquanto"
                    description="Sua biblioteca ganha vida assim que um pagamento simulado for confirmado."
                  />
                </div>
              )}
            </section>
          </div>
          <aside className="space-y-5">
            <div className="surface-card overflow-hidden">
              <div className="bg-brand-navy p-6 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/60">Meus pontos</span>
                  <Award className="h-5 w-5 text-brand-orange" />
                </div>
                {(() => {
                  const streak = effectiveStreak(gamification?.pontuacao ?? null)
                  return streak > 0 ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-sm font-extrabold text-amber-200">
                      <Flame className="h-4 w-4" />
                      {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
                    </div>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/60">
                      <Flame className="h-4 w-4" />
                      Complete uma aula hoje e comece sua sequência de dias.
                    </p>
                  )
                })()}
                <div className="mt-6 flex items-center gap-5">
                  <div
                    className="relative grid h-24 w-24 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(${level.color} ${level.progress}%, rgba(255,255,255,.1) 0)`,
                    }}
                  >
                    <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-brand-navy text-center">
                      <div>
                        <strong className="block text-xl font-extrabold">
                          {user?.points || 0}
                        </strong>
                        <span className="text-[9px] uppercase tracking-wider text-white/45">
                          pontos
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-white/50">Nível atual</span>
                    <strong
                      className="mt-1 block text-xl font-extrabold"
                      style={{ color: level.color }}
                    >
                      {level.name}
                    </strong>
                    {level.next && (
                      <p className="mt-2 text-xs text-white/50">
                        Faltam {level.remaining} pts para {level.next.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <Link
                  to="/app/perfil#trilha"
                  className="flex items-center justify-between text-sm font-extrabold text-brand-navy"
                >
                  Ver histórico de pontos <ArrowRight className="h-4 w-4 text-brand-orange" />
                </Link>
              </div>
            </div>
            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                  Recompensas
                </p>
                <Trophy className="h-4 w-4 text-brand-orange" />
              </div>
              <div className="mt-4 space-y-2">
                {(gamification?.rewardsView ?? []).map((reward) => (
                  <div
                    key={reward.code}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      reward.unlocked
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-brand-border bg-brand-subtle/60'
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        reward.unlocked
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-white text-brand-muted/50'
                      }`}
                    >
                      {reward.unlocked ? (
                        <Award className="h-4 w-4" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`truncate text-xs font-extrabold ${
                          reward.unlocked ? 'text-amber-700' : 'text-brand-muted'
                        }`}
                      >
                        {reward.title}
                      </p>
                      <p className="truncate text-[10px] text-brand-muted">{reward.description}</p>
                    </div>
                  </div>
                ))}
                {!gamification && (
                  <p className="text-xs text-brand-muted">Carregando conquistas…</p>
                )}
              </div>
            </div>
            <div className="surface-card p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                Pílula do dia
              </p>
              <blockquote className="mt-3 text-sm font-semibold leading-6 text-brand-navy">
                “Consistência é continuar quando a motivação decidiu tirar uma folga.”
              </blockquote>
              <p className="mt-3 text-xs text-brand-muted">— Edson Lúcio</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
