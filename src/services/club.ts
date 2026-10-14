import pb from '@/lib/pocketbase/client'
import type {
  ClubCardStatus,
  ClubDailyCardRecord,
  ClubMemberRecord,
  ClubMemberStatus,
  UserRecord,
} from '@/lib/types'

export async function listClubMembers() {
  return pb.collection<ClubMemberRecord>('club_members').getFullList({
    sort: '-joined_at',
    expand: 'user',
  })
}

export async function addClubMember(data: {
  user: string
  joined_at?: string
  status?: ClubMemberStatus
  notes?: string
}) {
  return pb.collection<ClubMemberRecord>('club_members').create({
    user: data.user,
    joined_at: data.joined_at || new Date().toISOString(),
    status: data.status || 'ativo',
    notes: data.notes || '',
  })
}

export async function updateClubMember(
  id: string,
  data: {
    status?: ClubMemberStatus
    notes?: string
  },
) {
  return pb.collection<ClubMemberRecord>('club_members').update(id, data)
}

export async function removeClubMember(id: string) {
  return pb.collection('club_members').delete(id)
}

export async function listClubDailyCards() {
  return pb.collection<ClubDailyCardRecord>('club_daily_cards').getFullList({
    sort: 'date',
  })
}

export async function createClubDailyCard(data: {
  date: string
  title?: string
  pages_from?: number
  pages_to?: number
  pergunta: string
  resumo: string
  provocacao: string
  status: ClubCardStatus
}) {
  return pb.collection<ClubDailyCardRecord>('club_daily_cards').create(data)
}

export async function updateClubDailyCard(
  id: string,
  data: Partial<{
    date: string
    title: string
    pages_from: number
    pages_to: number
    pergunta: string
    resumo: string
    provocacao: string
    status: ClubCardStatus
  }>,
) {
  return pb.collection<ClubDailyCardRecord>('club_daily_cards').update(id, data)
}

export async function deleteClubDailyCard(id: string) {
  return pb.collection('club_daily_cards').delete(id)
}

/**
 * Retorna todos os usuários (estudantes e admins) para permitir ao admin selecionar
 * quem adicionar como membro do Clube das Pílulas.
 */
export async function listUsersForClub() {
  return pb.collection<UserRecord>('users').getFullList({
    sort: 'name',
  })
}
