import pb from '@/lib/pocketbase/client'
import type {
  LessonProgressRecord,
  LessonRecord,
  ModuleRecord,
  QuizAlternativeKey,
  QuizAttemptRecord,
  QuizQuestionRecord,
} from '@/lib/types'

/** Chave usada no quiz: "a" | "b" | "c" | "d" */
export const QUIZ_KEYS: QuizAlternativeKey[] = ['a', 'b', 'c', 'd']
export const QUIZ_LABELS: Record<QuizAlternativeKey, string> = { a: 'A', b: 'B', c: 'C', d: 'D' }

export function alternativeText(question: QuizQuestionRecord, key: QuizAlternativeKey): string {
  return question[`alternativa_${key}` as 'alternativa_a'] || ''
}

/**
 * Feedback imediato mostrado ao aluno ao responder cada pergunta.
 * Exibe o feedback explicativo cadastrado pelo instrutor e o status de acerto/erro.
 */
export function quizFeedback(
  question: QuizQuestionRecord,
  selected: QuizAlternativeKey,
): { correct: boolean; message: string; feedbackText: string } {
  const correct = selected === question.correta
  const feedbackText =
    question.feedback?.trim() ||
    (correct
      ? 'Excelente raciocínio! Você fixou o conceito chave desta parte do módulo.'
      : 'Não é bem essa. Vale a pena revisar este ponto nas aulas do módulo para fixar melhor.')
  const message = correct ? 'Resposta correta!' : 'Resposta incorreta.'
  return { correct, message, feedbackText }
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
 * Regra do Maestro: aluno pode refazer a avaliação; guardar a MELHOR nota.
 * Se uma tentativa anterior tiver nota superior, preservamos a melhor nota (acertos)
 * ou salvamos a nova nota se esta for igual ou melhor.
 */
export async function submitQuizAttempt(input: {
  userId: string
  moduleId: string
  courseId: string
  respostas: Record<string, QuizAlternativeKey>
  acertos: number
  total: number
}): Promise<{
  attempt: QuizAttemptRecord
  isNewBest: boolean
  previousBestAcertos: number | null
}> {
  const existing = await getQuizAttempt(input.userId, input.moduleId)
  const currentPct = input.total > 0 ? (input.acertos / input.total) * 100 : 0

  if (existing) {
    const prevPct = existing.total > 0 ? (existing.acertos / existing.total) * 100 : 0
    const isNewBest = currentPct >= prevPct

    // Se a tentativa atual for melhor ou igual, salva respostas e acertos novos.
    // Se a anterior foi melhor, preserva a melhor nota (acertos e total) mantendo as respostas da melhor tentativa
    // ou atualiza mantendo a melhor nota numérica. Para clareza, guardamos a melhor nota.
    const dataToSave = isNewBest
      ? {
          user: input.userId,
          module: input.moduleId,
          course: input.courseId,
          respostas: input.respostas,
          acertos: input.acertos,
          total: input.total,
        }
      : {
          user: input.userId,
          module: input.moduleId,
          course: input.courseId,
          // Mantém as respostas e acertos da melhor tentativa anterior
          respostas: existing.respostas || input.respostas,
          acertos: existing.acertos,
          total: existing.total,
        }

    const updated = await pb
      .collection<QuizAttemptRecord>('quiz_attempts')
      .update(existing.id, dataToSave)
    return {
      attempt: updated,
      isNewBest,
      previousBestAcertos: existing.acertos,
    }
  }

  const created = await pb.collection<QuizAttemptRecord>('quiz_attempts').create({
    user: input.userId,
    module: input.moduleId,
    course: input.courseId,
    respostas: input.respostas,
    acertos: input.acertos,
    total: input.total,
  })
  return {
    attempt: created,
    isNewBest: true,
    previousBestAcertos: null,
  }
}

/**
 * Lista todas as tentativas de quiz do aluno em um determinado curso.
 */
export async function listUserQuizAttemptsForCourse(
  userId: string,
  courseId: string,
): Promise<QuizAttemptRecord[]> {
  try {
    return await pb.collection<QuizAttemptRecord>('quiz_attempts').getFullList({
      filter: `user = "${userId}" && course = "${courseId}"`,
    })
  } catch (error) {
    console.error('Erro ao listar tentativas de quiz do curso:', error)
    return []
  }
}

export interface CourseCertificateEligibility {
  isEligible: boolean
  totalLessons: number
  completedLessons: number
  lessonsCompleted: boolean
  totalModulesWithQuiz: number
  quizzesCompleted: number
  quizzesCompletedAll: boolean
  averageScorePct: number
  minRequiredScorePct: number // 70
  missingLessonsCount: number
  missingQuizzesCount: number
  totalDurationMin: number
  totalDurationHours: number
}

/**
 * Calcula a elegibilidade do aluno ao certificado do curso:
 * 1) Todas as aulas do curso concluídas
 * 2) Todas as avaliações de módulos ativos concluídas
 * 3) Média final das melhores notas ≥ 70%
 */
export async function getCourseCertificateEligibility(
  userId: string,
  courseId: string,
): Promise<
  CourseCertificateEligibility & {
    modulesStatus: Array<{
      moduleId: string
      title: string
      hasQuiz: boolean
      allLessonsDone: boolean
      completedLessons: number
      totalLessons: number
      bestScore: number | null
    }>
    issueDateFormatted: string
  }
> {
  // 1. Busca módulos e aulas do curso
  const modules = await pb.collection<ModuleRecord>('modules').getFullList({
    filter: `course='${courseId}'`,
    sort: 'position',
  })

  const moduleIds = modules.map((m) => m.id)
  let lessons: LessonRecord[] = []
  if (moduleIds.length > 0) {
    const filter = moduleIds.map((id) => `module='${id}'`).join('||')
    lessons = await pb.collection<LessonRecord>('lessons').getFullList({
      filter,
      sort: 'position',
    })
  }

  // 2. Progresso das aulas do aluno
  const progressList = await pb.collection<LessonProgressRecord>('lesson_progress').getFullList({
    filter: `user='${userId}'`,
  })
  const completedLessonIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lesson))

  // 3. Melhores tentativas do aluno nas avaliações
  const attempts = await pb.collection<QuizAttemptRecord>('quiz_attempts').getFullList({
    filter: `user='${userId}'`,
  })
  const moduleAttempts = new Map<string, QuizAttemptRecord>()
  for (const att of attempts) {
    if (att.module) {
      moduleAttempts.set(att.module, att)
    }
  }

  // Monta estrutura por módulo
  const modulesWithLessons = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.module === mod.id)
    return {
      id: mod.id,
      title: mod.title,
      quiz_ativo: Boolean(mod.quiz_ativo),
      lessons: modLessons,
    }
  })

  const baseElig = computeCourseCertificateEligibility({
    modules: modulesWithLessons,
    completedLessonIds,
    moduleAttempts,
  })

  const modulesStatus = modulesWithLessons.map((mod) => {
    const total = mod.lessons.length
    const completed = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length
    const attempt = moduleAttempts.get(mod.id)
    const bestScore =
      attempt && attempt.total > 0 ? Math.round((attempt.acertos / attempt.total) * 100) : null

    return {
      moduleId: mod.id,
      title: mod.title,
      hasQuiz: mod.quiz_ativo,
      allLessonsDone: total > 0 && completed >= total,
      completedLessons: completed,
      totalLessons: total,
      bestScore,
    }
  })

  return {
    ...baseElig,
    modulesStatus,
    issueDateFormatted: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  }
}

