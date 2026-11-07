import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  Package,
  SearchX,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

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
import type { ComboRecord, CourseCategory, CourseRecord } from '@/lib/types'
import { listActiveCombos } from '@/services/combos'
import { formatPrice, getCourseCounts, listPublishedCourses } from '@/services/courses'

const filters: Array<{ label: string; value: 'todos' | CourseCategory }> = [
  { label: 'Todos', value: 'todos' },
  { label: 'Vendas', value: 'vendas' },
  { label: 'Liderança', value: 'lideranca' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Motivacional', value: 'motivacional' },
]

export default function Catalog() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [combos, setCombos] = useState<ComboRecord[]>([])
  const [counts, setCounts] = useState(
    new Map<string, { modules: number; lessons: number; duration: number }>(),
  )
  const [category, setCategory] = useState<(typeof filters)[number]['value']>('todos')
  const [sort, setSort] = useState('recentes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listPublishedCourses(), listActiveCombos().catch(() => [])])
      .then(async ([records, activeCombos]) => {
        setCourses(records)
        setCombos(activeCombos)
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
          {/* Seção de Combos em Destaque */}
          {!loading && combos.length > 0 && (
            <div className="mb-14 mt-4">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <span className="eyebrow">
                    <Package className="h-4 w-4" /> Economia inteligente
                  </span>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-brand-navy sm:text-3xl">
                    Combos Especiais (3 em 1)
                  </h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    Garanta 3 cursos completos de uma vez com desconto exclusivo e liberação
                    imediata.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {combos.map((combo) => {
                  const comboCourses = combo.expand?.courses || []
                  const sumOriginal =
                    combo.original_price || comboCourses.reduce((acc, c) => acc + (c.price || 0), 0)
                  const discount = sumOriginal > combo.price ? sumOriginal - combo.price : 0

                  return (
                    <article
                      key={combo.id}
                      className="interactive-card relative flex flex-col justify-between overflow-hidden border-2 border-brand-orange/30 bg-gradient-to-b from-white to-orange-50/20 shadow-md"
                    >
                      <div className="absolute right-4 top-4 rounded-full bg-brand-orange px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm">
                        Combo 3 em 1
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                          <Layers className="h-4 w-4" />
                          Formação Completa
                        </div>
                        <h3 className="mt-3 text-xl font-black text-brand-navy">{combo.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-brand-muted">
                          {combo.description ||
                            'Leve 3 cursos essenciais reunidos em uma única inscrição com acesso ilimitado.'}
                        </p>

                        <div className="mt-5 rounded-xl border border-brand-orange/20 bg-white/80 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                            Os 3 cursos inclusos:
                          </p>
                          <ul className="mt-2.5 space-y-2">
                            {comboCourses.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-start gap-2 text-xs font-medium text-brand-navy"
                              >
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span className="line-clamp-1">{c.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-brand-border/60 bg-white/60 p-6">
                        <div className="mb-4">
                          {sumOriginal > combo.price && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-brand-muted line-through">
                                De {formatPrice(sumOriginal)}
                              </span>
                              {discount > 0 && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                                  Economize {formatPrice(discount)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-xs font-bold text-brand-navy">Por apenas</span>
                            <strong className="text-3xl font-black text-brand-orange">
                              {formatPrice(combo.price)}
                            </strong>
                          </div>
                        </div>

                        <Button
                          asChild
                          className="pill-button w-full h-11 bg-brand-orange text-sm font-extrabold text-white shadow hover:bg-brand-orange-dark"
                        >
                          <Link to={`/checkout?combo=${combo.id}`}>
                            Quero o combo <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

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
                      {/* Exatamente uma linha de descrição */}
                      <p className="mt-2 truncate text-sm leading-6 text-brand-muted">
                        {course.subtitle || course.description}
                      </p>
                      {/* Total de módulos e aulas */}
                      <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-muted">
                        <BookOpen className="h-4 w-4 text-brand-orange" />
                        {meta?.modules ?? 0} {meta?.modules === 1 ? 'módulo' : 'módulos'} ·{' '}
                        {meta?.lessons ?? 0} {meta?.lessons === 1 ? 'aula' : 'aulas'}
                      </p>
                      <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-5">
                        <strong className="text-2xl font-extrabold text-brand-navy">
                          {formatPrice(course.price)}
                        </strong>
                        <Button
                          asChild
                          className="pill-button bg-brand-orange px-5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-orange-dark"
                        >
                          <Link to={`/cursos/${course.slug}`}>
                            Conhecer <ArrowRight className="ml-1.5 h-4 w-4" />
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
