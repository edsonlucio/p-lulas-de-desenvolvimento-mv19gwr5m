import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import pb from '@/lib/pocketbase/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!token.trim()) {
      setError('O token de redefinição não foi informado ou é inválido.')
      return
    }

    if (password.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('A confirmação da senha não confere. Digite senhas iguais.')
      return
    }

    setLoading(true)
    try {
      // PocketBase confirmPasswordReset recebe token, password e passwordConfirm
      await pb.collection('users').confirmPasswordReset(token, password, confirm)
      setDone(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'O link expirou ou já foi utilizado. Solicite um novo link.'
      if (
        msg.toLowerCase().includes('token') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('failed')
      ) {
        setError(
          'O link de redefinição expirou ou já foi utilizado. Por favor, solicite um novo link.',
        )
      } else {
        setError('Não foi possível redefinir a senha no momento. Tente novamente mais tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="orange-glow absolute -left-48 top-[-220px] h-[620px] w-[620px]" />
      <div className="container-site relative grid items-center gap-12 lg:grid-cols-2">
        {/* Lado esquerdo institucional */}
        <div className="hidden rounded-[32px] bg-brand-navy p-12 text-white lg:block">
          <BrandLogo inverse />
          <div className="mt-20">
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Nova senha
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-[-.05em]">
              Sua segurança e seu progresso em boas mãos.
            </h1>
            <p className="mt-6 leading-8 text-white/65">
              Escolha uma senha forte para proteger seu histórico de aulas, certificados, pontos e
              conquistas na Pílulas de Desenvolvimento.
            </p>
          </div>
          <div className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm leading-7 text-white/75">
              “Consistência é fazer o que precisa ser feito todos os dias. Bem-vindo de volta ao seu
              plano de crescimento.”
            </p>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              Pílulas de Desenvolvimento
            </p>
          </div>
        </div>

        {/* Lado direito: formulário / sucesso */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>

          <div className="surface-card p-6 sm:p-9">
            {done ? (
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-600 border border-green-100">
                  <CheckCircle2 className="h-7 w-7" />
                </span>

                <h1 className="mt-6 text-2xl font-extrabold tracking-[-.03em] text-brand-navy">
                  Senha redefinida com sucesso!
                </h1>

                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Sua nova senha já está ativa. Você já pode acessar a plataforma com suas novas
                  credenciais.
                </p>

                <Button
                  asChild
                  className="pill-button mt-8 h-12 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                >
                  <Link to="/entrar">
                    Entrar na plataforma
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : !token ? (
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                  <AlertCircle className="h-7 w-7" />
                </span>

                <h1 className="mt-6 text-2xl font-extrabold tracking-[-.03em] text-brand-navy">
                  Link incompleto ou ausente
                </h1>

                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Não encontramos o código de redefinição no endereço acessado. Clique no link que
                  você recebeu por e-mail ou peça uma nova recuperação.
                </p>

                <Button
                  asChild
                  className="pill-button mt-8 h-12 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                >
                  <Link to="/recuperar-senha">
                    Solicitar novo link
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <div className="mt-6 border-t border-brand-subtle pt-4 text-center">
                  <Link
                    to="/entrar"
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-muted hover:text-brand-orange transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                  <KeyRound className="h-5 w-5" />
                </span>

                <h1 className="mt-6 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
                  Crie sua nova senha
                </h1>

                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  A nova senha deve ter no mínimo 8 caracteres.
                </p>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p>{error}</p>
                      {error.includes('expirou') && (
                        <Link
                          to="/recuperar-senha"
                          className="mt-2 inline-block font-bold text-brand-orange underline text-xs"
                        >
                          Clique aqui para solicitar um novo link
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={submit} className="mt-7 space-y-5">
                  <div>
                    <label className="form-label" htmlFor="new-password">
                      Nova senha
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (error) setError('')
                        }}
                        placeholder="Mínimo 8 caracteres"
                        className="h-12 rounded-xl pl-11 pr-11"
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy"
                        aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="confirm-password">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value)
                          if (error) setError('')
                        }}
                        placeholder="Repita a nova senha"
                        className="h-12 rounded-xl pl-11 pr-11"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy"
                        aria-label={showConfirm ? 'Ocultar confirmação' : 'Exibir confirmação'}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    disabled={loading}
                    className="pill-button h-12 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                  >
                    {loading ? 'Salvando nova senha…' : 'Redefinir senha'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-8 border-t border-brand-subtle pt-6 text-center">
                  <Link
                    to="/entrar"
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-muted hover:text-brand-orange transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
