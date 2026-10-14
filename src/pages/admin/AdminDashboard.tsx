import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  DollarSign,
  GraduationCap,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'

import { LoadingScreen } from '@/components/LoadingScreen'
import { getLevel, LEVELS } from '@/lib/gamification'
import type { EnrollmentRecord, LessonProgressRecord, OrderRecord, UserRecord } from '@/lib/types'
import { getAdminSnapshot } from '@/services/admin'
import { listAllCourses } from '@/services/courses'
import type { CourseRecord } from '@/lib/types'

interface Snapshot {
  users: UserRecord[]
  enrollments: EnrollmentRecord[]
  orders: OrderRecord[]
  progress: LessonProgressRecord[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [courses, setCourses] = useState<CourseRecord[]>([])
  useEffect(() => {
    Promise.all([getAdminSnapshot(), listAllCourses()]).then(([snapshot, records]) => {
      setData(snapshot)
      setCourses(records)
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
      </div>
    </div>
  )
}
