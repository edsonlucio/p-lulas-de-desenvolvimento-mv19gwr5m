import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  Gift,
  HelpCircle,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { CourseRecord, OrderRecord } from '@/lib/types'
import { findEnrollment, getOrderById } from '@/services/student'

interface ExpandedOrder extends OrderRecord {
  expand?: { course?: CourseRecord }
}

export default function OrderSuccess() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const id =
    params.id ||
    searchParams.get('order_id') ||
    searchParams.get('id') ||
    searchParams.get('src') ||
    ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<ExpandedOrder | null>(null)
  const [course, setCourse] = useState<CourseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [hasNotifiedPoints, setHasNotifiedPoints] = useState(false)

  // Carregar dados do pedido
  async function checkOrder(silent = false) {
    if (!silent) setLoading(true)
    try {
      const record = (await getOrderById(id)) as ExpandedOrder
      setOrder(record)
      if (record.expand?.course) {
        setCourse(record.expand.course)
      } else if (record.course) {
        const c = await pb.collection<CourseRecord>('courses').getOne(record.course)
        setCourse(c)
      }

      if (record.status === 'paid' && !hasNotifiedPoints) {
        toast({
          title: 'Matrícula liberada! 🎉',
          description: '+50 pontos pela compra creditados no seu perfil.',
        })
        setHasNotifiedPoints(true)
      }

      return record
    } catch {
      toast({
        title: 'Pedido não encontrado',
        description: 'Verifique o identificador do pedido ou tente novamente.',
        variant: 'destructive',
      })
      return null
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void checkOrder()
  }, [id])

  // Polling automático enquanto estiver pendente (útil quando o aluno volta do Kiwify antes do webhook chegar)
  useEffect(() => {
    if (!order || order.status !== 'pending' || pollCount >= 10) return

    const timer = setTimeout(async () => {
      setPolling(true)
      const updated = await checkOrder(true)
      setPolling(false)
      setPollCount((prev) => prev + 1)
      if (updated?.status === 'paid') {
        // Redirecionamento suave ou recarregamento
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [order?.status, pollCount])

  // Inscrever-se no realtime de pedidos
  useEffect(() => {
    if (!id) return
    const unsubscribe = pb.collection('orders').subscribe<OrderRecord>(id, (e) => {
      if (e.record.status === 'paid') {
        void checkOrder(true)
      }
    })
    return () => {
      void unsubscribe.then((unsub) => unsub())
    }
  }, [id])

  if (loading) {
    return (
      <div className="route-page grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm text-brand-muted">Verificando situação do pedido…</p>
        </div>
      </div>
    )
  }

  const isPaid = order?.status === 'paid'
  const isPending = order?.status === 'pending'
  const isFailed = order?.status === 'falhou' || order?.status === 'cancelled'
  const isExpired = order?.status === 'expirado'

  return (
    <div className="route-page relative overflow-hidden bg-brand-sand py-12 sm:py-20">
      <div className="orange-glow absolute left-1/2 top-[-300px] h-[700px] w-[700px] -translate-x-1/2" />
      <div className="container-site relative">
        <div className="surface-card mx-auto max-w-2xl overflow-hidden text-center shadow-xl">
          {/* Cabeçalho condicional ao status */}
          {isPaid ? (
            <div className="relative bg-brand-navy px-6 py-12 text-white sm:py-14">
              <div className="absolute inset-0 grid-pattern opacity-70" />
              <div className="relative">
                <div className="mx-auto grid h-24 w-24 animate-check-pop place-items-center rounded-full border-[10px] border-green-500/20 bg-green-500 text-white shadow-[0_0_60px_rgba(22,163,74,.4)]">
                  <Check className="h-10 w-10 stroke-[3]" />
                </div>
                <span className="eyebrow mt-6">
                  <Sparkles className="h-4 w-4" /> Matrícula liberada!
                </span>
                <h1 className="mt-4 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                  Pagamento confirmado com sucesso!
                </h1>
                <p className="mt-3 text-white/70">
                  Seu acesso ao curso está liberado imediatamente na sua área de aluno.
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="relative bg-brand-navy px-6 py-12 text-white sm:py-14">
              <div className="absolute inset-0 grid-pattern opacity-70" />
              <div className="relative">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[10px] border-amber-500/20 bg-amber-500 text-white shadow-[0_0_60px_rgba(245,158,11,.4)]">
                  <Clock3 className="h-10 w-10" />
                </div>
                <span className="eyebrow mt-6">
                  <Clock3 className="h-4 w-4" /> Aguardando confirmação
                </span>
                <h1 className="mt-4 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                  Pagamento em processamento
                </h1>
                <p className="mt-3 text-white/70">
                  Estamos aguardando o aviso da operadora / Kiwify. O acesso será liberado
                  automaticamente assim que confirmado.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative bg-brand-navy px-6 py-12 text-white sm:py-14">
              <div className="absolute inset-0 grid-pattern opacity-70" />
              <div className="relative">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[10px] border-red-500/20 bg-red-500 text-white shadow-[0_0_60px_rgba(239,68,68,.4)]">
                  <XCircle className="h-10 w-10" />
                </div>
                <span className="eyebrow mt-6">
                  <AlertCircle className="h-4 w-4" />{' '}
                  {isExpired ? 'Pedido expirado' : 'Pagamento recusado'}
                </span>
                <h1 className="mt-4 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                  {isExpired ? 'O pedido expirou' : 'Não foi possível aprovar'}
                </h1>
                <p className="mt-3 text-white/70">
                  {isExpired
                    ? 'O prazo para pagamento deste pedido foi encerrado.'
                    : 'A operadora recusou a transação. Você pode tentar novamente com outro método.'}
                </p>
              </div>
            </div>
          )}

          {/* Conteúdo do Card */}
          <div className="p-7 sm:p-10">
            {/* Informações de status e código */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 pb-4 text-left text-xs">
              <div>
                <span className="text-brand-muted">Identificador do pedido:</span>{' '}
                <strong className="font-mono text-brand-navy">#{order?.id}</strong>
              </div>
              <div>
                <span className="text-brand-muted">Situação:</span>{' '}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold uppercase text-[11px] ${
                    isPaid
                      ? 'bg-green-100 text-green-800'
                      : isPending
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isPaid ? 'Pago' : isPending ? 'Pendente' : isExpired ? 'Expirado' : 'Falhou'}
                </span>
              </div>
            </div>

            {isPaid ? (
              <>
                <div className="mx-auto mt-6 flex max-w-md items-center gap-4 rounded-2xl bg-brand-subtle p-4 text-left">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-orange text-white">
                    <Gift className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                      Nova conquista
                    </p>
                    <p className="mt-1 font-extrabold text-brand-navy">+50 pontos pela compra</p>
                  </div>
                </div>

                <h2 className="mt-8 text-xl font-extrabold text-brand-navy">
                  {course?.title || 'Seu novo curso'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  A primeira aula já está esperando por você. Dê o próximo passo enquanto sua
                  energia está alta.
                </p>

                <Button
                  asChild
                  className="pill-button mt-7 h-12 bg-brand-orange px-8 hover:bg-brand-orange-dark"
                >
                  <Link to={course ? `/app/curso/${course.slug}` : '/app'}>
                    Começar a assistir agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : isPending ? (
              <>
                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-left text-sm leading-6 text-amber-900">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <strong className="block font-bold">O que acontece agora?</strong>
                      <p className="mt-1 text-xs text-amber-800">
                        Se você realizou o pagamento pelo checkout da Kiwify (Pix, cartão ou
                        boleto), a confirmação é enviada via webhook e seu curso será liberado nesta
                        mesma página assim que recebermos o aviso.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="mt-8 text-xl font-extrabold text-brand-navy">
                  {course?.title || 'Curso em confirmação'}
                </h2>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    onClick={() => void checkOrder()}
                    disabled={polling}
                    className="pill-button bg-brand-navy hover:bg-brand-navy/90 text-white"
                  >
                    {polling ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Verificar novamente
                  </Button>

                  {course?.kiwify_checkout_url && (
                    <Button
                      variant="outline"
                      asChild
                      className="rounded-full border-brand-border text-brand-navy"
                    >
                      <a
                        href={`${course.kiwify_checkout_url}${course.kiwify_checkout_url.includes('?') ? '&' : '?'}src=${order?.id || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir checkout Kiwify <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>

                <p className="mt-4 text-xs text-brand-muted">
                  Atualização automática ativa. Esta página verifica novas confirmações a cada
                  poucos segundos.
                </p>
              </>
            ) : (
              <>
                <p className="mt-6 text-sm text-brand-muted">
                  Não se preocupe: você pode tentar realizar a compra novamente a qualquer momento.
                </p>

                <div className="mt-8 flex justify-center gap-3">
                  <Button
                    asChild
                    className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white"
                  >
                    <Link to={course ? `/cursos/${course.slug}` : '/cursos'}>Tentar novamente</Link>
                  </Button>
                </div>
              </>
            )}

            <div className="mt-8 border-t border-brand-border/60 pt-5">
              <Link
                to="/app"
                className="text-sm font-bold text-brand-muted hover:text-brand-orange"
              >
                Voltar para Meus Cursos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
