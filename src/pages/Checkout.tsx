import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  Copy,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CourseCover } from '@/components/CourseCover'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { CourseRecord, OrderRecord } from '@/lib/types'
import { formatPrice, getCourseBySlug } from '@/services/courses'
import {
  confirmOrder,
  createPendingOrder,
  findEnrollment,
  findLatestPendingOrder,
} from '@/services/student'

export default function Checkout() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [course, setCourse] = useState<CourseRecord | null>(null)
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const [method, setMethod] = useState<'pix' | 'cartao'>('pix')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getCourseBySlug(slug)
      .then(async (record) => {
        setCourse(record)
        const enrolled = await findEnrollment(user.id, record.id)
        if (enrolled) {
          navigate(`/app/curso/${record.slug}`, { replace: true })
          return
        }
        const pending = await findLatestPendingOrder(user.id, record.id)
        if (pending) setOrder(pending)
      })
      .finally(() => setLoading(false))
  }, [navigate, slug, user])
  useRealtime<OrderRecord>(
    'orders',
    (event) => {
      if (event.record.id === order?.id && event.record.status === 'paid')
        navigate(`/pedido/${event.record.id}`)
    },
    Boolean(order),
  )
  const pixCode = useMemo(() => `PILLULA-${order?.id || 'NOVO-PEDIDO'}`, [order?.id])
  async function ensureOrder() {
    if (!user || !course) throw new Error('Pedido incompleto')
    if (order && order.method === method) return order
    const created = await createPendingOrder(user.id, course.id, course.price, method)
    setOrder(created)
    return created
  }
  async function pay(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (
      method === 'cartao' &&
      (card.number.replace(/\D/g, '').length < 16 ||
        card.name.trim().length < 3 ||
        !/^\d{2}\/\d{2}$/.test(card.expiry) ||
        card.cvv.length < 3)
    ) {
      setError('Revise os dados simulados do cartão.')
      return
    }
    setProcessing(true)
    try {
      const current = await ensureOrder()
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await confirmOrder(current.id)
      navigate(`/pedido/${current.id}`)
    } catch {
      setError('Não foi possível confirmar agora. Tente novamente.')
      setProcessing(false)
    }
  }
  async function copyCode() {
    const current = await ensureOrder()
    const code = `PILLULA-${current.id}`
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast({ title: 'Código Pix copiado' })
    setTimeout(() => setCopied(false), 1800)
  }
  if (loading || !course) return <LoadingScreen label="Preparando seu checkout…" />

  return (
    <div className="route-page bg-brand-sand py-10 sm:py-16">
      <div className="container-site">
        <div className="mb-8 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-muted">
          <LockKeyhole className="h-4 w-4 text-green-600" />
          Ambiente demonstrativo e seguro
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="surface-card p-6 sm:p-8">
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Falta só uma etapa
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
              Como você quer simular o pagamento?
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              Nenhuma cobrança real será realizada. A confirmação libera seu acesso imediatamente.
            </p>
            <Tabs
              value={method}
              onValueChange={(value) => {
                setMethod(value as 'pix' | 'cartao')
                setOrder(null)
              }}
              className="mt-8"
            >
              <TabsList className="grid h-12 w-full grid-cols-2 rounded-full bg-brand-subtle p-1">
                <TabsTrigger value="pix" className="rounded-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Pix
                </TabsTrigger>
                <TabsTrigger value="cartao" className="rounded-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Cartão
                </TabsTrigger>
              </TabsList>
              <form onSubmit={pay}>
                <TabsContent value="pix" className="mt-7">
                  <div className="grid items-center gap-7 sm:grid-cols-[180px_1fr]">
                    <div className="relative mx-auto grid aspect-square w-[180px] place-items-center rounded-2xl border-8 border-white bg-brand-navy p-4 shadow-lg">
                      <div className="absolute inset-3 opacity-90 [background-image:repeating-linear-gradient(0deg,#101828_0,#101828_5px,white_5px,white_9px),repeating-linear-gradient(90deg,transparent_0,transparent_7px,#fff_7px,#fff_11px)] mix-blend-screen" />
                      <QrCode className="relative h-16 w-16 text-brand-orange" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-brand-navy">Pix copia e cola</h2>
                      <p className="mt-2 text-sm leading-6 text-brand-muted">
                        Gere o pedido, copie o código fictício e clique em simular pagamento.
                      </p>
                      <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand-border bg-brand-subtle p-2 pl-4">
                        <code className="min-w-0 flex-1 truncate text-xs font-bold text-brand-navy">
                          {pixCode}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => void copyCode()}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="cartao" className="mt-7">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="form-label">Número do cartão</label>
                      <Input
                        value={card.number}
                        onChange={(e) =>
                          setCard({
                            ...card,
                            number: e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 16)
                              .replace(/(.{4})/g, '$1 ')
                              .trim(),
                          })
                        }
                        placeholder="4242 4242 4242 4242"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Nome impresso</label>
                      <Input
                        value={card.name}
                        onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                        placeholder="MARIA ALMEIDA"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="form-label">Validade</label>
                      <Input
                        value={card.expiry}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setCard({
                            ...card,
                            expiry:
                              value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value,
                          })
                        }}
                        placeholder="MM/AA"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="form-label">CVV</label>
                      <Input
                        value={card.cvv}
                        onChange={(e) =>
                          setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })
                        }
                        placeholder="123"
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </TabsContent>
                {error && (
                  <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                )}
                <Button
                  disabled={processing}
                  type="submit"
                  className="pill-button mt-8 h-13 w-full bg-brand-orange text-base hover:bg-brand-orange-dark"
                >
                  {processing ? (
                    <>
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                      Confirmando pagamento…
                    </>
                  ) : (
                    'Simular pagamento'
                  )}
                </Button>
              </form>
            </Tabs>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-brand-muted">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Seus dados não são cobrados nem armazenados
            </div>
          </div>
          <aside>
            <div className="surface-card sticky top-28 overflow-hidden">
              <CourseCover course={course} className="aspect-video" />
              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                  Resumo do pedido
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-brand-navy">{course.title}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">{course.subtitle}</p>
                <div className="my-6 h-px bg-brand-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-muted">Acesso completo</span>
                  <span className="font-bold text-brand-navy">{formatPrice(course.price)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <strong className="text-brand-navy">Total</strong>
                  <strong className="text-2xl font-extrabold text-brand-orange">
                    {formatPrice(course.price)}
                  </strong>
                </div>
                <div className="mt-6 rounded-xl bg-green-50 p-4 text-xs leading-5 text-green-700">
                  <strong>Acesso imediato:</strong> após a confirmação simulada, o curso aparece na
                  sua área de aluno.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
