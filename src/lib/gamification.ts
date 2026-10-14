export const LEVELS = [
  { name: 'Iniciante', min: 0, color: '#98A2B3' },
  { name: 'Explorador', min: 150, color: '#2E90FA' },
  { name: 'Praticante', min: 400, color: '#12B76A' },
  { name: 'Especialista', min: 800, color: '#9E77ED' },
  { name: 'Mestre Pílula', min: 1500, color: '#FDB022' },
] as const

export function getLevel(points = 0) {
  let current: (typeof LEVELS)[number] = LEVELS[0]
  for (const level of LEVELS) {
    if (points >= level.min) current = level
  }
  const index = LEVELS.findIndex((level) => level.name === current.name)
  const next = LEVELS[index + 1]
  const range = next ? next.min - current.min : 1
  const progress = next ? Math.min(100, ((points - current.min) / range) * 100) : 100
  return { ...current, next, progress, remaining: next ? next.min - points : 0 }
}

export function formatPoints(points: number) {
  return new Intl.NumberFormat('pt-BR').format(points)
}
