import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function RouteGuard({
  children,
  admin = false,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && (!user || (admin && user.role !== 'admin'))) {
      toast({
        title: 'Faça login para acessar',
        description: admin
          ? 'Esta área é exclusiva da administração.'
          : 'Entre na sua conta para continuar.',
      })
    }
  }, [admin, loading, toast, user])

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-sand">
        <LoaderCircle className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    )
  if (!user || (admin && user.role !== 'admin')) {
    return (
      <Navigate
        to={`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }
  return children
}
