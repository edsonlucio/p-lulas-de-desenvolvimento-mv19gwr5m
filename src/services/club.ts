import pb from '@/lib/pocketbase/client'
import type {
  ClubCardStatus,
  ClubDailyCardRecord,
  ClubMemberRecord,
  ClubMemberStatus,
  CourseWaitlistRecord,
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

export async function getClubMemberByUser(userId: string): Promise<ClubMemberRecord | null> {
  if (!userId) return null
  try {
    const list = await pb.collection<ClubMemberRecord>('club_members').getList(1, 1, {
      filter: `user = "${userId}" && status = "ativo"`,
      requestKey: null,
    })
    return list.items[0] ?? null
  } catch (err) {
    console.error('Erro ao buscar membro do clube por usuário:', err)
    return null
  }
}

export async function joinClub(data: {
  userId?: string
  name: string
  email: string
  whatsapp: string
}) {
  return pb.collection<ClubMemberRecord>('club_members').create({
    user: data.userId || '',
    name: data.name,
    email: data.email,
    whatsapp: data.whatsapp,
    joined_at: new Date().toISOString(),
    status: 'ativo',
    notes: 'Inscrição via página do Clube das Pílulas',
  })
}

// ==========================================
// LISTA DE ESPERA DE CURSOS PAGOS
// ==========================================

export async function addCourseWaitlist(data: {
  name: string
  email: string
  whatsapp: string
  courseId: string
  userId?: string
  source?: string
  notes?: string
}) {
  return pb.collection('course_waitlist').create({
    name: data.name,
    email: data.email,
    whatsapp: data.whatsapp,
    course: data.courseId,
    user: data.userId || null,
    source: data.source || 'clube_das_pilulas',
    notes: data.notes || '',
    status: 'pendente',
  })
}

export async function listCourseWaitlist(): Promise<CourseWaitlistRecord[]> {
  return pb.collection<CourseWaitlistRecord>('course_waitlist').getFullList({
    expand: 'course,user',
    sort: '-created',
    requestKey: null,
  })
}

export async function updateWaitlistStatus(
  id: string,
  status: 'pendente' | 'contatado' | 'convertido' | 'matriculado',
  notes?: string,
) {
  return pb.collection('course_waitlist').update(id, {
    status,
    ...(notes !== undefined ? { notes } : {}),
  })
}

export const listCourseWaitlists = listCourseWaitlist
export const updateCourseWaitlistStatus = updateWaitlistStatus
export const joinCourseWaitlist = addCourseWaitlist

export async function getClubStats(): Promise<{
  totalMembers: number
  totalWaitlist: number
}> {
  try {
    const [members, waitlist] = await Promise.all([
      pb.collection('club_members').getList(1, 1, { requestKey: null }),
      pb.collection('course_waitlist').getList(1, 1, { requestKey: null }),
    ])
    return {
      totalMembers: members.totalItems,
      totalWaitlist: waitlist.totalItems,
    }
  } catch {
    return { totalMembers: 0, totalWaitlist: 0 }
  }
}
