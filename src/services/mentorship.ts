import pb from '@/lib/pocketbase/client'
import type {
  MentorshipProgramRecord,
  MentorshipMeetingRecord,
  MentorshipEnrollmentRecord,
} from '@/lib/types'

export async function getActiveMentorshipProgram(): Promise<MentorshipProgramRecord | null> {
  try {
    const list = await pb.collection('mentorship_programs').getFullList<MentorshipProgramRecord>({
      filter: 'active = true',
      sort: '-created',
      requestKey: null,
    })
    return list[0] ?? null
  } catch (err) {
    console.error('Erro ao buscar programa de mentoria:', err)
    return null
  }
}

export async function getMentorshipProgramById(
  id: string,
): Promise<MentorshipProgramRecord | null> {
  try {
    return await pb.collection('mentorship_programs').getOne<MentorshipProgramRecord>(id, {
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar mentoria por ID:', err)
    return null
  }
}

export const getMentorshipProduct = getActiveMentorshipProgram
export const getPublicMentorshipProduct = getActiveMentorshipProgram
export const getMentorshipProductById = getMentorshipProgramById
export const updateMentorshipProduct = updateMentorshipProgram
export const listMentorshipSessions = listMentorshipMeetings
export const createMentorshipSession = createMentorshipMeeting
export const updateMentorshipSession = updateMentorshipMeeting
export const deleteMentorshipSession = deleteMentorshipMeeting

export async function listAllMentorshipPrograms(): Promise<MentorshipProgramRecord[]> {
  try {
    return await pb.collection('mentorship_programs').getFullList<MentorshipProgramRecord>({
      sort: '-created',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao listar todos os programas de mentoria:', err)
    return []
  }
}

export async function updateMentorshipProgram(
  id: string,
  data: Partial<MentorshipProgramRecord>,
): Promise<MentorshipProgramRecord> {
  return await pb.collection('mentorship_programs').update<MentorshipProgramRecord>(id, data)
}

export async function listMentorshipMeetings(): Promise<MentorshipMeetingRecord[]> {
  try {
    return await pb.collection('mentorship_meetings').getFullList<MentorshipMeetingRecord>({
      sort: '-date',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao listar encontros de mentoria:', err)
    return []
  }
}

export async function createMentorshipMeeting(
  data: Partial<MentorshipMeetingRecord>,
): Promise<MentorshipMeetingRecord> {
  return await pb.collection('mentorship_meetings').create<MentorshipMeetingRecord>(data)
}

export async function updateMentorshipMeeting(
  id: string,
  data: Partial<MentorshipMeetingRecord>,
): Promise<MentorshipMeetingRecord> {
  return await pb.collection('mentorship_meetings').update<MentorshipMeetingRecord>(id, data)
}

export async function deleteMentorshipMeeting(id: string): Promise<boolean> {
  try {
    await pb.collection('mentorship_meetings').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir encontro de mentoria:', err)
    return false
  }
}

export async function checkUserMentorshipAccess(userId: string): Promise<{
  hasAccess: boolean
  enrollment: MentorshipEnrollmentRecord | null
}> {
  if (!userId) return { hasAccess: false, enrollment: null }
  try {
    const list = await pb
      .collection('mentorship_enrollments')
      .getList<MentorshipEnrollmentRecord>(1, 1, {
        filter: `user = "${userId}" && status = "ativa"`,
        requestKey: null,
      })
    if (list.items.length > 0) {
      return { hasAccess: true, enrollment: list.items[0] }
    }
    return { hasAccess: false, enrollment: null }
  } catch (err) {
    console.error('Erro ao checar acesso de mentoria:', err)
    return { hasAccess: false, enrollment: null }
  }
}

export async function listMentorshipEnrollments(): Promise<MentorshipEnrollmentRecord[]> {
  try {
    return await pb.collection('mentorship_enrollments').getFullList<MentorshipEnrollmentRecord>({
      expand: 'user,program',
      sort: '-created',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao listar matrículas de mentoria:', err)
    return []
  }
}
