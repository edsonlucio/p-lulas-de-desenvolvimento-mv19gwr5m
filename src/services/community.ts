import pb from '@/lib/pocketbase/client'
import type {
  CommunityReplyRecord,
  CommunityTopicRecord,
  ModerationStatus,
  TutorQueryRecord,
} from '@/lib/types'

// ==========================================
// TÓPICOS DA COMUNIDADE
// ==========================================

export interface ListTopicsOptions {
  courseId?: string | null // null/undefined = Geral (course = "")
  userId?: string // para ver os próprios tópicos (inclusive pending/rejected)
  status?: ModerationStatus
}

/**
 * Lista tópicos da comunidade.
 * Se courseId for fornecido, busca tópicos do curso especificado.
 * Se courseId for null ou omitido, busca tópicos gerais (course = "").
 */
export async function listCommunityTopics(options: ListTopicsOptions = {}) {
  const filters: string[] = []

  if (options.courseId) {
    filters.push(`course = "${options.courseId}"`)
  } else {
    // Tópicos gerais têm course vazio
    filters.push('course = "" || course = null')
  }

  if (options.status) {
    filters.push(`status = "${options.status}"`)
  }

  const filterString = filters.join(' && ')

  return pb.collection<CommunityTopicRecord>('community_topics').getFullList({
    filter: filterString || undefined,
    sort: '-pinned,-created',
    expand: 'user,course',
  })
}

/**
 * Busca um único tópico com autor e curso expandidos.
 */
export async function getCommunityTopic(id: string) {
  return pb.collection<CommunityTopicRecord>('community_topics').getOne(id, {
    expand: 'user,course',
  })
}

/**
 * Criação de novo tópico pelo aluno (status SEMPRE 'pending' por regra de moderação prévia).
 */
export async function createCommunityTopic(data: {
  user: string
  course?: string | null
  title: string
  content: string
}) {
  return pb.collection<CommunityTopicRecord>('community_topics').create({
    user: data.user,
    course: data.course || undefined,
    title: data.title.trim(),
    content: data.content.trim(),
    status: 'pending', // Sempre pendente de moderação
    pinned: false,
    replies_count: 0,
  })
}

// ==========================================
// RESPOSTAS / COMENTÁRIOS DA COMUNIDADE
// ==========================================

/**
 * Lista respostas de um tópico específico.
 */
export async function listCommunityReplies(topicId: string) {
  return pb.collection<CommunityReplyRecord>('community_replies').getFullList({
    filter: `topic = "${topicId}"`,
    sort: 'created',
    expand: 'user',
  })
}

/**
 * Cria uma resposta em um tópico (status SEMPRE 'pending' por regra de moderação prévia).
 */
export async function createCommunityReply(data: { topic: string; user: string; content: string }) {
  return pb.collection<CommunityReplyRecord>('community_replies').create({
    topic: data.topic,
    user: data.user,
    content: data.content.trim(),
    status: 'pending', // Sempre pendente de moderação
  })
}

// ==========================================
// PAINEL DE MODERAÇÃO ADMIN
// ==========================================

/**
 * Lista itens pendentes de moderação (tópicos e respostas).
 */
export async function listPendingModerationItems() {
  const [topics, replies] = await Promise.all([
    pb.collection<CommunityTopicRecord>('community_topics').getFullList({
      filter: 'status = "pending"',
      sort: '-created',
      expand: 'user,course',
    }),
    pb.collection<CommunityReplyRecord>('community_replies').getFullList({
      filter: 'status = "pending"',
      sort: '-created',
      expand: 'user,topic',
    }),
  ])

  return { topics, replies }
}

/**
 * Modera um tópico (aprovar ou rejeitar com motivo opcional).
 */
export async function moderateTopic(id: string, status: 'approved' | 'rejected', notes?: string) {
  return pb.collection<CommunityTopicRecord>('community_topics').update(id, {
    status,
    moderation_notes: notes || '',
    moderated_at: new Date().toISOString(),
  })
}

/**
 * Modera uma resposta (aprovar ou rejeitar com motivo opcional).
 */
export async function moderateReply(id: string, status: 'approved' | 'rejected', notes?: string) {
  return pb.collection<CommunityReplyRecord>('community_replies').update(id, {
    status,
    moderation_notes: notes || '',
    moderated_at: new Date().toISOString(),
  })
}

/**
 * Alterna destaque/fixação de um tópico (admin).
 */
export async function togglePinTopic(id: string, pinned: boolean) {
  return pb.collection<CommunityTopicRecord>('community_topics').update(id, {
    pinned,
  })
}

/**
 * Exclui tópico (admin ou autor).
 */
export async function deleteCommunityTopic(id: string) {
  return pb.collection('community_topics').delete(id)
}

/**
 * Exclui resposta (admin ou autor).
 */
export async function deleteCommunityReply(id: string) {
  return pb.collection('community_replies').delete(id)
}

// ==========================================
// ANALYTICS & KPIS (COMUNIDADE E TUTOR)
// ==========================================

/**
 * Obtém estatísticas e assuntos mais comentados da comunidade para o painel admin.
 */
export async function getCommunityStats() {
  const [allTopics, allReplies, pendingTopics, pendingReplies] = await Promise.all([
    pb.collection<CommunityTopicRecord>('community_topics').getFullList({
      sort: '-replies_count,-created',
      expand: 'user,course',
    }),
    pb.collection<CommunityReplyRecord>('community_replies').getFullList({
      filter: 'status = "approved"',
    }),
    pb.collection<CommunityTopicRecord>('community_topics').getFullList({
      filter: 'status = "pending"',
    }),
    pb.collection<CommunityReplyRecord>('community_replies').getFullList({
      filter: 'status = "pending"',
    }),
  ])

  const approvedTopics = allTopics.filter((t) => t.status === 'approved')
  const mostCommented = [...approvedTopics]
    .sort((a, b) => (b.replies_count || 0) - (a.replies_count || 0))
    .slice(0, 5)

  return {
    totalTopics: allTopics.length,
    approvedTopicsCount: approvedTopics.length,
    pendingTopicsCount: pendingTopics.length,
    pendingRepliesCount: pendingReplies.length,
    totalRepliesCount: allReplies.length,
    mostCommented,
  }
}

/**
 * Lista as perguntas feitas ao Tutor Pílulas e calcula os temas mais frequentes.
 */
export async function listTutorQueries() {
  return pb.collection<TutorQueryRecord>('tutor_queries').getFullList({
    sort: '-created',
    expand: 'user',
  })
}
