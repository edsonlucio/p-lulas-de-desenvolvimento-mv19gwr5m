import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { ModuleRecord, QuizAlternativeKey, QuizQuestionRecord } from '@/lib/types'
import {
  QUIZ_KEYS,
  QUIZ_LABELS,
  listQuizQuestions,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  toggleModuleQuiz,
} from '@/services/quiz'
import {
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LoaderCircle,
  Save,
  MessageSquare,
} from 'lucide-react'

interface AdminModuleQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: ModuleRecord | null
  onSaved?: () => void
}

interface QuestionFormState {
  id?: string // se já existe no banco
  pergunta: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  correta: QuizAlternativeKey
  feedback: string
  position: number
}

const EMPTY_QUESTION: Omit<QuestionFormState, 'position'> = {
  pergunta: '',
  alternativa_a: '',
  alternativa_b: '',
  alternativa_c: '',
  alternativa_d: '',
  correta: 'a',
  feedback: '',
}

export function AdminModuleQuizModal({
  open,
  onOpenChange,
  module,
  onSaved,
}: AdminModuleQuizModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<QuestionFormState[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0)

  useEffect(() => {
    if (!open || !module) {
      setQuestions([])
      setDeletedIds([])
      setActiveQuestionIdx(0)
      return
    }

    let isMounted = true
    setLoading(true)
    listQuizQuestions(module.id)
      .then((records) => {
        if (!isMounted) return
        if (records.length > 0) {
          setQuestions(
            records.map((r, idx) => ({
              id: r.id,
              pergunta: r.pergunta || '',
              alternativa_a: r.alternativa_a || '',
              alternativa_b: r.alternativa_b || '',
              alternativa_c: r.alternativa_c || '',
              alternativa_d: r.alternativa_d || '',
              correta: r.correta || 'a',
              feedback: r.feedback || '',
              position: r.position || idx + 1,
            })),
          )
        } else {
          // Iniciar com 5 perguntas em branco se não houver nenhuma cadastrada
          const initial: QuestionFormState[] = Array.from({ length: 5 }).map((_, i) => ({
            ...EMPTY_QUESTION,
            position: i + 1,
          }))
          setQuestions(initial)
        }
        setActiveQuestionIdx(0)
      })
      .catch((err) => {
        console.error('Erro ao carregar perguntas:', err)
        toast({
          title: 'Erro ao carregar perguntas',
          description: 'Não foi possível buscar as perguntas desta avaliação.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, module, toast])

  const totalQuestions = questions.length
  const isValidCount = totalQuestions >= 5 && totalQuestions <= 8

  function handleAddQuestion() {
    if (questions.length >= 8) {
      toast({
        title: 'Limite atingido',
        description: 'A avaliação permite no máximo 8 perguntas de múltipla escolha.',
        variant: 'destructive',
      })
      return
    }
    const nextPos = questions.length + 1
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION, position: nextPos }])
    setActiveQuestionIdx(questions.length)
  }

  function handleRemoveQuestion(idx: number) {
    if (questions.length <= 5) {
      toast({
        title: 'Mínimo de 5 perguntas',
        description: 'A avaliação do módulo precisa ter no mínimo 5 perguntas.',
        variant: 'destructive',
      })
      return
    }

    const target = questions[idx]
    if (target.id) {
      setDeletedIds((prev) => [...prev, target.id!])
    }

    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i + 1 }))

    setQuestions(updated)
    if (activeQuestionIdx >= updated.length) {
      setActiveQuestionIdx(Math.max(0, updated.length - 1))
    }
  }

  function updateActiveField<K extends keyof QuestionFormState>(
    key: K,
    value: QuestionFormState[K],
  ) {
    setQuestions((prev) => {
      const copy = [...prev]
      const current = copy[activeQuestionIdx]
      if (!current) return prev
      copy[activeQuestionIdx] = { ...current, [key]: value }
      return copy
    })
  }

  function validateQuestions(): string | null {
    if (questions.length < 5) {
      return `A avaliação precisa ter no mínimo 5 perguntas (atualmente tem ${questions.length}).`
    }
    if (questions.length > 8) {
      return `A avaliação permite no máximo 8 perguntas (atualmente tem ${questions.length}).`
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.pergunta.trim()) {
        return `A pergunta #${i + 1} precisa ter um enunciado.`
      }
      if (!q.alternativa_a.trim()) {
        return `A pergunta #${i + 1} precisa da Alternativa A preenchida.`
      }
      if (!q.alternativa_b.trim()) {
        return `A pergunta #${i + 1} precisa da Alternativa B preenchida.`
      }
      if (!q.alternativa_c.trim()) {
        return `A pergunta #${i + 1} precisa da Alternativa C preenchida.`
      }
      if (!q.alternativa_d.trim()) {
        return `A pergunta #${i + 1} precisa da Alternativa D preenchida.`
      }
      if (!q.feedback.trim()) {
        return `A pergunta #${i + 1} precisa do texto de feedback/explicação para a correção.`
      }
    }

    return null
  }

  async function handleSave() {
    if (!module) return
    const errorMsg = validateQuestions()
    if (errorMsg) {
      toast({
        title: 'Avaliação incompleta',
        description: errorMsg,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // 1) Deletar perguntas marcadas para exclusão
      for (const delId of deletedIds) {
        try {
          await deleteQuizQuestion(delId)
        } catch (e) {
          console.warn('Erro ao deletar pergunta antiga:', e)
        }
      }

      // 2) Criar ou atualizar cada pergunta
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const payload = {
          pergunta: q.pergunta.trim(),
          alternativa_a: q.alternativa_a.trim(),
          alternativa_b: q.alternativa_b.trim(),
          alternativa_c: q.alternativa_c.trim(),
          alternativa_d: q.alternativa_d.trim(),
          correta: q.correta,
          feedback: q.feedback.trim(),
          position: i + 1,
        }

        if (q.id) {
          await updateQuizQuestion(q.id, payload)
        } else {
          await createQuizQuestion({
            module: module.id,
            ...payload,
          })
        }
      }

      // 3) Garantir que o módulo está com quiz_ativo = true
      await toggleModuleQuiz(module.id, true)

      toast({
        title: 'Avaliação salva com sucesso!',
        description: `O módulo "${module.title}" agora conta com ${questions.length} perguntas e feedback detalhado.`,
      })

      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error)
      toast({
        title: 'Erro ao salvar avaliação',
        description:
          'Ocorreu um erro ao gravar as perguntas no banco. Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const currentQ = questions[activeQuestionIdx]

  return (
    <Dialog open={open} onOpenChange={(o) => (!saving ? onOpenChange(o) : null)}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-orange uppercase tracking-wider">
            <Award className="h-4 w-4" />
            <span>Avaliação do Módulo</span>
            <span>•</span>
            <span className="text-brand-navy truncate max-w-xs">{module?.title}</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-brand-navy">
            Editor de Avaliação do Módulo (5 a 8 perguntas)
          </DialogTitle>
          <DialogDescription className="text-xs text-brand-muted">
            Cadastre de 5 a 8 perguntas de múltipla escolha com 4 alternativas, marque a resposta
            correta e defina a explicação de feedback que o aluno receberá na correção em tempo
            real.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-brand-orange" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Barra de navegação das perguntas */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surface p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {questions.map((q, idx) => {
                  const isFilled =
                    Boolean(q.pergunta.trim()) &&
                    Boolean(q.alternativa_a.trim()) &&
                    Boolean(q.alternativa_b.trim()) &&
                    Boolean(q.alternativa_c.trim()) &&
                    Boolean(q.alternativa_d.trim()) &&
                    Boolean(q.feedback.trim())
                  const isActive = idx === activeQuestionIdx

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand-navy text-white shadow-sm ring-2 ring-brand-orange'
                          : isFilled
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-white text-brand-muted border border-brand-border hover:bg-brand-surface'
                      }`}
                      title={`Pergunta ${idx + 1}${isFilled ? ' (preenchida)' : ' (pendente)'}`}
                    >
                      {idx + 1}
                      {isFilled && (
                        <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </button>
                  )
                })}

                {questions.length < 8 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="h-9 rounded-xl border-dashed border-brand-orange text-brand-orange hover:bg-brand-orange/10 px-2.5 text-xs font-bold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar ({questions.length}/8)
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={isValidCount ? 'secondary' : 'destructive'}
                  className="rounded-full text-[11px] font-bold"
                >
                  {questions.length} perguntas {isValidCount ? '(válido 5–8)' : '(mínimo 5, máx 8)'}
                </Badge>

                {questions.length > 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveQuestion(activeQuestionIdx)}
                    className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Excluir pergunta ativa"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Excluir #{activeQuestionIdx + 1}
                  </Button>
                )}
              </div>
            </div>

            {/* Formulário da pergunta ativa */}
            {currentQ && (
              <div className="space-y-4 rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand-orange/15 text-xs font-extrabold text-brand-orange">
                      #{activeQuestionIdx + 1}
                    </span>
                    <strong className="text-sm font-bold text-brand-navy">
                      Pergunta {activeQuestionIdx + 1} de {questions.length}
                    </strong>
                  </div>
                  <span className="text-[11px] text-brand-muted">
                    Marque a letra da alternativa correta clicando no círculo
                  </span>
                </div>

                {/* Enunciado */}
                <div>
                  <Label className="text-xs font-bold text-brand-navy">
                    Enunciado da pergunta <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={2}
                    value={currentQ.pergunta}
                    onChange={(e) => updateActiveField('pergunta', e.target.value)}
                    placeholder="Ex: No funil de vendas simples e prático, qual é a função essencial do conteúdo de topo de funil?"
                    className="mt-1.5 text-xs"
                  />
                </div>

                {/* Alternativas A, B, C, D */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-brand-navy">
                    Alternativas (clique na letra para marcar a CORRETA){' '}
                    <span className="text-red-500">*</span>
                  </Label>

                  {QUIZ_KEYS.map((key) => {
                    const fieldKey = `alternativa_${key}` as const
                    const isSelected = currentQ.correta === key
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400'
                            : 'border-brand-border bg-brand-surface/40 hover:bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateActiveField('correta', key)}
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white text-brand-muted border border-brand-border hover:text-brand-navy'
                          }`}
                          title={`Marcar alternativa ${QUIZ_LABELS[key]} como correta`}
                        >
                          {isSelected ? <CheckCircle2 className="h-4 w-4" /> : QUIZ_LABELS[key]}
                        </button>

                        <Input
                          value={currentQ[fieldKey]}
                          onChange={(e) => updateActiveField(fieldKey, e.target.value)}
                          placeholder={`Texto da alternativa ${QUIZ_LABELS[key]}…`}
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 shadow-none px-1"
                        />

                        {isSelected && (
                          <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold shrink-0">
                            Correta
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Feedback Explicativo */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    <span>Feedback explicativo (correção na hora)</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    Este texto será exibido na tela logo após o aluno responder à pergunta,
                    explicando o porquê do conceito e consolidando o aprendizado.
                  </p>
                  <Textarea
                    rows={2}
                    value={currentQ.feedback}
                    onChange={(e) => updateActiveField('feedback', e.target.value)}
                    placeholder="Ex: No topo de funil o objetivo é conscientizar e atrair a persona através de respostas a dúvidas reais, e não forçar fechamento imediato."
                    className="mt-2 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Aviso de regras */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900">
              <HelpCircle className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">Regras da Avaliação:</strong>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  • <strong>5 a 8 perguntas</strong> com 4 opções e feedback explicativo cada.
                  <br />• A avaliação é liberada para o aluno apenas quando{' '}
                  <strong>todas as aulas do módulo estiverem concluídas</strong>.
                  <br />• O aluno pode <strong>refazer quantas vezes quiser</strong>, ficando sempre
                  registrada a <strong>melhor nota</strong>.
                  <br />• Para emissão do certificado final do curso, exige-se todas as aulas
                  concluídas e <strong>média final das avaliações ≥ 70%</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-full text-xs font-bold text-brand-muted hover:text-brand-navy"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || !isValidCount}
            className="rounded-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs px-6"
          >
            {saving ? (
              <>
                <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Salvando avaliação…
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Salvar Avaliação do Módulo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
