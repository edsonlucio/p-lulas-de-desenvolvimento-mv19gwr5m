import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

export default function ConfirmEmailChange() {
  const [params] = useSearchParams()
  const { logout } = useAuth()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  useEffect(() => {
    if (!token) return setStatus('error')
    pb.collection('users')
      .confirmEmailChange(token, '')
      .then(() => {
        logout()
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [logout, token])
  return (
    <div className="auth-shell">
      <div className="container-site">
        <div className="mx-auto max-w-md">
          <BrandLogo />
          <div className="surface-card mt-8 p-9 text-center">
            {status === 'loading' && (
              <>
                <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-brand-orange" />
                <h1 className="mt-5 text-2xl font-extrabold">Confirmando novo e-mail…</h1>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">E-mail atualizado</h1>
                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Por segurança, sua sessão foi encerrada. Entre novamente usando o novo endereço.
                </p>
                <Button
                  asChild
                  className="pill-button mt-7 w-full bg-brand-orange hover:bg-brand-orange-dark"
                >
                  <Link to="/entrar">Entrar com novo e-mail</Link>
                </Button>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="mx-auto h-14 w-14 text-red-500" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">Link inválido</h1>
                <p className="mt-3 text-sm text-brand-muted">
                  Solicite uma nova troca de e-mail no seu perfil.
                </p>
                <Button asChild variant="outline" className="pill-button mt-7 w-full">
                  <Link to="/app/perfil">Voltar ao perfil</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
