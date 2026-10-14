import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import pb from '@/lib/pocketbase/client'

export default function PasswordRecovery() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.')
    setLoading(true)
    setError('')
    try {
      await pb.collection('users').requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('Não foi possível enviar o link agora. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="auth-shell">
      <div className="container-site">
        <div className="mx-auto max-w-md">
          <div className="mb-8">
            <BrandLogo />
          </div>
          <div className="surface-card p-7 sm:p-9">
            {sent ? (
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
                  <MailCheck className="h-7 w-7" />
                </span>
                <h1 className="mt-6 text-2xl font-extrabold text-brand-navy">
                  Confira sua caixa de entrada
                </h1>
                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Se houver uma conta para <strong>{email}</strong>, você receberá um link para
                  criar uma nova senha.
                </p>
                <Button asChild variant="outline" className="pill-button mt-7 w-full">
                  <Link to="/entrar">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para entrar
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                  <Mail className="h-5 w-5" />
                </span>
                <h1 className="mt-6 text-3xl font-extrabold text-brand-navy">
                  Esqueceu sua senha?
                </h1>
                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  Sem problema. Informe seu e-mail e enviaremos o caminho de volta.
                </p>
                <form onSubmit={submit} className="mt-7">
                  <label className="form-label" htmlFor="email">
                    E-mail da conta
                  </label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="voce@email.com"
                    className="h-12 rounded-xl"
                  />
                  {error && <p className="form-error">{error}</p>}
                  <Button
                    disabled={loading}
                    className="pill-button mt-5 h-12 w-full bg-brand-orange hover:bg-brand-orange-dark"
                  >
                    {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                  </Button>
                </form>
                <Link
                  to="/entrar"
                  className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-brand-muted hover:text-brand-orange"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
