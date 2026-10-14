import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle,
  Clock,
  DollarSign,
  GraduationCap,
  Percent,
  Receipt,
  Sparkles,
  TrendingUp,
  UserX,
  UsersRound,
} from 'lucide-react'

import { LoadingScreen } from '@/components/LoadingScreen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLevel, LEVELS } from '@/lib/gamification'
import pb from '@/lib/pocketbase/client'
import type {
  CourseRecord,
  EnrollmentRecord,
  LessonProgressRecord,
  LessonRecord,
  OrderRecord,
  UserRecord,
} from '@/lib/types'
import { getAdminSnapshot } from '@/services/admin'
import { listAllCourses } from '@/services/courses'

interface Snapshot {
  users: UserRecord[]
  enrollments: EnrollmentRecord[]
  orders: OrderRecord[]
  progress: LessonProgressRecord[]
  allProgress: LessonProgressRecord[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [allLessons, setAllLessons] = useState<LessonRecord[]>([])

  useEffect(() => {
    Promise.all([
      getAdminSnapshot(),
      listAllCourses(),
      pb.collection<LessonRecord>('lessons').getFullList({
        filter: 'situacao = "ativo"',
        expand: 'module',
      }),
    ]).then(([snapshot, records, lessons]) => {
      setData(snapshot)
      setCourses(records)
      setAllLessons(lessons)
    })
  }, [])
  const revenue =
    data?.orders
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + order.amount, 0) || 0
  const courseBars = useMemo(
    () =>
      courses.map((course) => ({
        course,
        count: data?.enrollments.filter((item) => item.course === course.id).length || 0,
      })),
    [courses, data],
  )
  const maxEnrollments = Math.max(1, ...courseBars.map((item) => item.count))
  const distribution = useMemo(
    () =>
      LEVELS.map((level) => ({
        ...level,
        count: data?.users.filter((user) => getLevel(user.points).name === level.name).length || 0,
      })),
    [data],
  )
  const totalStudents = Math.max(1, data?.users.length || 0)

  // ==========================================
  // BLOCO 2: 3 NOVOS KPIs DO DASHBOARD
  // ==========================================

  // 1. Taxa de conclusão por curso
  // Para cada curso com matrículas ativas: % de matrículas que concluíram todas as aulas publicadas do curso
  const completionRatesByCourse = useMemo(() => {
    if (!data) return []

    // Mapear total de aulas ativas por curso (via lesson.module -> module.course ou lição.course)
    return courses.map((course) => {
      const activeEnrollments = data.enrollments.filter(
        (e) => e.course === course.id && e.situacao === 'ativa',
      )

      // Aulas do curso
      const courseLessons = allLessons.filter((l) => {
        // Se a lição tem relação direta com o curso ou através de module expand
        const mod = l.expand?.module as { course?: string } | undefined
        return (
          mod?.course === course.id || (l as unknown as { course?: string }).course === course.id
        )
      })

      const totalLessons = courseLessons.length

      if (activeEnrollments.length === 0 || totalLessons === 0) {
        return {
          course,
          totalEnrollments: activeEnrollments.length,
          completedEnrollments: 0,
          rate: null as number | null,
          totalLessons,
        }
      }

      // Para cada matrícula ativa, verificar se concluiu todas as aulas do curso
      let completedCount = 0
      for (const enrollment of activeEnrollments) {
        const studentCompletedLessons = data.progress.filter(
          (p) => p.user === enrollment.user && p.course === course.id && p.completed === true,
        )
        if (studentCompletedLessons.length >= totalLessons) {
          completedCount++
        }
      }

      const rate = Math.round((completedCount / activeEnrollments.length) * 100)
      return {
        course,
        totalEnrollments: activeEnrollments.length,
        completedEnrollments: completedCount,
        rate,
        totalLessons,
      }
    })
  }, [courses, data, allLessons])

