import { useState, useEffect } from 'react'
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Lock,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type {
  LessonRecord,
  ModuleRecord,
  QuizAlternativeKey,
  QuizAttemptRecord,
  QuizQuestionRecord,
} from '@/lib/types'
import {
  QUIZ_KEYS,
  QUIZ_LABELS,
  alternativeText,
  listQuizQuestions,
  getQuizAttempt,
  submitQuizAttempt,
  quizFeedback,
} from '@/services/quiz'

interface ModuleQuizSectionProps {
  module: ModuleRecord & { lessons: LessonRecord[] }
  courseId: string
  courseSlug: string
  userId: string
  completedLessonIds: Set<string>
  onAttemptSaved?: (attempt: QuizAttemptRecord) => void
  onGoToNextModule?: () => void
  onGoToCertificate?: () => void
  isLastModule?: boolean
}

export function ModuleQuizSection({
  module,
  courseId,
  courseSlug,
  userId,
  completedLessonIds,
  onAttemptSaved,
  onGoToNextModule,
  onGoToCertificate,
  isLastModule,
}: ModuleQuizSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestionRecord[]>([])
  const [attempt, setAttempt] = useState<QuizAttemptRecord | null>(null)

  // Respostas selecionadas na tentativa atual: { questionId: 'a' | 'b' ... }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, QuizAlternativeKey>>({})
  // Se está no modo de revisão/feedback após envio da tentativa atual
  const [reviewed, setReviewed] = useState(false)
  // Estatísticas da tentativa atual (quando finalizada)
  const [currentResult, setCurrentResult] = useState<{
    acertos: number
    total: number
    pct: number
    isNewBest: boolean
  } | null>(null)

  // Verifica se todas as aulas do módulo estão concluídas
  const unfinishedLessons = module.lessons.filter((l) => !completedLessonIds.has(l.id))
  const allLessonsDone = module.lessons.length > 0 && unfinishedLessons.length === 0

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([listQuizQuestions(module.id), getQuizAttempt(userId, module.id)])
      .then(([qList, att]) => {
        if (!active) return
        setQuestions(qList)
        setAttempt(att)

        // Se o aluno já tem uma tentativa gravada no banco e ainda não preencheu nada novo,
        // carrega as respostas da melhor tentativa e exibe em modo revisão
        if (att && att.respostas) {
          setSelectedAnswers(att.respostas)
          setReviewed(true)
          const pct = att.total > 0 ? Math.round((att.acertos / att.total) * 100) : 0
          setCurrentResult({
            acertos: att.acertos,
            total: att.total,
            pct,
            isNewBest: false,
          })
        } else {
          setSelectedAnswers({})
          setReviewed(false)
          setCurrentResult(null)
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar avaliação do módulo:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [module.id, userId])

  // Se o módulo não tiver perguntas cadastradas
  if (!loading && questions.length === 0) {
    return null
  }

  // 1) BLOQUEADO: quando nem todas as aulas do módulo foram concluídas
  if (!allLessonsDone) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-brand-navy p-6 sm:p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-300">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Award className="h-4 w-4" />
              <span>Avaliação do Módulo</span>
              <span>•</span>
              <span>{module.title}</span>
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-white">
              Avaliação bloqueada — Conclua as aulas deste módulo para liberar
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
              Para garantir que você absorveu o conteúdo com excelência, a avaliação de 5 a 8
              perguntas só é liberada quando todas as aulas do módulo forem concluídas.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="text-xs font-bold text-amber-300">
                Aulas pendentes neste módulo ({unfinishedLessons.length}):
              </span>
              <ul className="mt-2 space-y-1.5 text-xs text-white/80">
                {unfinishedLessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="truncate">{l.title}</span>
                    <span className="text-white/40">({l.duration_min || 10} min)</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2) LIBERADO: Responder ou rever avaliação
  function handleSelectAnswer(questionId: string, altKey: QuizAlternativeKey) {
    // Aluno pode trocar a opção enquanto responde
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: altKey,
    }))
  }

  function handleStartRetake() {
    // Limpa respostas e sai do modo de revisão para refazer a avaliação
    setSelectedAnswers({})
    setReviewed(false)
    setCurrentResult(null)
  }

  async function handleSubmitQuiz() {
    const answeredCount = Object.keys(selectedAnswers).length
    if (answeredCount < questions.length) {
      toast({
        title: 'Responda todas as perguntas',
        description: `Você respondeu ${answeredCount} de ${questions.length} perguntas. Complete todas antes de enviar.`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Calcula acertos
      let acertos = 0
      for (const q of questions) {
        if (selectedAnswers[q.id] === q.correta) {
          acertos++
        }
      }
      const total = questions.length
      const currentPct = Math.round((acertos / total) * 100)

      const { attempt: savedAttempt, isNewBest } = await submitQuizAttempt({
        userId,
        moduleId: module.id,
        courseId,
        respostas: selectedAnswers,
        acertos,
        total,
      })

      setAttempt(savedAttempt)
      setReviewed(true)
      setCurrentResult({
        acertos,
        total,
        pct: currentPct,
        isNewBest,
      })
      onAttemptSaved?.(savedAttempt)

      toast({
        title: isNewBest ? '🎉 Nova melhor nota guardada!' : 'Avaliação finalizada!',
        description: `Você acertou ${acertos} de ${total} perguntas (${currentPct}%). ${
          isNewBest ? 'Sua melhor nota foi atualizada.' : 'Sua melhor nota anterior foi preservada.'
        }`,
      })
    } catch (error) {
      console.error('Erro ao registrar avaliação:', error)
      toast({
        title: 'Erro ao enviar avaliação',
        description: 'Não foi possível gravar sua tentativa. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = Object.keys(selectedAnswers).length
  const allAnswered = answeredCount === questions.length

  const bestScorePct =
    attempt && attempt.total > 0 ? Math.round((attempt.acertos / attempt.total) * 100) : null

  return (
    <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-brand-navy via-brand-navy to-sky-950/40 p-6 sm:p-8 text-white shadow-xl">
      {/* Cabeçalho da Avaliação */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
            <Award className="h-4 w-4" />
            <span>Avaliação do Módulo</span>
            <span>•</span>
            <span className="text-white/60">{questions.length} perguntas</span>
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
            Avaliação: {module.title}
          </h2>
          <p className="mt-1 text-xs text-white/70">
            Correção na hora com feedback explicativo em cada resposta. O aluno pode refazer quantas
            vezes quiser — guardamos sempre a <strong>sua melhor nota</strong>.
          </p>
        </div>

        {/* Badge da melhor nota registrada */}
        {bestScorePct !== null && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Sua Melhor Nota
              </span>
              <span className="text-lg font-black text-white">
                {bestScorePct}%{' '}
                <span className="text-xs font-normal text-white/60">
                  ({attempt?.acertos}/{attempt?.total} acertos)
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Resultado da Tentativa Atual (quando finalizada) */}
      {reviewed && currentResult && (
        <div
          className={`mt-6 rounded-2xl border p-5 ${
            currentResult.pct >= 70
              ? 'border-emerald-400/40 bg-emerald-500/10'
              : 'border-amber-400/40 bg-amber-500/10'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl ${
                  currentResult.pct >= 70
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-brand-navy'
                }`}
              >
                {currentResult.pct >= 70 ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <AlertCircle className="h-7 w-7" />
                )}
              </div>
              <div>
                <strong className="block text-base font-extrabold text-white">
                  {currentResult.pct >= 70
                    ? 'Excelente aproveitamento!'
                    : 'Bom esforço! Você pode refazer para subir a nota'}
                </strong>
                <span className="text-xs text-white/80">
                  Nesta tentativa você acertou {currentResult.acertos} de {currentResult.total}{' '}
                  perguntas ({currentResult.pct}%).
                  {bestScorePct !== null && (
                    <>
                      {' '}
                      Melhor nota guardada:{' '}
                      <strong className="text-white font-bold">{bestScorePct}%</strong>.
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartRetake}
                className="rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Refazer Avaliação
              </Button>

              {isLastModule
                ? onGoToCertificate && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onGoToCertificate}
                      className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold"
                    >
                      <Award className="mr-1.5 h-3.5 w-3.5" />
                      Ver Certificado
                    </Button>
                  )
                : onGoToNextModule && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onGoToNextModule}
                      className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold"
                    >
                      Próximo Módulo
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Perguntas */}
      <div className="mt-6 space-y-6">
        {questions.map((q, idx) => {
          const selected = selectedAnswers[q.id]
          const isAnswered = Boolean(selected)
          const isCorrect = selected === q.correta
          const feedbackInfo = selected ? quizFeedback(q, selected) : null

          return (
            <div
              key={q.id}
              className={`rounded-2xl border p-5 transition-all ${
                reviewed
                  ? isCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                    : 'border-rose-500/40 bg-rose-500/[0.04]'
                  : isAnswered
                    ? 'border-sky-400/40 bg-white/[0.03]'
                    : 'border-white/10 bg-white/[0.015]'
              }`}
            >
              {/* Enunciado */}
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-xs font-black text-sky-300">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {q.pergunta}
                  </h3>
                </div>
              </div>

              {/* Alternativas A, B, C, D */}
              <div className="mt-4 space-y-2">
                {QUIZ_KEYS.map((key) => {
                  const text = alternativeText(q, key)
                  if (!text) return null
                  const isThisSelected = selected === key
                  const isThisCorrect = key === q.correta

                  let btnStyle = 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10'
                  if (reviewed) {
                    if (isThisCorrect) {
                      btnStyle =
                        'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold ring-1 ring-emerald-400'
                    } else if (isThisSelected && !isThisCorrect) {
                      btnStyle =
                        'border-rose-500 bg-rose-500/20 text-rose-200 font-bold ring-1 ring-rose-400 line-through opacity-80'
                    } else {
                      btnStyle = 'border-white/5 bg-transparent text-white/40'
                    }
                  } else if (isThisSelected) {
                    btnStyle =
                      'border-sky-400 bg-sky-500/20 text-white font-bold ring-2 ring-sky-400 shadow-md'
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={reviewed}
                      onClick={() => handleSelectAnswer(q.id, key)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs sm:text-sm transition ${btnStyle}`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition ${
                          reviewed
                            ? isThisCorrect
                              ? 'bg-emerald-500 text-white'
                              : isThisSelected
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/10 text-white/60'
                            : isThisSelected
                              ? 'bg-sky-400 text-brand-navy'
                              : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {reviewed && isThisCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : reviewed && isThisSelected && !isThisCorrect ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          QUIZ_LABELS[key]
                        )}
                      </span>
                      <span className="flex-1 min-w-0">{text}</span>
                    </button>
                  )
                })}
              </div>

              {/* Feedback explicativo da resposta (correção na hora) */}
              {reviewed && feedbackInfo && (
                <div
                  className={`mt-4 rounded-xl border p-3.5 text-xs ${
                    isCorrect
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Resposta correta!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-rose-400" />
                        <span>
                          Resposta incorreta — Alternativa certa: {QUIZ_LABELS[q.correta]}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-white/90 leading-relaxed font-normal">
                    {feedbackInfo.feedbackText}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rodapé de Ações */}
      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-white/10 pt-5">
        <div className="text-xs text-white/60">
          {reviewed ? (
            <span>
              Avaliação corrigida. Você pode <strong>refazer</strong> a qualquer momento para buscar
              uma nota ainda maior.
            </span>
          ) : (
            <span>
              {answeredCount} de {questions.length} perguntas respondidas
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {reviewed ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartRetake}
              className="rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Refazer Avaliação
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting || !allAnswered}
              onClick={() => void handleSubmitQuiz()}
              className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-6 shadow-lg shadow-brand-orange/20"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Corrigindo avaliação…
                </>
              ) : (
                <>
                  <Award className="mr-1.5 h-3.5 w-3.5" />
                  Concluir e Corrigir Avaliação
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