export function computeCourseCertificateEligibility(params: {
  modules: Array<{
    id: string
    quiz_ativo?: boolean
    lessons: Array<{ id: string; duration_min?: number }>
  }>
  completedLessonIds: Set<string>
  moduleAttempts: Map<string, QuizAttemptRecord>
}): CourseCertificateEligibility {
  const { modules, completedLessonIds, moduleAttempts } = params

  let totalLessons = 0
  let completedLessons = 0
  let totalDurationMin = 0
  let totalModulesWithQuiz = 0
  let quizzesCompleted = 0
  let sumScoresPct = 0

  for (const mod of modules) {
    for (const les of mod.lessons) {
      totalLessons++
      totalDurationMin += les.duration_min || 0
      if (completedLessonIds.has(les.id)) {
        completedLessons++
      }
    }

    // Considera módulos que têm quiz_ativo (ou com perguntas cadastradas)
    if (mod.quiz_ativo) {
      totalModulesWithQuiz++
      const attempt = moduleAttempts.get(mod.id)
      if (attempt && attempt.total > 0) {
        quizzesCompleted++
        const scorePct = (attempt.acertos / attempt.total) * 100
        sumScoresPct += scorePct
      }
    }
  }

  const lessonsCompleted = totalLessons > 0 && completedLessons >= totalLessons
  const quizzesCompletedAll =
    totalModulesWithQuiz === 0 ? true : quizzesCompleted >= totalModulesWithQuiz
  const averageScorePct =
    totalModulesWithQuiz > 0
      ? Math.round(sumScoresPct / totalModulesWithQuiz)
      : lessonsCompleted
        ? 100
        : 0

  const minRequiredScorePct = 70
  const isEligible =
    lessonsCompleted &&
    quizzesCompletedAll &&
    (totalModulesWithQuiz === 0 || averageScorePct >= minRequiredScorePct)

  const hours = Math.max(1, Math.round((totalDurationMin / 60) * 10) / 10)

  return {
    isEligible,
    totalLessons,
    completedLessons,
    lessonsCompleted,
    totalModulesWithQuiz,
    quizzesCompleted,
    quizzesCompletedAll,
    averageScorePct,
    minRequiredScorePct,
    missingLessonsCount: Math.max(0, totalLessons - completedLessons),
    missingQuizzesCount: Math.max(0, totalModulesWithQuiz - quizzesCompleted),
    totalDurationMin,
    totalDurationHours: hours,
  }
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
  feedback?: string
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
  data: FormData | { apostila?: File | null | '' },
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
