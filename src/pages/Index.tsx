import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  HelpCircle,
  Instagram,
  Lightbulb,
  MessageCircle,
  Play,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  UsersRound,
  Video,
  Zap,
} from 'lucide-react'

import edsonLucioPhoto from '@/assets/editedimage1781700536492-copia-dfd97.png'
import clubeLogo from '@/assets/imagemgerada1789555881046-08982.png'
import { Button } from '@/components/ui/button'
import { CourseCover } from '@/components/CourseCover'
import { LEVELS } from '@/lib/gamification'
import type { CourseRecord } from '@/lib/types'
import {
  formatDuration,
  formatPrice,
  getCourseCounts,
  listPublishedCourses,
} from '@/services/courses'

const offerings = [
  {
    icon: Target,
    title: 'Mentorias',
    text: 'Direção personalizada para destravar seu próximo nível profissional.',
  },
  {
    icon: BarChart3,
    title: 'Treinamentos de Vendas',
    text: 'Métodos aplicáveis para transformar conversa em resultado.',
  },
  {
    icon: UsersRound,
    title: 'Liderança',
    text: 'Lidere com presença, clareza e uma cultura que move pessoas.',
  },
  {
    icon: BookOpen,
    title: 'Clube das Pílulas',
    text: 'Leitura, encontros e ideias que cabem na sua rotina.',
  },
]

