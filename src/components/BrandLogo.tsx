import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

export function BrandLogo({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3"
      aria-label="Pílulas de Desenvolvimento — início"
    >
      <span className="relative flex h-10 w-14 rotate-[-8deg] items-center justify-center overflow-hidden rounded-full bg-brand-orange shadow-[0_8px_24px_rgba(255,107,44,.32)] transition-transform group-hover:rotate-0">
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
        <Sparkles className="h-4 w-4 text-white" />
      </span>
      {!compact && (
        <span className={cn('leading-tight', inverse ? 'text-white' : 'text-brand-navy')}>
          <strong className="block text-[15px] font-extrabold tracking-[-.02em]">Pílulas de</strong>
          <span className="block text-[12px] font-semibold tracking-[.06em] opacity-75">
            DESENVOLVIMENTO
          </span>
        </span>
      )}
    </Link>
  )
}
