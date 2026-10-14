import pb from '@/lib/pocketbase/client'
import type { PontuacaoRecord, RewardCode, RewardRecord } from '@/lib/types'

export const REWARDS_CATALOG: Array<{ code: RewardCode; title: string; description: string }> = [
  {
    code: 'primeira_aula',
    title: 'Primeira aula',
    description: 'Conclua sua primeira aula na plataforma.',
  },
  {
    code: 'dedicado_7',
    title: 'Dedicado',
    description: 'Estude por 7 dias seguidos.',
  },
  {
    code: 'maratonista_30',
    title: 'Maratonista',
    description: 'Mantenha 30 dias seguidos de estudo.',
  },
]

/** Streak efetivo: um dia (ou mais) sem atividade reseta a sequência. */
export function effectiveStreak(pontuacao: PontuacaoRecord | null): number {
  if (!pontuacao) return 0
  const stored = pontuacao.streak_days || 0
  const last = pontuacao.last_activity_date
  if (!last) return 0
  const today = new Date(new Date().getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10)
  const diff = Math.round(
    (new Date(today + 'T00:00:00Z').getTime() - new Date(last + 'T00:00:00Z').getTime()) / 86400000,
  )
  if (diff <= 1) return Math.max(1, stored)
  return 0
}

export interface GamificationSnapshot {
  pontuacao: PontuacaoRecord | null
  rewards: RewardRecord[]
  rewardsView: Array<{
    code: RewardCode
    title: string
    description: string
    unlocked: boolean
    awarded_at: string
  }>
}

export async function getGamificationSnapshot(userId: string): Promise<GamificationSnapshot> {
  const [pontuacaoList, rewards] = await Promise.all([
    pb.collection<PontuacaoRecord>('pontuacao').getList(1, 1, {
      filter: `user = "${userId}"`,
    }),
    pb.collection<RewardRecord>('rewards').getFullList({
      filter: `user = "${userId}"`,
      sort: '-awarded_at',
    }),
  ])
  const pontuacao = pontuacaoList.items[0] ?? null
  const unlocked = new Map(rewards.map((item) => [item.code, item]))
  const rewardsView = REWARDS_CATALOG.map((item) => ({
    ...item,
    unlocked: unlocked.has(item.code),
    awarded_at: unlocked.get(item.code)?.awarded_at || '',
  }))
  return { pontuacao, rewards, rewardsView }
}
