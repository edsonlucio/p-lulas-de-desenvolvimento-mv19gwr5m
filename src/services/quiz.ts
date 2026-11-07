import pb from '@/lib/pocketbase/client'
import type {
  LessonRecord,
  ModuleRecord,
  QuizAlternativeKey,
  QuizAttemptRecord,
  QuizQuestionRecord,
} from '@/lib/types'

/** Chave usada no quiz: "a" | "b" | "c" | "d" */
export const QUIZ_KEYS: QuizAlternativeKey[] = ['a', 'b', 'c', 'd']
export const QUIZ_LABELS: Record<QuizAlternativeKey, string> = { a: 'A', b: 'B', c: 'C', d: 'D' }

function alternativeText(question: QuizQuestionRecord, key: QuizAlternativeKey): string {
  return question[`alternativa_${key}` as 'alternativa_a'] || ''
}

/**
 * Texto do feedback imediato mostrado ao aluno ao responder cada pergunta.
 */
export function quizFeedback(
  question: QuizQuestionRecord,
  selected: QuizAlternativeKey,
): { correct: boolean; message: string } {
  const correct = selected === question.correta
  const message = correct
    ? 'Correto! Você entendeu o ponto principal.'
    : 'Não é essa. Revise o tópico da aula e tente novamente.'
  return { correct, message }
}

/**
 * Lista as perguntas da avaliação de um módulo.
 */
export async function listQuizQuestions(moduleId: string): Promise<QuizQuestionRecord[]> {
  try {
    return await pb.collection<QuizQuestionRecord>('quiz_questions').getFullList({
      filter: `module = "${moduleId}"`,
      sort: 'position,created',
    })
  } catch (error) {
    console.error('Erro ao listar perguntas da avaliação:', error)
    return []
  }
}

/**
 * Tentativa já registrada do aluno para o módulo (se houver).
 */
export async function getQuizAttempt(
  userId: string,
  moduleId: string,
): Promise<QuizAttemptRecord | null> {
  try {
    return await pb
      .collection<QuizAttemptRecord>('quiz_attempts')
      .getFirstListItem(`user = "${userId}" && module = "${moduleId}"`)
  } catch {
    return null
  }
}

/**
 * Registra (ou atualiza) a tentativa do aluno na avaliação do módulo.
 * É o ato formal que marca a avaliação como feita.
 */
export async function submitQuizAttempt(input: {
  userId: string
  moduleId: string
  courseId: string
  respostas: Record<string, QuizAlternativeKey>
  acertos: number
  total: number
}): Promise<QuizAttemptRecord> {
  const data = {
    user: input.userId,
    module: input.moduleId,
    course: input.courseId,
    respostas: input.respostas,
    acertos: input.acertos,
    total: input.total,
  }
  const existing = await getQuizAttempt(input.userId, input.moduleId)
  if (existing) return pb.collection<QuizAttemptRecord>('quiz_attempts').update(existing.id, data)
  return pb.collection<QuizAttemptRecord>('quiz_attempts').create(data)
}

/** Deleta todas as perguntas de um módulo (usado ao excluir módulo via cascata do backend). */
export async function deleteQuizQuestionsOfModule(moduleId: string): Promise<void> {
  const questions = await listQuizQuestions(moduleId)
  await Promise.all(
    questions.map((question) => pb.collection('quiz_questions').delete(question.id)),
  )
}

// ---------------------------------------------------------------------------
// Admin — CRUD completo de perguntas e alternativas da avaliação
// ---------------------------------------------------------------------------

export async function createQuizQuestion(data: {
  module: string
  pergunta: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  correta: QuizAlternativeKey
  position: number
}): Promise<QuizQuestionRecord> {
  return pb.collection<QuizQuestionRecord>('quiz_questions').create(data)
}

export async function updateQuizQuestion(
  id: string,
  data: Partial<Omit<QuizQuestionRecord, 'id' | 'module' | 'position'>>,
): Promise<QuizQuestionRecord> {
  return pb.collection<QuizQuestionRecord>('quiz_questions').update(id, data)
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await pb.collection('quiz_questions').delete(id)
}

export async function toggleModuleQuiz(moduleId: string, ativo: boolean): Promise<void> {
  await pb.collection<ModuleRecord>('modules').update(moduleId, { quiz_ativo: ativo })
}

// ---------------------------------------------------------------------------
// Apostila do módulo (PDF) — URL de download com token de arquivo protegido
// ---------------------------------------------------------------------------

export async function getModuleWorkbookUrl(
  moduleRecord: ModuleRecord,
  download = true,
): Promise<string> {
  if (!moduleRecord.apostila) return ''
  try {
    const fileToken = await pb.files.getToken()
    return pb.files.getURL(moduleRecord, moduleRecord.apostila, {
      token: fileToken,
      download,
    })
  } catch (error) {
    console.warn('Falha ao obter token de arquivo, tentando URL direta:', error)
    return pb.files.getURL(moduleRecord, moduleRecord.apostila, { download })
  }
}

export async function updateModuleWorkbook(
  moduleId: string,
  data: FormData | { apostila?: File | null },
): Promise<ModuleRecord> {
  return pb.collection<ModuleRecord>('modules').update(moduleId, data)
}

export function lessonHasContent(lesson: LessonRecord): boolean {
  return Boolean(
    lesson.ideia_central?.trim() ||
    lesson.topico_1?.trim() ||
    lesson.topico_2?.trim() ||
    lesson.topico_3?.trim() ||
    lesson.exercicio?.trim(),
  )
}
