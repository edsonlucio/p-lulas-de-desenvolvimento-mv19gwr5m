import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Informe um e-mail válido.'
    if (!password) next.password = 'Digite sua senha.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      const result = await login(email, password)
      toast({
        title: `Que bom ter você de volta, ${result.record.name?.split(' ')[0] || 'Pílula'}!`,
      })
      const redirect = params.get('redirect')
      navigate(redirect || (result.record.role === 'admin' ? '/admin' : '/app'))
    } catch (error) {
      setErrors({
        general:
          getErrorMessage(error) === 'Failed to authenticate.'
            ? 'E-mail ou senha incorretos.'
            : getErrorMessage(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="orange-glow absolute -left-48 top-[-220px] h-[620px] w-[620px]" />
      <div className="container-site relative grid items-center gap-12 lg:grid-cols-2">
        <div className="hidden rounded-[32px] bg-brand-navy p-12 text-white lg:block">
          <BrandLogo inverse />
          <div className="mt-20">
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Sua trilha continua
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-[-.05em]">
              Uma dose de conhecimento pode mudar o seu dia.
            </h1>
            <p className="mt-6 leading-8 text-white/65">
              Entre para retomar suas aulas, acompanhar seus pontos e manter o movimento.
            </p>
          </div>
          <div className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm leading-7 text-white/75">
              “O desenvolvimento não acontece de uma vez. Ele acontece toda vez que você escolhe dar
              o próximo passo.”
            </p>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              Pílulas de Desenvolvimento
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>
          <div className="surface-card p-6 sm:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
              Entre na sua conta
            </h1>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Continue aprendendo de onde parou.
            </p>
            {errors.general && (
              <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {errors.general}
              </div>
            )}
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label className="form-label" htmlFor="email">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="h-12 rounded-xl pl-11"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="form-label" htmlFor="password">
                    Senha
                  </label>
                  <Link
                    to="/esqueci-senha"
                    className="mb-2 text-xs font-bold text-brand-orange hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="h-12 rounded-xl px-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>
              <Button
                disabled={submitting}
                className="pill-button h-12 w-full bg-brand-orange hover:bg-brand-orange-dark"
              >
                {submitting ? 'Entrando…' : 'Entrar'}{' '}
                {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-7 text-center text-sm text-brand-muted">
              Ainda não tem conta?{' '}
              <Link to="/cadastro" className="font-extrabold text-brand-orange hover:underline">
                Criar conta grátis
              </Link>
            </p>
            <div className="mt-6 rounded-xl bg-brand-subtle p-3 text-center text-[11px] leading-5 text-brand-muted">
              <strong>Conta de demonstração:</strong> maria.almeida@example.com · senha Skip@Pass
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
