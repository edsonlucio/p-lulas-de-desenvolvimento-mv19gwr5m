import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, LoaderCircle, MailWarning, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/BrandLogo'
import pb from '@/lib/pocketbase/client'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  useEffect(() => {
    if (!token) return setState('error')
    pb.collection('users')
      .confirmVerification(token)
      .then(() => setState('success'))
      .catch(() => setState('error'))
  }, [token])
  return (
    <div className="auth-shell">
      <div className="container-site">
        <div className="mx-auto max-w-md">
          <div className="mb-8">
            <BrandLogo />
          </div>
          <div className="surface-card p-9 text-center">
            {state === 'loading' && (
              <>
                <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-brand-orange" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">
                  Confirmando seu e-mail…
                </h1>
              </>
            )}
            {state === 'success' && (
              <>
                <CheckCircle2 className="mx-auto h-14 w-14 animate-check-pop text-green-600" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">E-mail confirmado!</h1>
                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  Sua conta está segura e sua trilha de pontos continua protegida.
                </p>
                <Button
                  asChild
                  className="pill-button mt-7 w-full bg-brand-orange hover:bg-brand-orange-dark"
                >
                  <Link to={pb.authStore.isValid ? '/app' : '/entrar'}>Ir para minha área</Link>
                </Button>
              </>
            )}
            {state === 'error' && (
              <>
                <XCircle className="mx-auto h-14 w-14 text-red-500" />
                <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">
                  Não conseguimos confirmar
                </h1>
                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  O link pode ter expirado ou já ter sido utilizado.
                </p>
                <Button asChild variant="outline" className="pill-button mt-7 w-full">
                  <Link to="/entrar">
                    <MailWarning className="mr-2 h-4 w-4" />
                    Voltar para entrar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
