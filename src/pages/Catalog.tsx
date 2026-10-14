import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, SearchX, SlidersHorizontal, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CourseCover } from '@/components/CourseCover'
import { EmptyState } from '@/components/EmptyState'
import { LoadingScreen } from '@/components/LoadingScreen'
import type { CourseCategory, CourseRecord } from '@/lib/types'
import {
  formatDuration,
  formatPrice,
  getCourseCounts,
  listPublishedCourses,
} from '@/services/courses'

const filters: Array<{ label: string; value: 'todos' | CourseCategory }> = [
  { label: 'Todos', value: 'todos' },
  { label: 'Vendas', value: 'vendas' },
  { label: 'Liderança', value: 'lideranca' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Motivacional', value: 'motivacional' },
]

export default function Catalog() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [counts, setCounts] = useState(
    new Map<string, { modules: number; lessons: number; duration: number }>(),
  )
  const [category, setCategory] = useState<(typeof filters)[number]['value']>('todos')
  const [sort, setSort] = useState('recentes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPublishedCourses()
      .then(async (records) => {
        setCourses(records)
        setCounts(await getCourseCounts(records.map((item) => item.id)))
      })
      .finally(() => setLoading(false))
  }, [])
  const visible = useMemo(
    () =>
      courses
        .filter((course) => category === 'todos' || course.category === category)
        .sort((a, b) =>
          sort === 'vendidos' ? b.price - a.price : b.created.localeCompare(a.created),
        ),
    [category, courses, sort],
  )

  return (
    <div className="route-page">
      <section className="relative overflow-hidden bg-brand-navy py-16 text-white sm:py-20">
        <div className="orange-glow absolute -left-40 top-[-220px] h-[600px] w-[600px]" />
        <div className="container-site relative">
          <span className="eyebrow">
            <Sparkles className="h-4 w-4" /> Escolha sua próxima pílula
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
            Conhecimento prático para quem quer avançar de verdade.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-white/65">
            Cursos em vídeo sobre vendas, liderança, marketing e mentalidade. Comece pequeno,
            aplique hoje e cresça todos os dias.
          </p>
        </div>
      </section>
      <section className="section-space">
        <div className="container-site">
          <div className="flex flex-col gap-5 rounded-2xl border border-brand-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {filters.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setCategory(item.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${category === item.value ? 'bg-brand-orange text-white shadow-md' : 'bg-brand-subtle text-brand-muted hover:text-brand-navy'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full rounded-full sm:w-[190px]">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="vendidos">Mais vendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <LoadingScreen label="Abrindo a vitrine…" />
          ) : visible.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((course) => {
                const meta = counts.get(course.id)
                return (
                  <article key={course.id} className="interactive-card group overflow-hidden">
                    <div className="overflow-hidden">
                      <CourseCover
                        course={course}
                        className="aspect-video transition-transform duration-500 group-hover:scale-[1.035]"
                      />
                    </div>
                    <div className="p-6">
                      <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
                        {filters.find((item) => item.value === course.category)?.label}
                      </span>
                      <h2 className="mt-4 text-xl font-extrabold text-brand-navy">
                        {course.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-brand-muted">
                        {course.subtitle}
                      </p>
                      <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-muted">
                        <BookOpen className="h-4 w-4 text-brand-orange" />
                        {meta?.modules ?? 0} módulos · {meta?.lessons ?? 0} aulas ·{' '}
                        {formatDuration(meta?.duration ?? 0)}
                      </p>
                      <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-5">
                        <strong className="text-2xl font-extrabold text-brand-navy">
                          {formatPrice(course.price)}
                        </strong>
                        <Button
                          asChild
                          variant="ghost"
                          className="pill-button text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange-dark"
                        >
                          <Link to={`/cursos/${course.slug}`}>
                            Ver detalhes <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                icon={SearchX}
                title="Ainda não há pílulas nesta categoria"
                description="Novos conteúdos estão sendo preparados. Enquanto isso, explore todos os cursos disponíveis."
                action={
                  <Button
                    className="pill-button bg-brand-orange hover:bg-brand-orange-dark"
                    onClick={() => setCategory('todos')}
                  >
                    Ver todos os cursos
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
