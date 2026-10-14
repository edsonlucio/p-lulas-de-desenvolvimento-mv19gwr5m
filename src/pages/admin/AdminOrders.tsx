import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Filter,
  Key,
  Layers,
  LoaderCircle,
  QrCode,
  Save,
  ShieldCheck,
  Sparkles,
  Webhook,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import type { CourseRecord, OrderRecord, OrderStatus, UserRecord } from '@/lib/types'
import { getWebhookConfig, listOrders, updateWebhookConfig } from '@/services/admin'
import { formatPrice } from '@/services/courses'
import { confirmOrder } from '@/services/student'

interface ExpandedOrder extends OrderRecord {
  expand?: { user?: UserRecord; course?: CourseRecord }
}

export default function AdminOrders() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<ExpandedOrder[]>([])
  const [filter, setFilter] = useState('todos')
  const [confirming, setConfirming] = useState('')
  const [loading, setLoading] = useState(true)

  // Configuração do Webhook Kiwify
  const [webhookToken, setWebhookToken] = useState('')
  const [webhookActive, setWebhookActive] = useState(true)
  const [webhookPath, setWebhookPath] = useState('/backend/v1/kiwify-webhook')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // URL pública completa do webhook para o Kiwify
  const backendBaseUrl =
    import.meta.env.VITE_POCKETBASE_URL ||
    'https://pilulas-de-desenvolvimento-0d150.shrd01.internal.goskip.dev'
  const fullWebhookUrl = `${backendBaseUrl.replace(/\/+$/, '')}${webhookPath}`

  async function load() {
    setLoading(true)
    try {
      const [orderList, webhookCfg] = await Promise.all([
        listOrders() as Promise<ExpandedOrder[]>,
        getWebhookConfig().catch(() => null),
      ])
      setOrders(orderList)
      if (webhookCfg) {
        setWebhookToken(webhookCfg.token || '')
        setWebhookActive(webhookCfg.is_active ?? true)
        if (webhookCfg.webhook_path) setWebhookPath(webhookCfg.webhook_path)
      }
    } catch {
      toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(
    () => orders.filter((order) => filter === 'todos' || order.status === filter),
    [filter, orders],
  )

  // Métricas de faturamento e volume de pedidos
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const paidOrders = orders.filter((o) => o.status === 'paid')
    const pendingOrders = orders.filter((o) => o.status === 'pending')
    const failedOrders = orders.filter((o) => o.status === 'falhou' || o.status === 'cancelled')
    const expiredOrders = orders.filter((o) => o.status === 'expirado')

    const totalConfirmedRevenue = paidOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    const totalPendingRevenue = pendingOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0)

    return {
      totalOrders,
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      failedCount: failedOrders.length,
      expiredCount: expiredOrders.length,
      totalConfirmedRevenue,
      totalPendingRevenue,
    }
  }, [orders])

  async function manual(order: ExpandedOrder) {
    setConfirming(order.id)
    try {
      await confirmOrder(order.id)
      toast({
        title: 'Pagamento confirmado manualmente',
        description: 'Matrícula ativa criada e 50 pontos concedidos ao aluno.',
      })
      await load()
    } catch {
      toast({ title: 'Não foi possível confirmar', variant: 'destructive' })
    } finally {
      setConfirming('')
    }
  }

  async function handleSaveWebhookConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!webhookToken.trim()) {
      toast({ title: 'O token não pode ser vazio', variant: 'destructive' })
      return
    }
    setSavingWebhook(true)
    try {
      await updateWebhookConfig({
        token: webhookToken.trim(),
        is_active: webhookActive,
      })
      toast({
        title: 'Configuração do webhook salva',
        description: 'O Kiwify agora validará cada aviso com o novo token configurado.',
      })
    } catch {
      toast({ title: 'Erro ao salvar configuração do webhook', variant: 'destructive' })
    } finally {
      setSavingWebhook(false)
    }
  }

  async function copyWebhookUrl() {
    await navigator.clipboard.writeText(fullWebhookUrl)
    setCopiedUrl(true)
    toast({ title: 'URL do Webhook copiada para a área de transferência!' })
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  async function copyTokenValue() {
    await navigator.clipboard.writeText(webhookToken)
    setCopiedToken(true)
    toast({ title: 'Token secreto copiado!' })
    setTimeout(() => setCopiedToken(false), 2000)
  }

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700 border border-green-200">
            <Check className="mr-1 h-3 w-3 stroke-[3]" />
            Pago
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 border border-amber-200">
            <Clock3 className="mr-1 h-3 w-3" />
            Pendente
          </span>
        )
      case 'falhou':
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700 border border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            {status === 'cancelled' ? 'Cancelado' : 'Falhou'}
          </span>
        )
      case 'expirado':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-700 border border-gray-300">
            <Clock3 className="mr-1 h-3 w-3" />
            Expirado
          </span>
        )
      default:
        return <span className="text-xs font-bold capitalize text-brand-muted">{status}</span>
    }
  }

  return (
    <div className="route-page py-10">
      <div className="container-site space-y-8">
        {/* Cabeçalho */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Gestão de vendas & Gateway Kiwify
            </span>
            <h1 className="section-title mt-3">Painel de Pedidos</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Acompanhe pedidos, situações em tempo real, total confirmado e integrações com o
              Kiwify.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="rounded-full bg-white sm:w-48">
                <Filter className="mr-2 h-4 w-4 text-brand-muted" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos ({orders.length})</SelectItem>
                <SelectItem value="paid">Pagos ({stats.paidCount})</SelectItem>
                <SelectItem value="pending">Pendentes ({stats.pendingCount})</SelectItem>
                <SelectItem value="falhou">Falhou ({stats.failedCount})</SelectItem>
                <SelectItem value="expirado">Expirado ({stats.expiredCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Métricas: Total Confirmado e Situações */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-card p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Total Confirmado
              </span>
              <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <strong className="mt-3 block text-2xl font-black text-brand-navy">
              {formatPrice(stats.totalConfirmedRevenue)}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">
              {stats.paidCount} {stats.paidCount === 1 ? 'pedido pago' : 'pedidos pagos'}
            </p>
          </div>

          <div className="surface-card p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Pendente em Aberto
              </span>
              <span className="rounded-full bg-amber-50 p-2 text-amber-600">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <strong className="mt-3 block text-2xl font-black text-brand-navy">
              {formatPrice(stats.totalPendingRevenue)}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">
              {stats.pendingCount} aguardando pagamento
            </p>
          </div>

          <div className="surface-card p-5 border-l-4 border-l-brand-orange">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Total de Pedidos
              </span>
              <span className="rounded-full bg-brand-orange/10 p-2 text-brand-orange">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <strong className="mt-3 block text-2xl font-black text-brand-navy">
              {stats.totalOrders}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">Registros no banco de dados</p>
          </div>

          <div className="surface-card p-5 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Falhou / Expirou
              </span>
              <span className="rounded-full bg-rose-50 p-2 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <strong className="mt-3 block text-2xl font-black text-brand-navy">
              {stats.failedCount + stats.expiredCount}
            </strong>
            <p className="mt-1 text-xs text-brand-muted">
              {stats.failedCount} falhas · {stats.expiredCount} expirados
            </p>
          </div>
        </div>

        {/* Painel de Integração Webhook Kiwify (Regras da Imagem) */}
        <div className="surface-card overflow-hidden border border-brand-orange/30 shadow-md">
          <div className="bg-gradient-to-r from-brand-navy via-brand-navy to-brand-navy/90 p-5 text-white sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-orange text-white shadow">
                  <Webhook className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">
                    Integração de Webhook Kiwify (Etapa Final)
                  </h2>
                  <p className="text-xs text-white/70">
                    Endereço público chamado pelo Kiwify com token validado a cada aviso.
                    Confirmação única: pedido 'pago' + matrícula ativa.
                  </p>
                </div>
              </div>
              <span className="self-start rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300 border border-emerald-500/30 sm:self-auto">
                Endpoint Ativo
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-white">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Coluna 1: Endereço Público do Webhook */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    Endereço público do Webhook (Cole no Kiwify)
                  </Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      readOnly
                      value={fullWebhookUrl}
                      className="font-mono text-xs bg-brand-subtle select-all text-brand-navy"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      onClick={() => void copyWebhookUrl()}
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-brand-navy" />
                      )}
                      <span className="ml-1 text-xs font-bold">
                        {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                      </span>
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-brand-muted">
                    No painel do Kiwify (Apps / Webhooks), cadastre esta URL para receber eventos de{' '}
                    <strong>Compra aprovada</strong>, <strong>recusada</strong> e{' '}
                    <strong>expirada</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-subtle p-3.5 text-xs text-brand-muted space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-brand-navy">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Regras de Segurança Atendidas:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px]">
                    <li>O botão NUNCA cria matrícula — apenas o webhook autenticado cria</li>
                    <li>Token inválido ou ausente é rejeitado com HTTP 401</li>
                    <li>Confirmação duplicada é idempotente (nada é duplicado)</li>
                    <li>Sem pagamento = sem acesso (player bloqueado para não-matriculados)</li>
                  </ul>
                </div>
              </div>

              {/* Coluna 2: Formulário do Token do Webhook */}
              <form onSubmit={handleSaveWebhookConfig} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                      Token Secreto do Webhook
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-xs font-semibold text-brand-orange hover:underline"
                    >
                      {showToken ? 'Ocultar' : 'Exibir token'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={webhookToken}
                        onChange={(e) => setWebhookToken(e.target.value)}
                        placeholder="Insira o token secreto do Kiwify"
                        className="pl-9 font-mono text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyTokenValue()}
                      className="rounded-xl text-brand-muted hover:text-brand-navy"
                      title="Copiar token"
                    >
                      {copiedToken ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-brand-muted">
                    Validado a cada aviso recebido. O webhook aceita o token via header{' '}
                    <code className="text-brand-navy">X-Kiwify-Token</code>, via query param{' '}
                    <code className="text-brand-navy">?token=SEU_TOKEN</code> ou assinatura HMAC.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={webhookActive}
                      onCheckedChange={setWebhookActive}
                      id="webhook-active"
                    />
                    <Label
                      htmlFor="webhook-active"
                      className="text-xs font-bold text-brand-navy cursor-pointer"
                    >
                      Webhook Kiwify Ativo
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={savingWebhook}
                    className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-bold h-9 px-5"
                  >
                    {savingWebhook ? (
                      <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Salvar Token
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Tabela de Pedidos com Situação, Datas e Total */}
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-border p-4 bg-brand-subtle/40">
            <div>
              <h2 className="text-sm font-extrabold text-brand-navy">Listagem de Pedidos</h2>
              <span className="text-xs text-brand-muted">
                Mostrando {visible.length} de {orders.length} pedidos
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Data Pedido</th>
                  <th>Data Confirmação / Fim</th>
                  <th>Origem / Ref</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const studentName = order.expand?.user?.name || 'Aluno'
                  const studentEmail = order.expand?.user?.email || order.user
                  const courseTitle = order.expand?.course?.title || order.course

                  const paidOrFailedDate = order.paid_at || order.failed_at || order.expired_at

                  return (
                    <tr key={order.id}>
                      {/* Aluno */}
                      <td>
                        <strong className="block text-brand-navy">{studentName}</strong>
                        <span className="text-xs text-brand-muted font-mono">{studentEmail}</span>
                      </td>

                      {/* Curso */}
                      <td className="font-semibold text-brand-navy">{courseTitle}</td>

                      {/* Valor */}
                      <td className="font-extrabold text-brand-navy">
                        {formatPrice(order.amount)}
                      </td>

                      {/* Situação */}
                      <td>{statusBadge(order.status)}</td>

                      {/* Data de criação do pedido */}
                      <td className="text-xs text-brand-muted">
                        {order.created
                          ? new Date(order.created).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>

                      {/* Data de confirmação / falha / expiração */}
                      <td className="text-xs text-brand-muted">
                        {paidOrFailedDate ? (
                          <span className="font-medium text-brand-navy">
                            {new Date(paidOrFailedDate).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        ) : order.status === 'pending' ? (
                          <span className="text-amber-600 font-semibold">Aguardando</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Origem / Referência Kiwify */}
                      <td>
                        <div className="text-xs">
                          {order.kiwify_order_id ? (
                            <span
                              className="font-mono text-[11px] text-brand-navy bg-brand-surface px-2 py-0.5 rounded border border-brand-border"
                              title={`Kiwify ID: ${order.kiwify_order_id}`}
                            >
                              Kiwify #{order.kiwify_order_id.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-brand-muted flex items-center gap-1">
                              {order.method === 'pix' ? (
                                <QrCode className="h-3.5 w-3.5 text-brand-orange" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                              )}
                              Direto ({order.method})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td>
                        {order.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => void manual(order)}
                              disabled={confirming === order.id}
                              className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white text-xs h-8"
                              title="Confirmar pagamento manualmente (venda direta/apoio)"
                            >
                              {confirming === order.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Confirmar pagamento'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-brand-muted">Concluído</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!visible.length && !loading && (
            <div className="p-12 text-center text-sm text-brand-muted">
              Nenhum pedido encontrado neste filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