  // 2. Alunos em risco
  // Matriculados que não registram progresso há 7+ dias (ou sem atividade)
  const atRiskStudents = useMemo(() => {
    if (!data) return { count: 0, top5: [] }

    const nowTime = Date.now()
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

    // Alunos que possuem pelo menos 1 matrícula ativa
    const activeStudentIds = new Set(
      data.enrollments.filter((e) => e.situacao === 'ativa').map((e) => e.user),
    )

    const list: Array<{
      user: UserRecord
      courseTitle: string
      daysWithoutActivity: number
      hasNeverActivity: boolean
      lastDateStr: string
    }> = []

    for (const studentId of activeStudentIds) {
      const user = data.users.find((u) => u.id === studentId)
      if (!user) continue

      // Matrícula principal do aluno para contextualizar o curso
      const enrollment = data.enrollments.find(
        (e) => e.user === studentId && e.situacao === 'ativa',
      )
      const course = courses.find((c) => c.id === enrollment?.course)

      // Todos os registros de progresso deste aluno (concluídos ou em andamento)
      const userProgress = (data.allProgress || []).filter((p) => p.user === studentId)

      if (userProgress.length === 0) {
        // Nunca registrou atividade -> Aluno em risco
        // Dias desde a criação do enrollment ou do user
        const baseDate = new Date(enrollment?.created || user.created).getTime()
        const days = Math.max(0, Math.floor((nowTime - baseDate) / (24 * 60 * 60 * 1000)))
        list.push({
          user,
          courseTitle: course?.title || 'Curso matriculado',
          daysWithoutActivity: days,
          hasNeverActivity: true,
          lastDateStr: 'Sem atividade',
        })
      } else {
        // Obter data do progresso mais recente
        const latestTime = Math.max(
          ...userProgress.map((p) => new Date(p.updated || p.created).getTime()),
        )
        const diffMs = nowTime - latestTime
        if (diffMs >= SEVEN_DAYS_MS) {
          const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
          list.push({
            user,
            courseTitle: course?.title || 'Curso matriculado',
            daysWithoutActivity: days,
            hasNeverActivity: false,
            lastDateStr: `Há ${days} dias`,
          })
        }
      }
    }

    // Ordenar pelos alunos há mais tempo sem atividade (dias sem atividade decrescente)
    list.sort((a, b) => b.daysWithoutActivity - a.daysWithoutActivity)

    return {
      count: list.length,
      top5: list.slice(0, 5),
    }
  }, [data, courses])

  // 3. Pedidos pendentes
  // Quantidade e soma em R$ dos orders com status pending
  const pendingOrdersStats = useMemo(() => {
    if (!data) return { count: 0, totalAmount: 0 }
    const pending = data.orders.filter((o) => o.status === 'pending')
    const totalAmount = pending.reduce((sum, o) => sum + (o.amount || 0), 0)
    return {
      count: pending.length,
      totalAmount,
    }
  }, [data])

