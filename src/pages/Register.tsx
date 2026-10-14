import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Informe seu nome completo.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Informe um e-mail válido.'
    if (form.password.length < 8) next.password = 'Use pelo menos 8 caracteres.'
    if (form.password !== form.passwordConfirm)
      next.passwordConfirm = 'As senhas precisam ser iguais.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      await register(form)
      toast({
        title: '+100 pontos de boas-vindas! 🎉',
        description: 'Sua trilha de desenvolvimento começou.',
      })
      navigate('/app')
    } catch (error) {
      setErrors({ general: getErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  return (
    <div className="auth-shell">
      <div className="container-site relative grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="hidden lg:block">
          <BrandLogo />
          <span className="eyebrow mt-16">
            <Sparkles className="h-4 w-4" /> Cadastro aberto
          </span>
          <h1 className="mt-5 text-5xl font-extrabold tracking-[-.05em] text-brand-navy">
            Seu próximo nível começa com uma escolha pequena.
          </h1>
          <p className="body-muted mt-6 max-w-lg">
            Crie sua conta, ganhe 100 pontos e tenha uma área feita para aprender, aplicar e
            acompanhar cada conquista.
          </p>
          <div className="mt-9 space-y-4">
            {[
              'Retome cada aula exatamente de onde parou',
              'Encontre respostas citando a aula certa',
              'Ganhe pontos a cada avanço na sua trilha',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 font-semibold text-brand-navy">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-4 w-4" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>
          <div className="surface-card p-6 sm:p-9">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                <Gift className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-extrabold text-green-600">
                +100 pontos ao entrar
              </span>
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
              Crie sua conta grátis
            </h1>
            <p className="mt-2 text-sm text-brand-muted">Leva menos de dois minutos.</p>
            {errors.general && (
              <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {errors.general}
              </div>
            )}
            <form onSubmit={submit} className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="form-label" htmlFor="name">
                  Nome completo
                </label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => field('name', e.target.value)}
                    placeholder="Como podemos chamar você?"
                    className="h-12 rounded-xl pl-11"
                  />
                </div>
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="form-label" htmlFor="email">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => field('email', e.target.value)}
                    placeholder="voce@email.com"
                    className="h-12 rounded-xl pl-11"
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => field('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-12 rounded-xl px-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
                    aria-label="Mostrar senha"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="passwordConfirm">
                  Confirmar senha
                </label>
                <Input
                  id="passwordConfirm"
                  type={show ? 'text' : 'password'}
                  value={form.passwordConfirm}
                  onChange={(e) => field('passwordConfirm', e.target.value)}
                  placeholder="Repita sua senha"
                  className="h-12 rounded-xl"
                />
                {errors.passwordConfirm && <p className="form-error">{errors.passwordConfirm}</p>}
              </div>
              <Button
                disabled={submitting}
                className="pill-button h-12 bg-brand-orange hover:bg-brand-orange-dark sm:col-span-2"
              >
                {submitting ? 'Criando sua conta…' : 'Criar minha conta'}{' '}
                {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-brand-muted">
              Já tem uma conta?{' '}
              <Link to="/entrar" className="font-extrabold text-brand-orange">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
