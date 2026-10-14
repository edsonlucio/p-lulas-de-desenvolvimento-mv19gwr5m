import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, CreditCard, Filter, LoaderCircle, QrCode, Sparkles } from 'lucide-react'
import type { RecordModel } from 'pocketbase'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { CourseRecord, OrderRecord, UserRecord } from '@/lib/types'
import { listOrders } from '@/services/admin'
import { confirmOrder } from '@/services/student'
import { formatPrice } from '@/services/courses'

interface ExpandedOrder extends OrderRecord {
  expand?: { user?: UserRecord; course?: CourseRecord }
}

export default function AdminOrders() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<ExpandedOrder[]>([])
  const [filter, setFilter] = useState('todos')
  const [confirming, setConfirming] = useState('')
  async function load() {
    setOrders((await listOrders()) as ExpandedOrder[])
  }
  useEffect(() => {
    void load()
  }, [])
  const visible = useMemo(
    () => orders.filter((order) => filter === 'todos' || order.status === filter),
    [filter, orders],
  )
  async function manual(order: ExpandedOrder) {
    setConfirming(order.id)
    try {
      await confirmOrder(order.id)
      toast({
        title: 'Pagamento confirmado',
        description: 'Matrícula criada e 50 pontos concedidos.',
      })
      await load()
    } catch {
      toast({ title: 'Não foi possível confirmar', variant: 'destructive' })
    } finally {
      setConfirming('')
    }
  }
  const statusLabel = { pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado' }
  return (
    <div className="route-page py-10">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Checkout simulado
            </span>
            <h1 className="section-title mt-3">Pedidos</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Confirme pagamentos e libere o acesso dos alunos.
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="rounded-full bg-white sm:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="surface-card mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Método</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong className="block text-brand-navy">
                        {order.expand?.user?.name || 'Aluno'}
                      </strong>
                      <span className="text-xs text-brand-muted">
                        {order.expand?.user?.email || order.user}
                      </span>
                    </td>
                    <td className="font-semibold text-brand-navy">
                      {order.expand?.course?.title || order.course}
                    </td>
                    <td>
                      <span className="flex items-center gap-2 capitalize">
                        {order.method === 'pix' ? (
                          <QrCode className="h-4 w-4 text-brand-orange" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-500" />
                        )}
                        {order.method === 'cartao' ? 'Cartão' : 'Pix'}
                      </span>
                    </td>
                    <td className="font-extrabold text-brand-navy">{formatPrice(order.amount)}</td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${order.status === 'paid' ? 'bg-green-50 text-green-700' : order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {order.status === 'pending' && <Clock3 className="mr-1.5 h-3 w-3" />}
                        {order.status === 'paid' && <Check className="mr-1.5 h-3 w-3" />}
                        {statusLabel[order.status]}
                      </span>
                    </td>
                    <td className="text-brand-muted">
                      {new Date(order.created).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>
                      {order.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => void manual(order)}
                          disabled={confirming === order.id}
                          className="pill-button bg-brand-orange hover:bg-brand-orange-dark"
                        >
                          {confirming === order.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            'Confirmar pagamento'
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-brand-muted">Concluído</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <div className="p-12 text-center text-sm text-brand-muted">
              Nenhum pedido neste filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
