import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Layers,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CourseCover } from '@/components/CourseCover'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { ComboRecord, CourseRecord, MentorshipProductRecord, OrderRecord } from '@/lib/types'
import { formatPrice, getCourseBySlug } from '@/services/courses'
import { getComboById, getComboBySlug } from '@/services/combos'
import { getMentorshipProductById, getPublicMentorshipProduct } from '@/services/mentorship'
import {
  confirmOrder,
  createPendingOrder,
  findEnrollment,
  findLatestPendingOrder,
} from '@/services/student'

export default function Checkout() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const comboParam = searchParams.get('combo')
  const mentorshipParam = searchParams.get('mentorship')

  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [course, setCourse] = useState<CourseRecord | null>(null)
  const [combo, setCombo] = useState<ComboRecord | null>(null)
  const [mentorship, setMentorship] = useState<MentorshipProductRecord | null>(null)
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const [method, setMethod] = useState<'pix' | 'cartao'>('pix')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [redirectingKiwify, setRedirectingKiwify] = useState(false)
  const [copied, setCopied] = useState(false)
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [error, setError] = useState('')

  const isMentorshipMode = Boolean(mentorshipParam || slug === 'mentoria')
  const isComboMode = Boolean(comboParam)

  useEffect(() => {
    if (!user) return

    async function loadItem() {
      try {
        if (isMentorshipMode) {
          const product = mentorshipParam
            ? await getMentorshipProductById(mentorshipParam)
            : await getPublicMentorshipProduct()
          setMentorship(product)
          return
        }

        if (comboParam) {
          const comboRecord =
            (await getComboById(comboParam).catch(() => null)) ||
            (await getComboBySlug(comboParam).catch(() => null))
          if (comboRecord) {
            setCombo(comboRecord)
            return
          }
        }

        if (slug) {
          const record = await getCourseBySlug(slug)
          setCourse(record)
          const enrolled = await findEnrollment(user.id, record.id)
          if (enrolled) {
            navigate(`/app/curso/${record.slug}`, { replace: true })
            return
          }
          const pending = await findLatestPendingOrder(user.id, record.id)
          if (pending) setOrder(pending)
        }
      } catch (err) {
        console.error('Erro ao carregar item para checkout:', err)
        setError('Não foi possível carregar os detalhes do item selecionado.')
      } finally {
        setLoading(false)
      }
    }

    void loadItem()
  }, [user, slug, comboParam, mentorshipParam, isMentorshipMode, navigate])

  // Escuta confirmação em tempo real (via webhook ou simulação)
  useRealtime<OrderRecord>(
    'orders',
    (event) => {
      if (event.record.id === order?.id && event.record.status === 'paid') {
        navigate(`/pedido/${event.record.id}`)
      }
    },
    Boolean(order),
  )

  const itemTitle = isMentorshipMode
    ? mentorship?.title || 'Mentoria Pílulas'
    : combo
      ? combo.title
      : course?.title || 'Curso'

  const itemPrice = isMentorshipMode
    ? mentorship?.price || 497
    : combo
      ? combo.price
      : course?.price || 0

  const pixCode = useMemo(() => `PILLULA-${order?.id || 'NOVO-PEDIDO'}`, [order?.id])

  async function ensureOrder() {
    if (!user) throw new Error('Usuário não autenticado')
    if (order && order.method === method) return order

    if (isMentorshipMode && mentorship) {
      const created = await createPendingOrder(user.id, undefined, mentorship.price, method, {
        mentorship: mentorship.id,
      })
      setOrder(created)
      return created
    }

    if (combo) {
      const created = await createPendingOrder(user.id, undefined, combo.price, method, {
        combo: combo.id,
      })
      setOrder(created)
      return created
    }

    if (course) {
      const created = await createPendingOrder(user.id, course.id, course.price, method)
      setOrder(created)
      return created
    }

    throw new Error('Item para pedido não encontrado')
  }

  // Ação principal do fluxo Kiwify (para cursos com link cadastrado)
  async function handleGoToKiwifyCheckout() {
    if (!user || !course || !course.kiwify_checkout_url) return
    setRedirectingKiwify(true)
    setError('')
    try {
      const pendingOrder = await ensureOrder()
      const baseUrl = course.kiwify_checkout_url.trim()
      const separator = baseUrl.includes('?') ? '&' : '?'
      const kiwifyUrl = `${baseUrl}${separator}src=${encodeURIComponent(pendingOrder.id)}&s1=${encodeURIComponent(pendingOrder.id)}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`

      window.open(kiwifyUrl, '_blank', 'noopener,noreferrer')
      navigate(`/pedido/${pendingOrder.id}`)
    } catch {
      setError('Não foi possível iniciar o pedido. Tente novamente.')
      setRedirectingKiwify(false)
    }
  }

  // Simulação manual de pagamento (checkout simulado — decisão do usuário)
  async function paySimulated(event: FormEvent) {
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

  if (loading) return <LoadingScreen label="Preparando seu checkout…" />

  if (!course && !combo && !mentorship) {
    return (
      <div className="route-page bg-brand-sand py-20 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">Item não encontrado</h1>
        <p className="mt-2 text-sm text-brand-muted">
          O curso, combo ou mentoria solicitado não foi localizado.
        </p>
        <Button onClick={() => navigate('/catalogo')} className="mt-6 rounded-full bg-brand-orange">
          Ir para o Catálogo
        </Button>
      </div>
    )
  }

  const hasKiwify = Boolean(
    course?.kiwify_checkout_url && course.kiwify_checkout_url.trim().length > 0,
  )

  return (
    <div className="route-page bg-brand-sand py-10 sm:py-16">
      <div className="container-site">
        <div className="mb-8 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-muted">
          <LockKeyhole className="h-4 w-4 text-green-600" />
          Ambiente seguro de matrícula · Pílulas de Desenvolvimento
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="surface-card p-6 sm:p-8">
            <span className="eyebrow">
              {isMentorshipMode ? (
                <>
                  <Users className="h-4 w-4 text-brand-orange" /> Mentoria VIP
                </>
              ) : combo ? (
                <>
                  <Layers className="h-4 w-4 text-brand-orange" /> Combo 3 Cursos
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-brand-orange" /> Matrícula
                </>
              )}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
              {hasKiwify ? 'Finalizar matrícula no Kiwify' : 'Como você quer simular o pagamento?'}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {hasKiwify
                ? 'Você será direcionado ao checkout oficial do produto no Kiwify. Assim que o pagamento for aprovado, seu acesso é liberado automaticamente via webhook.'
                : isMentorshipMode
                  ? 'Contratação de mentoria: simulação de pagamento com liberação imediata da sua vaga e encontros.'
                  : combo
                    ? 'Combo promocional de 3 cursos: simule o pagamento para liberar os 3 cursos de uma vez.'
                    : 'Curso demonstrativo: simule o pagamento para liberar seu acesso imediatamente.'}
            </p>

            {hasKiwify ? (
              /* FLUXO KIWIFY INTEGRADO */
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-orange text-white shadow-md">
                      <CreditCard className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="text-lg font-extrabold text-brand-navy">
                        Checkout Oficial Kiwify
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">
                        Pague com segurança através de <strong>Pix</strong> (aprovação instantânea),{' '}
                        <strong>Cartão de Crédito</strong> ou <strong>Boleto Bancário</strong> no
                        próprio gateway do Kiwify.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-brand-navy">
                        <span className="rounded-lg bg-white px-3 py-1 border border-brand-border shadow-xs">
                          ✓ Pix com liberação imediata
                        </span>
                        <span className="rounded-lg bg-white px-3 py-1 border border-brand-border shadow-xs">
                          ✓ Cartão em até 12x
                        </span>
                        <span className="rounded-lg bg-white px-3 py-1 border border-brand-border shadow-xs">
                          ✓ Webhook com validação de token
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                )}

                <Button
                  onClick={() => void handleGoToKiwifyCheckout()}
                  disabled={redirectingKiwify}
                  className="pill-button h-14 w-full bg-brand-orange text-base font-extrabold text-white shadow-lg hover:bg-brand-orange-dark"
                >
                  {redirectingKiwify ? (
                    <>
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                      Criando pedido e abrindo Kiwify…
                    </>
                  ) : (
                    <>
                      Quero me matricular no Kiwify
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-brand-muted">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Sem pagamento = sem acesso · O webhook valida o token e libera a matrícula
                </div>

                <div className="pt-4 border-t border-brand-border/60">
                  <details className="text-xs text-brand-muted">
                    <summary className="cursor-pointer font-semibold text-brand-navy hover:text-brand-orange">
                      Ambiente de testes do administrador (abrir opções simuladas)
                    </summary>
                    <div className="mt-4 space-y-4 pt-2">
                      <p>
                        Para testes manuais sem passar pelo Kiwify real, você pode utilizar a
                        simulação interna abaixo:
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        onClick={async () => {
                          setProcessing(true)
                          try {
                            const current = await ensureOrder()
                            await confirmOrder(current.id)
                            navigate(`/pedido/${current.id}`)
                          } catch {
                            setProcessing(false)
                          }
                        }}
                        className="rounded-full"
                      >
                        {processing ? 'Confirmando…' : 'Simular aprovação imediata'}
                      </Button>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              /* FLUXO SIMULADO (para Mentoria, Combos e Cursos sem Kiwify) */
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
                <form onSubmit={paySimulated}>
                  <TabsContent value="pix" className="mt-7">
                    <div className="grid items-center gap-7 sm:grid-cols-[180px_1fr]">
                      <div className="relative mx-auto grid aspect-square w-[180px] place-items-center rounded-2xl border-8 border-white bg-brand-navy p-4 shadow-lg">
                        <div className="absolute inset-3 opacity-90 [background-image:repeating-linear-gradient(0deg,#101828_0,#101828_5px,white_5px,white_9px),repeating-linear-gradient(90deg,transparent_0,transparent_7px,#fff_7px,#fff_11px)] mix-blend-screen" />
                        <QrCode className="relative h-16 w-16 text-brand-orange" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-brand-navy">Pix copia e cola</h2>
                        <p className="mt-2 text-sm leading-6 text-brand-muted">
                          Gere o pedido, copie o código demonstrativo e confirme a simulação.
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
                    className="pill-button mt-8 h-13 w-full bg-brand-orange text-base font-extrabold hover:bg-brand-orange-dark"
                  >
                    {processing ? (
                      <>
                        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                        Confirmando pagamento…
                      </>
                    ) : isMentorshipMode ? (
                      'Confirmar contratação da Mentoria'
                    ) : combo ? (
                      'Confirmar compra do Combo (3 Cursos)'
                    ) : (
                      'Quero me matricular'
                    )}
                  </Button>
                </form>
              </Tabs>
            )}
          </div>

          {/* Resumo Lateral */}
          <aside>
            <div className="surface-card sticky top-28 overflow-hidden">
              {course ? (
                <CourseCover course={course} className="aspect-video" />
              ) : combo ? (
                <div className="relative flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-center text-white">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange text-white shadow-lg">
                    <Layers className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-brand-orange">
                    Combo Promocional
                  </p>
                  <p className="mt-1 text-sm font-extrabold">3 Cursos em 1</p>
                </div>
              ) : (
                <div className="relative flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light p-6 text-center text-white">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-orange text-white shadow-lg">
                    <Users className="h-7 w-7" />
                  </span>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-brand-orange">
                    Mentoria Exclusiva
                  </p>
                  <p className="mt-1 text-sm font-extrabold">Encontros Semanais Ao Vivo</p>
                </div>
              )}

              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                  Resumo do pedido
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-brand-navy">{itemTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  {isMentorshipMode
                    ? mentorship?.subtitle ||
                      'Encontros ao vivo semanais com Edson Lúcio, gravações e material de aplicação.'
                    : combo
                      ? combo.subtitle || 'Acesso vitalício aos 3 cursos inclusos no combo.'
                      : course?.subtitle}
                </p>

                {combo && combo.expand?.courses && combo.expand.courses.length > 0 && (
                  <div className="mt-4 rounded-xl bg-brand-subtle p-3 text-xs">
                    <p className="font-bold text-brand-navy mb-1.5">Cursos inclusos:</p>
                    <ul className="space-y-1 text-brand-muted">
                      {combo.expand.courses.map((c) => (
                        <li key={c.id} className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-brand-orange shrink-0" />
                          <span className="truncate">{c.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="my-6 h-px bg-brand-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-muted">
                    {isMentorshipMode
                      ? 'Mentoria completa'
                      : combo
                        ? 'Combo de 3 cursos'
                        : 'Acesso completo'}
                  </span>
                  <span className="font-bold text-brand-navy">{formatPrice(itemPrice)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <strong className="text-brand-navy">Total</strong>
                  <strong className="text-2xl font-extrabold text-brand-orange">
                    {formatPrice(itemPrice)}
                  </strong>
                </div>

                <div className="mt-6 rounded-xl bg-green-50 p-4 text-xs leading-5 text-green-700 border border-green-200">
                  <strong>Acesso imediato:</strong> após a confirmação do pagamento, seu acesso à{' '}
                  {isMentorshipMode ? 'área de mentorias' : 'plataforma'} é liberado na hora.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
