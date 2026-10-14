import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

import { LEVELS, getLevel } from '@/lib/gamification'

interface Celebration {
  level: number
  name: string
  color: string
  key: number
}

/**
 * Celebração de subida de nível — distinta do toast comum: um overlay temporário
 * em destaque quando a concessão de pontos cruza um marco de nível
 * (100 / 250 / 500 / 1000 pontos). O nível vem dos pontos do usuário, que o
 * backend atualiza via realtime sempre que uma ação é pontuada.
 */
export function LevelUpCelebration({ points }: { points: number }) {
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  useEffect(() => {
    const level = getLevel(points)
    const levelIndex = LEVELS.findIndex((item) => item.name === level.name) + 1
    const previous = Number(localStorage.getItem('pd_prev_level') || '0')
    if (levelIndex === previous) return
    localStorage.setItem('pd_prev_level', String(levelIndex))
    // Na primeira carga da sessão (previous = 0) o nível já é o atual: sem festa.
    if (previous > 0 && levelIndex > previous) {
      setCelebration({
        level: levelIndex,
        name: level.name,
        color: level.color,
        key: Date.now(),
      })
    }
  }, [points])

  useEffect(() => {
    if (!celebration) return
    const timer = setTimeout(() => setCelebration(null), 6000)
    return () => clearTimeout(timer)
  }, [celebration])

  if (!celebration) return null
  return (
    <div
      key={celebration.key}
      className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-4"
    >
      <div
        className="animate-check-pop pointer-events-auto flex items-center gap-4 rounded-2xl border-2 bg-white p-4 pr-6 shadow-2xl"
        style={{ borderColor: celebration.color }}
      >
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl"
          style={{ backgroundColor: `${celebration.color}1A` }}
        >
          🎉
        </span>
        <div>
          <p className="text-sm font-extrabold text-brand-navy">
            Você subiu para o nível {celebration.level} — {celebration.name}!
          </p>
          <p className="mt-0.5 text-xs text-brand-muted">
            Sua constância está virando transformação. Continue assim!
          </p>
        </div>
        <Trophy className="h-5 w-5 shrink-0" style={{ color: celebration.color }} />
      </div>
    </div>
  )
}

export default LevelUpCelebration
