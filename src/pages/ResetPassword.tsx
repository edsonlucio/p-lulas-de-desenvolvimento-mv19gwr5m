import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/BrandLogo'
import pb from '@/lib/pocketbase/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas precisam ser iguais.')
    if (!token) return setError('Este link não contém um token válido.')
    setLoading(true)
    try {
      await pb.collection('users').confirmPasswordReset(token, password, confirm)
      setDone(true)
    } catch {
      setError('O link expirou ou já foi utilizado. Solicite outro.')
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
          <div className="surface-card p-8">
            {done ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">Senha atualizada!</h1>
                <p className="mt-2 text-sm text-brand-muted">
                  Sua nova senha já está pronta para uso.
                </p>
                <Button
                  asChild
                  className="pill-button mt-7 w-full bg-brand-orange hover:bg-brand-orange-dark"
                >
                  <Link to="/entrar">Entrar na plataforma</Link>
                </Button>
              </div>
            ) : (
              <>
                <KeyRound className="h-10 w-10 text-brand-orange" />
                <h1 className="mt-5 text-3xl font-extrabold text-brand-navy">
                  Crie uma nova senha
                </h1>
                <p className="mt-2 text-sm text-brand-muted">
                  Escolha uma senha segura que você consiga lembrar.
                </p>
                <form onSubmit={submit} className="mt-7 space-y-4">
                  <div>
                    <label className="form-label">Nova senha</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirmar nova senha</label>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <Button
                    disabled={loading}
                    className="pill-button h-12 w-full bg-brand-orange hover:bg-brand-orange-dark"
                  >
                    {loading ? 'Atualizando…' : 'Atualizar senha'}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
