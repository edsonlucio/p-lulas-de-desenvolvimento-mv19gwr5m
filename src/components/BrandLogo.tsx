import { Link } from 'react-router-dom'

import officialLogo from '@/assets/logotipo-principal-variacao-escura-a357e.png'
import { cn } from '@/lib/utils'

export function BrandLogo({
  inverse = false,
  compact = false,
  className,
}: {
  inverse?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <Link
      to="/"
      className={cn(
        'group inline-flex items-center transition-opacity hover:opacity-90',
        className,
      )}
      aria-label="Pílulas de Desenvolvimento — início"
    >
      <img
        src={officialLogo}
        alt="Pílulas de Desenvolvimento"
        className={cn(
          'w-auto object-contain transition duration-200',
          compact ? 'h-8 sm:h-9' : 'h-10 sm:h-11',
          inverse && 'brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
        )}
      />
    </Link>
  )
}
