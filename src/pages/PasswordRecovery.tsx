import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import pb from '@/lib/pocketbase/client'

export default function PasswordRecovery() {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cleanEmail = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Informe um e-mail válido.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // O PocketBase envia o link de reset configurado nos templates
      await pb.collection('users').requestPasswordReset(cleanEmail)
    } catch {
      // Prática padrão de segurança: não expor erros do servidor que revelem a existência ou não da conta
    } finally {
      setSubmittedEmail(cleanEmail)
      setSent(true)
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
              <Sparkles className="h-4 w-4" /> Recuperação de acesso
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-[-.05em]">
              Sua jornada de evolução não para por aqui.
            </h1>
            <p className="mt-6 leading-8 text-white/65">
              Esqueceu a senha? Sem estresse. Pequenas ações resolvem grandes desafios. Em poucos
              instantes você recebe o link no seu e-mail para voltar ao seu ritmo de estudos.
            </p>
          </div>
          <div className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm leading-7 text-white/75">
              “Pequenas pílulas, grandes transformações. Seu foco hoje constrói o resultado de
              amanhã.”
            </p>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              Pílulas de Desenvolvimento
            </p>
          </div>
        </div>

        {/* Lado direito: formulário / confirmação */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>

          <div className="surface-card p-6 sm:p-9">
            {sent ? (
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-600 border border-green-100">
                  <CheckCircle2 className="h-7 w-7" />
                </span>

                <h1 className="mt-6 text-2xl font-extrabold tracking-[-.03em] text-brand-navy">
                  Verifique sua caixa de entrada
                </h1>

                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Se este e-mail estiver cadastrado na plataforma, enviamos um link para redefinir
                  sua senha em:
                </p>

                <div className="mt-3 rounded-xl bg-brand-subtle px-4 py-2 text-sm font-semibold text-brand-navy break-all">
                  {submittedEmail}
                </div>

                <div className="mt-6 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4 text-left text-xs leading-5 text-brand-muted">
                  <p className="font-semibold text-brand-orange mb-1">Dica importante:</p>
                  <p>
                    O link é válido por tempo limitado. Se não encontrar a mensagem em alguns
                    minutos, verifique também sua pasta de <strong>Spam</strong> ou{' '}
                    <strong>Lixo eletrônico</strong>.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <Button
                    asChild
                    className="pill-button h-12 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                  >
                    <Link to="/entrar">
                      Ir para a tela de login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setSent(false)
                      setEmail('')
                      setError('')
                    }}
                    className="w-full text-center text-xs font-bold text-brand-muted hover:text-brand-orange py-2 transition-colors"
                  >
                    Tentar outro e-mail
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                  <Mail className="h-5 w-5" />
                </span>

                <h1 className="mt-6 text-3xl font-extrabold tracking-[-.04em] text-brand-navy">
                  Recuperar senha
                </h1>

                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  Digite seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua
                  senha.
                </p>

                <form onSubmit={submit} className="mt-7 space-y-5">
                  <div>
                    <label className="form-label" htmlFor="email">
                      E-mail da sua conta
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                      <Input
                        id="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (error) setError('')
                        }}
                        type="email"
                        placeholder="voce@email.com"
                        className="h-12 rounded-xl pl-11"
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {error && <p className="form-error">{error}</p>}
                  </div>

                  <Button
                    disabled={loading}
                    className="pill-button h-12 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                  >
                    {loading ? 'Enviando link…' : 'Enviar link de redefinição'}
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
