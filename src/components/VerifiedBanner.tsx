import { useState } from 'react'
import { MailCheck, X } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'

export function VerifiedBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  if (!user || user.verified || dismissed) return null
  return (
    <div className="relative z-30 flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
      <MailCheck className="h-4 w-4 shrink-0" /> Confirme seu e-mail para não perder seus pontos.
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
        className="rounded-full p-1 hover:bg-amber-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
