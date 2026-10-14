import { useEffect, useState, type FormEvent } from 'react'
import { FileText, LoaderCircle, Sparkles, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { LessonRecord } from '@/lib/types'
import { createLesson, updateLesson } from '@/services/admin'
import { countChunksByLesson, prepareLessonChunks } from '@/services/searchChunks'

interface AdminLessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  moduleId: string
  moduleTitle: string
  lesson: LessonRecord | null // null = criando nova aula
  nextPosition: number
  onSaved: () => void
}

export function AdminLessonModal({
  open,
  onOpenChange,
  courseId,
  moduleId,
  moduleTitle,
  lesson,
  nextPosition,
  onSaved,
}: AdminLessonModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [chunkCount, setChunkCount] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_min: 15,
    is_free: false,
    situacao: 'ativo' as 'ativo' | 'inativo',
    transcript: '',
  })
  const [searchStatus, setSearchStatus] = useState<'nao_preparada' | 'preparada' | 'erro'>(
    'nao_preparada',
  )

  useEffect(() => {
    if (lesson) {
      const trans = lesson.transcript || lesson.transcricao || ''
      setForm({
        title: lesson.title,
        description: lesson.description || '',
        video_url: lesson.video_url || '',
        duration_min: lesson.duration_min || 15,
        is_free: !!lesson.is_free,
        situacao: lesson.situacao || 'ativo',
        transcript: trans,
      })
      void countChunksByLesson(lesson.id).then((count) => {
        setChunkCount(count)
        if (count > 0) {
          setSearchStatus('preparada')
        } else if (!trans.trim()) {
          setSearchStatus('nao_preparada')
        } else {
          setSearchStatus('nao_preparada')
        }
      })
    } else {
      setForm({
        title: '',
        description: '',
        video_url: '',
        duration_min: 15,
        is_free: false,
        situacao: 'ativo',
        transcript: '',
      })
      setChunkCount(0)
      setSearchStatus('nao_preparada')
    }
  }, [lesson, open])

  // Lidar com upload de arquivo .txt
  function handleFileUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo de texto (.txt).',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result || '')
      setForm((prev) => ({ ...prev, transcript: text }))
      toast({
        title: 'Arquivo carregado',
        description: `${file.name} (${text.length.toLocaleString('pt-BR')} caracteres carregados).`,
      })
    }
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível carregar o conteúdo do arquivo.',
        variant: 'destructive',
      })
    }
    reader.readAsText(file)
  }

  // Preparar busca
  async function handlePrepareSearch() {
    const text = form.transcript.trim()
    if (!text) {
      setSearchStatus('erro')
      return toast({
        title: 'Transcrição vazia',
        description: 'Cole um texto ou envie um arquivo .txt antes de preparar a busca.',
        variant: 'destructive',
      })
    }

    setPreparing(true)
    try {
      // Se a aula ainda não foi salva no banco, primeiro salvar para obter o ID
      let currentLessonId = lesson?.id
      if (!currentLessonId) {
        if (!form.title.trim() || !form.video_url.trim()) {
          setPreparing(false)
          return toast({
            title: 'Dados obrigatórios',
            description: 'Preencha o título e o link do vídeo antes de preparar a busca.',
            variant: 'destructive',
          })
        }
        const created = await createLesson({
          module: moduleId,
          title: form.title.trim(),
          description: form.description.trim(),
          video_url: form.video_url.trim(),
          duration_min: Number(form.duration_min) || 15,
          position: nextPosition,
          is_free: form.is_free,
          situacao: form.situacao,
          transcript: text,
          transcricao: text,
        })
        currentLessonId = created.id
      }

      const result = await prepareLessonChunks({
        courseId,
        lessonId: currentLessonId,
        transcriptText: text,
      })

      setChunkCount(result.count)
      setSearchStatus('preparada')
      toast({
        title: 'Busca preparada com sucesso!',
        description: `A transcrição foi dividida em ${result.count} trechos vinculados à aula (sem duplicidade).`,
      })
      onSaved()
    } catch (err: unknown) {
      setSearchStatus('erro')
      const msg = (err as Error)?.message || 'Falha ao processar os trechos da aula.'
      toast({
        title: 'Erro ao preparar busca',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setPreparing(false)
    }
  }

  // Submeter aula
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.video_url.trim()) {
      return toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Título e URL do YouTube são necessários.',
        variant: 'destructive',
      })
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim(),
        duration_min: Number(form.duration_min) || 15,
        is_free: form.is_free,
        situacao: form.situacao,
        transcript: form.transcript.trim(),
        transcricao: form.transcript.trim(),
      }

      if (lesson) {
        await updateLesson(lesson.id, payload)
        toast({
          title: 'Aula atualizada',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await createLesson({
          ...payload,
          module: moduleId,
          position: nextPosition,
        })
        toast({
          title: 'Aula criada',
          description: 'A nova aula foi adicionada ao módulo.',
        })
      }

      onSaved()
      onOpenChange(false)
    } catch {
      toast({
        title: 'Erro ao salvar aula',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
            <span>{moduleTitle}</span>
            <span>•</span>
            <span>{lesson ? `Editando Aula` : `Nova Aula`}</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-brand-navy">
            {lesson ? lesson.title : 'Cadastrar nova aula'}
          </DialogTitle>
          <DialogDescription>
            Configure os dados da aula e prepare os trechos de busca por significado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="lesson-title">Título da aula *</Label>
              <Input
                id="lesson-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Como definir seu público ideal"
                className="mt-1.5 rounded-xl"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="lesson-video">URL do YouTube *</Label>
              <Input
                id="lesson-video"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1.5 rounded-xl"
                required
              />
            </div>

            <div>
              <Label htmlFor="lesson-duration">Duração (minutos)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min="0"
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) || 0 })}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Situação da aula</Label>
              <div className="mt-2.5 flex items-center gap-3">
                <Switch
                  checked={form.situacao === 'ativo'}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, situacao: checked ? 'ativo' : 'inativo' })
                  }
                />
                <span className="text-sm font-semibold">
                  {form.situacao === 'ativo' ? 'Ativa (visível)' : 'Inativa (oculta)'}
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface p-3.5">
              <Switch
                checked={form.is_free}
                onCheckedChange={(checked) => setForm({ ...form, is_free: checked })}
              />
              <div>
                <Label className="cursor-pointer font-bold text-brand-navy">
                  Aula gratuita de degustação
                </Label>
                <p className="text-xs text-brand-muted">
                  Se ativado, qualquer visitante poderá assistir esta aula sem precisar comprar o
                  curso.
                </p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="lesson-desc">Descrição / Resumo da aula</Label>
              <Textarea
                id="lesson-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explique os pontos centrais abordados nesta aula..."
                className="mt-1.5 min-h-20 rounded-xl"
              />
            </div>
          </div>

          {/* Seção Etapa 5: Transcrição e Preparo da Busca por Significado */}
          <div className="rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-brand-orange/[0.04] to-brand-navy/[0.02] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-orange" />
                  <h3 className="text-sm font-extrabold text-brand-navy">
                    Transcrição & Busca por Significado
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Perguntas em linguagem natural encontram esta aula mesmo sem a palavra exata.
                </p>
              </div>

              {/* Situação da aula */}
              <div className="self-start sm:self-auto">
                {searchStatus === 'preparada' ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                    Preparada ({chunkCount ?? 0} trechos)
                  </span>
                ) : searchStatus === 'erro' ? (
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-rose-500" />
                    Erro no preparo
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-500" />
                    Não preparada
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label htmlFor="lesson-transcript" className="text-xs font-bold text-brand-navy">
                  Texto da transcrição (colar ou importar)
                </Label>

                {/* Upload de arquivo .txt */}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-1 text-xs font-bold text-brand-navy shadow-sm transition hover:border-brand-orange hover:text-brand-orange">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload .txt</span>
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              <Textarea
                id="lesson-transcript"
                value={form.transcript}
                onChange={(e) => {
                  setForm({ ...form, transcript: e.target.value })
                  if (!e.target.value.trim()) {
                    setSearchStatus('nao_preparada')
                  }
                }}
                placeholder="Cole aqui a transcrição completa da aula (ex: 40 minutos de fala) ou envie um arquivo .txt..."
                className="min-h-28 rounded-xl font-mono text-xs"
              />

              <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
                <div className="text-[11px] text-brand-muted">
                  {form.transcript ? (
                    <span>
                      {form.transcript.length.toLocaleString('pt-BR')} caracteres · Estimativa: ~
                      {Math.max(1, Math.round(form.transcript.length / 800))} trechos
                    </span>
                  ) : (
                    <span>Nenhuma transcrição adicionada.</span>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={preparing || !form.transcript.trim()}
                  onClick={() => void handlePrepareSearch()}
                  className="rounded-full border-brand-orange/40 bg-brand-orange/10 font-bold text-brand-orange hover:bg-brand-orange hover:text-white"
                >
                  {preparing ? (
                    <>
                      <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Dividindo trechos…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Preparar busca
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
            >
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {lesson ? 'Salvar alterações' : 'Criar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
