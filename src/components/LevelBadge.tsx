import { Award } from 'lucide-react'

import { getLevel } from '@/lib/gamification'

export function LevelBadge({ points, small = false }: { points: number; small?: boolean }) {
  const level = getLevel(points)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-white/95 font-bold shadow-sm ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
      style={{ borderColor: `${level.color}55`, color: level.color }}
    >
      <Award className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> {level.name}
    </span>
  )
}