  if (!data) return <LoadingScreen label="Calculando indicadores…" />
  const kpis = [
    {
      label: 'Alunos ativos',
      value: data.users.length,
      icon: UsersRound,
      color: '#2E90FA',
      delta: '+12%',
    },
    {
      label: 'Matrículas',
      value: data.enrollments.length,
      icon: GraduationCap,
      color: '#FF6B2C',
      delta: '+8%',
    },
    {
      label: 'Receita simulada (R$)',
      value: revenue.toLocaleString('pt-BR'),
      icon: DollarSign,
      color: '#12B76A',
      delta: '+18%',
    },
    {
      label: 'Aulas concluídas',
      value: data.progress.length,
      icon: BookOpenCheck,
      color: '#9E77ED',
      delta: '+23%',
    },
  ]
  return (
    <div className="route-page bg-brand-sand py-10">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Visão geral
            </span>
            <h1 className="section-title mt-3">Dashboard administrativo</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Acompanhe o movimento da plataforma em um só lugar.
            </p>
          </div>
          <div className="rounded-full border border-brand-border bg-white px-4 py-2 text-xs font-bold text-brand-muted">
            Atualizado agora <Activity className="ml-2 inline h-3.5 w-3.5 text-green-500" />
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, color, delta }) => (
            <article key={label} className="surface-card p-5">
              <div className="flex items-start justify-between">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex items-center text-xs font-extrabold text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {delta}
                </span>
              </div>
              <strong className="mt-5 block text-3xl font-extrabold tabular-nums text-brand-navy">
                {value}
              </strong>
              <span className="mt-1 block text-xs font-semibold text-brand-muted">{label}</span>
              <svg viewBox="0 0 120 24" className="mt-4 h-6 w-full" aria-hidden="true">
                <path
                  d="M0,19 C15,16 20,21 34,13 S55,18 66,10 S84,15 94,7 S108,9 120,3"
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </article>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-brand-navy">Matrículas por curso</h2>
                <p className="text-xs text-brand-muted">Distribuição atual da base de alunos</p>
              </div>
            </div>
            <div className="mt-8 space-y-6">
              {courseBars.map(({ course, count }, index) => (
                <div key={course.id}>
                  <div className="mb-2 flex justify-between text-xs font-bold">
                    <span className="text-brand-navy">{course.title}</span>
                    <span className="text-brand-muted">{count}</span>
                  </div>
                  <div className="h-9 overflow-hidden rounded-xl bg-brand-subtle">
                    <div
                      className="flex h-full items-center rounded-xl px-3 text-xs font-extrabold text-white transition-all"
                      style={{
                        width: `${Math.max(10, (count / maxEnrollments) * 100)}%`,
                        backgroundColor: ['#FF6B2C', '#2E90FA', '#12B76A'][index % 3],
                      }}
                    >
                      {count > 0 ? `${count} matrícula${count > 1 ? 's' : ''}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="surface-card p-6">
            <h2 className="font-extrabold text-brand-navy">Distribuição de níveis</h2>
            <p className="mt-1 text-xs text-brand-muted">Onde os alunos estão na trilha</p>
            <div
              className="mx-auto mt-7 grid h-44 w-44 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${distribution.map((item, index) => `${item.color} ${distribution.slice(0, index).reduce((sum, row) => sum + (row.count / totalStudents) * 100, 0)}% ${distribution.slice(0, index + 1).reduce((sum, row) => sum + (row.count / totalStudents) * 100, 0)}%`).join(',')})`,
              }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                <div>
                  <strong className="block text-3xl font-extrabold text-brand-navy">
                    {data.users.length}
                  </strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    alunos
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-7 grid gap-2">
              {distribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-brand-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </span>
                  <strong className="text-brand-navy">{item.count}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ======================================================== */}
        {/* BLOCO 2: 3 NOVOS KPIs DE GESTÃO DA PLATAFORMA           */}
        {/* ======================================================== */}
        <div className="mt-10">
          <div className="mb-6">
            <span className="eyebrow border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
              <Sparkles className="h-4 w-4" /> Gestão & Engajamento
            </span>
            <h2 className="section-title mt-2 text-2xl font-extrabold text-brand-navy">
              Indicadores Estratégicos da Plataforma
            </h2>
            <p className="mt-1 text-xs text-brand-muted">
              Métricas para medir a retenção de alunos, conclusão de cursos e conversão de pedidos.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* KPI 1: Taxa de conclusão por curso */}
            <section className="surface-card flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-600">
                      <Percent className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-brand-navy text-sm sm:text-base">
                        Taxa de conclusão
                      </h3>
                      <p className="text-[11px] text-brand-muted">
                        Por curso com matrículas ativas
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-200 text-purple-700 bg-purple-50"
                  >
                    Conclusão 100%
                  </Badge>
                </div>

                <div className="mt-6 space-y-5">
                  {completionRatesByCourse.length === 0 ? (
                    <div className="py-6 text-center text-xs text-brand-muted">
                      Nenhum curso cadastrado ainda.
                    </div>
                  ) : (
                    completionRatesByCourse.map((item) => (
                      <div key={item.course.id}>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                          <span
                            className="text-brand-navy truncate max-w-[170px]"
                            title={item.course.title}
                          >
                            {item.course.title}
                          </span>
                          <span className="text-brand-muted">
                            {item.rate !== null ? (
                              <span className="text-purple-700 font-extrabold">
                                {item.rate}% ({item.completedEnrollments}/{item.totalEnrollments})
                              </span>
                            ) : (
                              <span>— (0 matrículas)</span>
                            )}
                          </span>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full bg-brand-subtle">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-brand-orange transition-all duration-500"
                            style={{
                              width: item.rate !== null ? `${Math.max(4, item.rate)}%` : '0%',
                            }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-brand-muted">
                          <span>{item.totalLessons} aulas no catálogo</span>
                          <span>
                            {item.completedEnrollments} de {item.totalEnrollments} concluíram tudo
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-brand-border pt-4 text-[11px] text-brand-muted flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-purple-600" />
                <span>Baseado no progresso real das aulas concluídas</span>
              </div>
            </section>

            {/* KPI 2: Alunos em risco */}
            <section className="surface-card flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-brand-navy text-sm sm:text-base">
                        Alunos em risco
                      </h3>
                      <p className="text-[11px] text-brand-muted">Sem atividade há 7+ dias</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      atRiskStudents.count > 0
                        ? 'border-amber-300 text-amber-800 bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    }
                  >
                    {atRiskStudents.count} aluno{atRiskStudents.count !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="mt-4">
                  <strong className="block text-3xl font-extrabold tabular-nums text-brand-navy">
                    {atRiskStudents.count}
                  </strong>
                  <span className="text-xs text-brand-muted">
                    {atRiskStudents.count > 0
                      ? 'Requerem ação ou mensagem de incentivo'
                      : 'Todos os matriculados estão ativos recentemente!'}
                  </span>
                </div>

                <div className="mt-5 space-y-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    Mais tempo sem progresso (Top 5)
                  </span>
                  {atRiskStudents.top5.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-border p-4 text-center text-xs text-brand-muted">
                      Nenhum aluno em risco no momento. Excelente retenção!
                    </div>
                  ) : (
                    atRiskStudents.top5.map((item) => (
                      <div
                        key={item.user.id}
                        className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-2.5 text-xs hover:bg-brand-sand/40 transition"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate font-bold text-brand-navy">{item.user.name}</p>
                          <p className="truncate text-[10px] text-brand-muted">
                            {item.courseTitle}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-900 hover:bg-amber-100"
                        >
                          <Clock className="mr-1 h-2.5 w-2.5" />
                          {item.lastDateStr}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-brand-border pt-4">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto text-xs font-bold text-brand-orange hover:bg-transparent hover:text-brand-orange-dark"
                >
                  <Link to="/admin/alunos">
                    <span>Ver todos os alunos</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* KPI 3: Pedidos pendentes */}
            <section className="surface-card flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-brand-navy text-sm sm:text-base">
                        Pedidos pendentes
                      </h3>
                      <p className="text-[11px] text-brand-muted">Aguardando confirmação de pgto</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 bg-emerald-50"
                  >
                    {pendingOrdersStats.count} pendente{pendingOrdersStats.count !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="mt-4">
                  <strong className="block text-3xl font-extrabold tabular-nums text-brand-navy">
                    R${' '}
                    {pendingOrdersStats.totalAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                  <span className="text-xs text-brand-muted">
                    Volume financeiro em aberto nos checkouts
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-brand-border bg-brand-subtle/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-muted font-medium">Quantidade de pedidos:</span>
                    <strong className="text-brand-navy font-extrabold">
                      {pendingOrdersStats.count}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-muted font-medium">Ticket médio pendente:</span>
                    <strong className="text-brand-navy font-extrabold">
                      R${' '}
                      {pendingOrdersStats.count > 0
                        ? (
                            pendingOrdersStats.totalAmount / pendingOrdersStats.count
                          ).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '0,00'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-muted font-medium">Impacto na receita:</span>
                    <span className="text-emerald-700 font-bold">
                      +
                      {pendingOrdersStats.totalAmount > 0 ? 'Potencial imediato' : 'Sem pendências'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-brand-border pt-4">
                <Button
                  asChild
                  className="w-full rounded-xl bg-brand-navy text-xs font-bold text-white hover:bg-brand-navy-dark shadow-sm"
                >
                  <Link to="/admin/pedidos" className="flex items-center justify-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-brand-orange" />
                    <span>Ver pedidos</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
