import pb from '@/lib/pocketbase/client'
import { streamAgentChat, type AgentCitation, type StreamAgentChatHandlers } from '@/lib/skipAi'

export interface TutorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AgentCitation[]
  createdAt: string
  detectedLessons?: DetectedLessonLink[]
}

export interface DetectedLessonLink {
  lessonTitle: string
  lessonId?: string
  courseSlug?: string
  moduleTitle?: string
}

export interface SendTutorMessageParams {
  message: string
  conversationId: string | null
  signal?: AbortSignal
  onChunk?: (chunk: string, accumulated: string) => void
  onCitations?: (citations: AgentCitation[]) => void
}

/**
 * Envia uma mensagem para o agente nativo Tutor Pílulas via streaming SSE.
 */
export async function sendTutorMessage(params: SendTutorMessageParams) {
  const { message, conversationId, signal, onChunk, onCitations } = params

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Se o usuário estiver autenticado, anexa o token de autenticação
  if (pb.authStore.isValid && pb.authStore.token) {
    headers.Authorization = pb.authStore.token
  }

  const endpoint = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/tutor-chat`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      stream: true,
    }),
    signal,
  })

  const handlers: StreamAgentChatHandlers = {
    signal,
    onChunk: (delta, accumulated) => {
      onChunk?.(delta, accumulated)
    },
    onCitations: (items) => {
      onCitations?.(items)
    },
  }

  const result = await streamAgentChat(response, handlers)

  const resolvedConversationId = response.headers.get('X-Conversation-Id') ?? result.conversation_id

  return {
    conversationId: resolvedConversationId,
    messageId: result.message_id,
    content: result.content,
    citations: result.citations,
  }
}

/**
 * Sugestões rápidas de perguntas para o visitante (prospect)
 */
export const VISITOR_QUICK_PROMPTS = [
  'Quais cursos vocês oferecem?',
  'Como funciona o Clube das Pílulas?',
  'Quem é Edson Lúcio?',
  'Como funcionam as mentorias empresariais?',
]

/**
 * Sugestões rápidas de perguntas para o aluno
 */
export const STUDENT_QUICK_PROMPTS = [
  'Como criar um funil de vendas simples?',
  'Como calcular o CAC e o ROI?',
  'Qual a diferença entre Instagram e YouTube para vendas?',
  'Como gerar autoridade sem ser chato?',
]