export default function Index() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [counts, setCounts] = useState(
    new Map<string, { modules: number; lessons: number; duration: number }>(),
  )

  useEffect(() => {
    listPublishedCourses()
      .then(async (records) => {
        setCourses(records)
        setCounts(await getCourseCounts(records.map((course) => course.id)))
      })
      .catch(() => {})
  }, [])

  const featured = courses.find((course) => course.slug === 'marketing-digital') ?? courses[0]

  return (
    <div className="route-page -mt-[76px]">
      <section className="grid-pattern relative min-h-screen overflow-hidden bg-brand-navy pt-[76px] text-white">
        <div className="orange-glow animate-soft-pulse absolute -left-40 top-8 h-[600px] w-[600px]" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[560px] w-[560px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="container-site relative grid min-h-[calc(100vh-76px)] items-center gap-14 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div className="max-w-3xl animate-capsule-rise">
            <div className="eyebrow rounded-full border border-brand-orange/35 bg-brand-orange/10 px-4 py-2">
              <Sparkles className="h-4 w-4" /> Treinamentos que transformam carreiras
            </div>
            <h1 className="mt-7 text-[clamp(2.45rem,6vw,4.2rem)] font-extrabold leading-[1.03] tracking-[-.055em]">
              Vendas, liderança e mentalidade em{' '}
              <span className="text-brand-orange">pílulas diárias</span> de desenvolvimento.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              Mentorias, treinamentos práticos e o Clube das Pílulas para quem decidiu crescer sem
              esperar o momento perfeito.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="pill-button h-13 bg-brand-orange px-7 text-white hover:bg-brand-orange-dark"
              >
                <a href="#catalogo">
                  Conhecer cursos <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="pill-button h-13 border-white/25 bg-white/5 px-7 text-white hover:bg-white/12 hover:text-white"
              >
                <a
                  href="https://www.instagram.com/pilulasdedesenvolvimento"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  Falar no Instagram
                </a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/60">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-orange" />
                Conteúdo direto ao ponto
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-orange" />
                Aprenda no seu ritmo
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-orange" />
                Evolução reconhecida
              </span>
            </div>
          </div>
          <div
            className="relative hidden min-h-[540px] lg:block"
            aria-label="Prévia dos conteúdos da plataforma"
          >
            <div className="animate-float-slow absolute right-2 top-12 w-[390px] rotate-[-2deg] rounded-[28px] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
              <div className="overflow-hidden rounded-[20px] bg-white">
                <div className="flex items-center gap-2 bg-brand-subtle px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="p-5 text-brand-navy">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-brand-navy">
                    <div className="orange-glow absolute inset-0" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-orange text-white">
                        <Play className="ml-1 h-5 w-5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                    Aula 03
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold">
                    Funil de vendas do zero ao avançado
                  </h3>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-subtle">
                    <div className="h-full w-[68%] rounded-full bg-brand-orange" />
                  </div>
                </div>
              </div>
            </div>
            <div className="animate-float-delay absolute bottom-16 left-2 w-64 rounded-3xl border border-white/15 bg-white p-5 text-brand-navy shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-600">
                  +10 pontos
                </span>
              </div>
              <p className="mt-5 text-sm text-brand-muted">Seu progresso</p>
              <strong className="mt-1 block text-3xl font-extrabold">
                130 <span className="text-sm text-brand-muted">pts</span>
              </strong>
              <p className="mt-2 text-xs font-bold text-blue-500">Quase Explorador!</p>
            </div>
            <div className="absolute right-[-20px] top-[330px] flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold shadow-xl backdrop-blur-xl">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange">
                <Rocket className="h-4 w-4" />
              </span>
              Uma pílula por dia
            </div>
          </div>
          <a
            href="#ofertas"
            className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/40 lg:flex"
          >
            Role para evoluir
            <ArrowDown className="h-4 w-4 animate-bounce text-brand-orange" />
          </a>
        </div>
      </section>

      <section id="ofertas" className="relative z-10 -mt-2 bg-brand-sand py-12 sm:py-16">
        <div className="container-site grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offerings.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="interactive-card animate-capsule-rise p-6"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-lg font-extrabold text-brand-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Clube das Pílulas — Ancorado em /#clube */}
      <section
        id="clube"
        className="section-space relative overflow-hidden bg-brand-navy text-white"
      >
        <div className="orange-glow pointer-events-none absolute -right-32 top-10 h-[560px] w-[560px]" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-[480px] w-[480px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="container-site relative">
          {/* Header da seção */}
          <div className="max-w-3xl">
            <span className="eyebrow border border-brand-orange/30 bg-brand-orange/10 px-4 py-2">
              <BookOpen className="h-4 w-4" /> Clube de leitura da Pílulas de Desenvolvimento
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">
              Clube das Pílulas — <span className="text-brand-orange">uma metanoia diária</span>.
            </h2>
            <p className="mt-5 text-base leading-8 text-white/75 sm:text-lg">
              Nosso clube de leitura une constância, reflexão e transformação prática. Em vez de
              leituras pesadas que você abandona no meio, aqui dividimos a jornada em pequenos
              passos diários que realmente cabem na sua rotina e mudam a sua mente.
            </p>
          </div>

          {/* Destaque principal: Logo oficial + Livro atual */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
            {/* Card do Livro Atual */}
            <article className="relative overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-7 backdrop-blur-xl sm:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-1.5 text-xs font-extrabold text-white shadow-[0_4px_16px_rgba(255,107,44,.4)]">
                  <Sparkles className="h-3.5 w-3.5" /> Livro atual do Clube
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                  <Calendar className="h-3.5 w-3.5 text-brand-orange" /> Início: 05/10
                </span>
              </div>

              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-white/50">
                  Leitura guiada
                </p>
                <h3 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
                  Metanoia — a chave está na sua mente
                </h3>
                <p className="mt-3 text-lg font-semibold text-brand-orange">Por JB Carvalho</p>
              </div>

              <p className="mt-6 text-sm leading-7 text-white/70 sm:text-base">
                Uma obra profunda sobre renovação de mentalidade, identidade e liderança interior.
                Cada página nos desafia a quebrar padrões antigos para experimentar uma
                transformação genuína na vida pessoal e profissional.
              </p>

              {/* Informações de datas e encontro */}
              <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-orange/20 text-brand-orange">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-white/50 uppercase tracking-wider">
                      Leitura iniciada
                    </span>
                    <strong className="block text-base font-extrabold text-white">
                      05 de Outubro
                    </strong>
                    <span className="text-xs text-white/60">7 a 8 páginas por dia</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-orange/20 text-brand-orange">
                    <Video className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-white/50 uppercase tracking-wider">
                      Encontro virtual
                    </span>
                    <strong className="block text-base font-extrabold text-white">
                      03/11/2026
                    </strong>
                    <span className="text-xs text-white/60">Debate & alinhamento ao vivo</span>
                  </div>
                </div>
              </div>

              {/* CTA direto para o WhatsApp */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="pill-button h-13 bg-brand-orange px-8 text-base text-white hover:bg-brand-orange-dark shadow-[0_8px_24px_rgba(255,107,44,.4)]"
                >
                  <a
                    href="https://chat.whatsapp.com/GDwgDsxlgc56o0qOBM6r7o"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" /> Entrar no grupo do WhatsApp
                  </a>
                </Button>
                <span className="text-xs text-white/55">Grupo oficial e 100% gratuito</span>
              </div>
            </article>

            {/* Card com o Logo Oficial do Clube + Como funciona */}
            <article className="flex flex-col justify-between rounded-[32px] border border-white/15 bg-white/5 p-7 backdrop-blur-xl sm:p-10">
              <div className="flex flex-col items-center text-center">
                <div className="relative mx-auto flex w-full max-w-[260px] items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-black p-6 shadow-2xl">
                  <img
                    src={clubeLogo}
                    alt="Clube das Pílulas — uma metanoia diária"
                    className="h-auto w-full object-contain"
                  />
                </div>
                <h4 className="mt-6 text-xl font-extrabold text-white">O que acontece no grupo?</h4>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  De <strong>segunda a sábado</strong> (domingo é dia de descanso), nossa comunidade
                  recebe a dose exata para manter o foco na leitura.
                </p>
              </div>

              {/* A rotina diária no WhatsApp */}
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-orange/20 text-brand-orange">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      1 card com 1 pergunta
                    </strong>
                    <p className="mt-0.5 text-xs leading-5 text-white/65">
                      Para direcionar o seu olhar antes ou depois da leitura do dia.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-orange/20 text-brand-orange">
                    <Zap className="h-5 w-5" />
                  </span>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      1 breve resumo das páginas do dia
                    </strong>
                    <p className="mt-0.5 text-xs leading-5 text-white/65">
                      Meta leve de <strong>7 a 8 páginas por dia</strong> — sintetizadas com
                      clareza.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-orange/20 text-brand-orange">
                    <Quote className="h-5 w-5" />
                  </span>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      1 card de provocação
                    </strong>
                    <p className="mt-0.5 text-xs leading-5 text-white/65">
                      Um gatilho para gerar reflexão profunda e aplicação imediata na sua rotina.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rodapé do card */}
              <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-white/55">
                Segunda a sábado · Domingo de descanso · Comunidade ativa
              </div>
            </article>
          </div>
        </div>
      </section>

      {featured && (
        <section className="section-space bg-white">
          <div className="container-site">
            <div className="mb-10 max-w-2xl">
              <span className="eyebrow">
                <Star className="h-4 w-4 fill-current" /> Dose recomendada
              </span>
              <h2 className="section-title mt-3">
                Comece pelo curso que está transformando presenças em vendas.
              </h2>
            </div>
            <article className="overflow-hidden rounded-[28px] bg-brand-navy text-white shadow-2xl">
              <div className="grid lg:grid-cols-[.95fr_1.05fr]">
                <CourseCover
                  course={featured}
                  className="min-h-[310px] lg:min-h-[480px]"
                  showPlay
                />
                <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                  <div className="orange-glow absolute right-[-180px] top-[-180px] h-[500px] w-[500px]" />
                  <div className="relative">
                    <span className="inline-flex rounded-full bg-brand-orange px-4 py-1.5 text-xs font-extrabold">
                      Mais procurado
                    </span>
                    <p className="mt-7 text-sm font-bold uppercase tracking-[.16em] text-white/50">
                      Curso completo
                    </p>
                    <h3 className="mt-2 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                      {featured.title}
                    </h3>
                    <p className="mt-5 max-w-xl leading-7 text-white/68">{featured.subtitle}</p>
                    <div className="mt-8 flex flex-wrap gap-5 text-sm text-white/60">
                      <span>{counts.get(featured.id)?.modules ?? 2} módulos</span>
                      <span>•</span>
                      <span>{counts.get(featured.id)?.lessons ?? 7} aulas</span>
                      <span>•</span>
                      <span>{formatDuration(counts.get(featured.id)?.duration ?? 112)}</span>
                    </div>
                    <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <strong className="text-3xl font-extrabold">
                        {formatPrice(featured.price)}
                      </strong>
                      <Button
                        asChild
                        className="pill-button bg-brand-orange px-7 hover:bg-brand-orange-dark"
                      >
                        <Link to={`/cursos/${featured.slug}`}>
                          Ver curso <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      <section id="catalogo" className="section-space">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <span className="eyebrow">
                <BriefcaseBusiness className="h-4 w-4" /> Sua próxima habilidade
              </span>
              <h2 className="section-title mt-3">Cursos para colocar em prática.</h2>
            </div>
            <Link
              to="/cursos"
              className="flex items-center gap-2 text-sm font-extrabold text-brand-orange hover:text-brand-orange-dark"
            >
              Ver todos os cursos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 flex snap-x gap-5 overflow-x-auto pb-5">
            {courses.slice(0, 3).map((course) => {
              const meta = counts.get(course.id)
              return (
                <Link
                  key={course.id}
                  to={`/cursos/${course.slug}`}
                  className="interactive-card group min-w-[88%] snap-start overflow-hidden sm:min-w-[360px] lg:min-w-0 lg:flex-1"
                >
                  <div className="overflow-hidden">
                    <CourseCover
                      course={course}
                      className="aspect-video transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                      {course.category}
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-brand-navy">{course.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-muted">
                      {course.subtitle}
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-muted">
                        {meta?.modules ?? 0} módulos · {meta?.lessons ?? 0} aulas ·{' '}
                        {formatDuration(meta?.duration ?? 0)}
                      </span>
                      <strong className="text-lg text-brand-navy">
                        {formatPrice(course.price)}
                      </strong>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section id="mentor" className="section-space overflow-hidden bg-white">
        <div className="container-site grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rotate-[-3deg] rounded-[32px] bg-brand-orange/10" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-brand-navy">
              <img
                src={edsonLucioPhoto}
                alt="Edson Lúcio, mentor da Pílulas de Desenvolvimento"
                className="h-full w-full object-cover object-top opacity-90"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navy via-brand-navy/65 to-transparent p-7 pt-24">
                <p className="text-2xl font-extrabold text-white">Edson Lúcio</p>
                <p className="mt-1 text-sm font-semibold text-brand-orange">
                  Professor, mentor e multiplicador
                </p>
              </div>
            </div>
            <div className="absolute -right-4 top-10 rounded-2xl bg-white p-4 shadow-xl">
              <Lightbulb className="h-6 w-6 text-brand-orange" />
            </div>
          </div>
          <div>
            <span className="eyebrow">
              <MessageCircle className="h-4 w-4" /> Quem caminha com você
            </span>
            <h2 className="section-title mt-3">Desenvolvimento que fala a língua da vida real.</h2>
            <p className="body-muted mt-6">
              Edson Lúcio transforma experiência de mercado em encontros objetivos, humanos e cheios
              de energia. Sua missão é ajudar profissionais a reconhecer o próprio potencial e
              convertê-lo em atitude, liderança e resultado.
            </p>
            <p className="body-muted mt-4">
              Da sala de treinamento ao vídeo de poucos minutos, cada conteúdo deixa uma pergunta
              prática:{' '}
              <strong className="text-brand-navy">qual será o seu próximo movimento?</strong>
            </p>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-subtle p-5">
                <strong className="block text-3xl font-extrabold text-brand-orange">+500</strong>
                <span className="text-sm font-semibold text-brand-muted">
                  profissionais treinados
                </span>
              </div>
              <div className="rounded-2xl bg-brand-subtle p-5">
                <strong className="block text-3xl font-extrabold text-brand-orange">
                  +10 anos
                </strong>
                <span className="text-sm font-semibold text-brand-muted">de experiência</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-brand-navy text-white">
        <div className="container-site grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <span className="eyebrow">
              <Award className="h-4 w-4" /> Evolução visível
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] sm:text-4xl">
              Ganhe pontos e suba de nível a cada aula concluída.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-white/65">
              Aprender merece ser celebrado. Complete aulas, conclua módulos e veja sua constância
              se transformar em uma trilha de conquistas.
            </p>
            <Button
              asChild
              variant="outline"
              className="pill-button mt-8 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/cadastro">
                Começar minha trilha <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {LEVELS.map((level, index) => (
              <div
                key={level.name}
                className={`rounded-2xl border p-4 text-center ${index === 1 ? 'border-blue-400/60 bg-blue-400/10 sm:-translate-y-3' : 'border-white/10 bg-white/5'}`}
              >
                <span
                  className="mx-auto grid h-11 w-11 place-items-center rounded-full"
                  style={{ backgroundColor: `${level.color}22`, color: level.color }}
                >
                  {index === LEVELS.length - 1 ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <Award className="h-5 w-5" />
                  )}
                </span>
                <p className="mt-3 text-[11px] font-extrabold">{level.name}</p>
                <p className="mt-1 text-[10px] text-white/40">
                  {level.min === 0 ? '0 pts (início)' : `${level.min} pts`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-[32px] bg-brand-orange px-7 py-14 text-center text-white sm:px-12 sm:py-20">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full border-[44px] border-white/10" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[44px] border-brand-navy/10" />
            <div className="relative">
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-wider">
                Sua virada pode começar hoje
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                Pronto para o próximo nível?
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/80">
                Crie sua conta grátis, receba 100 pontos e transforme aprendizado em movimento.
              </p>
              <Button
                asChild
                size="lg"
                className="pill-button mt-8 bg-white px-8 text-brand-orange hover:bg-brand-navy hover:text-white"
              >
                <Link to="/cadastro">
                  Criar minha conta grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
