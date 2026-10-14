import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, Gift, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { CourseRecord, OrderRecord } from '@/lib/types'

export default function OrderSuccess() {
  const { id = '' } = useParams()
  const { toast } = useToast()
  const [course, setCourse] = useState<CourseRecord | null>(null)
  const [order, setOrder] = useState<OrderRecord | null>(null)
  useEffect(() => {
    pb.collection<OrderRecord>('orders')
      .getOne(id)
      .then(async (record) => {
        setOrder(record)
        setCourse(await pb.collection<CourseRecord>('courses').getOne(record.course))
        toast({
          title: '+50 pontos pela compra',
          description: 'Seu compromisso com o desenvolvimento foi reconhecido.',
        })
      })
      .catch(() => {})
  }, [id, toast])
  return (
    <div className="route-page relative overflow-hidden bg-brand-sand py-16 sm:py-24">
      <div className="orange-glow absolute left-1/2 top-[-300px] h-[700px] w-[700px] -translate-x-1/2" />
      <div className="container-site relative">
        <div className="surface-card mx-auto max-w-2xl overflow-hidden text-center">
          <div className="relative bg-brand-navy px-6 py-14 text-white">
            <div className="absolute inset-0 grid-pattern opacity-70" />
            <div className="relative">
              <div className="mx-auto grid h-24 w-24 animate-check-pop place-items-center rounded-full border-[10px] border-green-500/20 bg-green-500 text-white shadow-[0_0_60px_rgba(22,163,74,.4)]">
                <Check className="h-10 w-10 stroke-[3]" />
              </div>
              <span className="eyebrow mt-7">
                <Sparkles className="h-4 w-4" /> Pedido{' '}
                {order?.id ? `#${order.id.slice(-6).toUpperCase()}` : ''}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                Pagamento confirmado!
              </h1>
              <p className="mt-3 text-white/68">Você já tem acesso ao curso.</p>
            </div>
          </div>
          <div className="p-7 sm:p-10">
            <div className="mx-auto flex max-w-md items-center gap-4 rounded-2xl bg-brand-subtle p-4 text-left">
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
              A primeira aula já está esperando. Dê o próximo passo enquanto sua energia está alta.
            </p>
            <Button
              asChild
              className="pill-button mt-7 h-12 bg-brand-orange px-8 hover:bg-brand-orange-dark"
            >
              <Link to={course ? `/app/curso/${course.slug}` : '/app'}>
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link
              to="/app"
              className="mt-5 block text-sm font-bold text-brand-muted hover:text-brand-orange"
            >
              Ir para meus cursos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
