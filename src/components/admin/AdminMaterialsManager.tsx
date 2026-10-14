import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Check,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileUp,
  Link as LinkIcon,
  LoaderCircle,
  Plus,
  Trash2,
} from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { LessonMaterialRecord, LessonRecord, MaterialType } from '@/lib/types'
import {
  createLessonMaterial,
  deleteLessonMaterial,
  getMaterialKind,
  listAllMaterialsForAdmin,
  updateLessonMaterial,
} from '@/services/materials'

interface AdminMaterialsManagerProps {
  lesson: LessonRecord
  onClose: () => void
}

export function AdminMaterialsManager({ lesson, onClose }: AdminMaterialsManagerProps) {
  const { toast } = useToast()
  const [materials, setMaterials] = useState<LessonMaterialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingMat, setEditingMat] = useState<LessonMaterialRecord | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'arquivo' as MaterialType,
    url: '',
    descricao: '',
    sort: '1',
    situacao: 'ativo' as 'ativo' | 'inativo',
  })
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await listAllMaterialsForAdmin(lesson.id)
      setMaterials(data)
    } catch {
      toast({ title: 'Erro ao carregar materiais', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [lesson.id])

  function handleOpenCreate() {
    setEditingMat(null)
    setForm({
      titulo: '',
      tipo: 'arquivo',
      url: '',
      descricao: '',
      sort: String(materials.length + 1),
      situacao: 'ativo',
    })
    setFile(null)
    setFormOpen(true)
  }

  function handleOpenEdit(mat: LessonMaterialRecord) {
    setEditingMat(mat)
    setForm({
      titulo: mat.titulo,
      tipo: mat.tipo,
      url: mat.url || '',
      descricao: mat.descricao || '',
      sort: String(mat.sort || 1),
      situacao: mat.situacao || 'ativo',
    })
    setFile(null)
    setFormOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast({ title: 'O título é obrigatório', variant: 'destructive' })
      return
    }

    if (form.tipo === 'link' && !form.url.trim()) {
      toast({ title: 'Informe a URL do link externo', variant: 'destructive' })
      return
    }

    if (form.tipo === 'arquivo' && !editingMat && !file) {
      toast({ title: 'Selecione um arquivo (PDF, Excel, Word...)', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('lesson', lesson.id)
      formData.set('titulo', form.titulo.trim())
      formData.set('tipo', form.tipo)
      formData.set('descricao', form.descricao.trim())
      formData.set('sort', form.sort || '1')
      formData.set('situacao', form.situacao)

      if (form.tipo === 'link') {
        formData.set('url', form.url.trim())
      } else {
        formData.set('url', '')
        if (file) {
          formData.set('arquivo', file)
        }
      }

      if (editingMat) {
        await updateLessonMaterial(editingMat.id, formData)
        toast({ title: 'Material atualizado com sucesso!' })
      } else {
        await createLessonMaterial(formData)
        toast({ title: 'Material adicionado à aula!' })
      }

      setFormOpen(false)
      await load()
    } catch {
      toast({ title: 'Erro ao salvar material', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLessonMaterial(id)
      toast({ title: 'Material excluído' })
      setDeleteConfirmId(null)
      await load()
    } catch {
      toast({ title: 'Erro ao excluir material', variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
            <span>Gestão de Aula</span>
            <span>•</span>
            <span>{lesson.duration_min} min</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-brand-navy">
            Materiais: {lesson.title}
          </DialogTitle>
          <DialogDescription>
            Adicione PDFs, planilhas Excel ou links externos que ficam disponíveis para download aos
            alunos matriculados nesta aula.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center justify-between border-b border-brand-border pb-4">
          <div className="text-sm font-semibold text-brand-muted">
            Total de materiais: <strong className="text-brand-navy">{materials.length}</strong>
          </div>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar material
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-brand-muted">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-brand-orange" />
            Carregando materiais…
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border p-10 text-center">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-brand-muted/40" />
            <h3 className="mt-3 text-sm font-bold text-brand-navy">Nenhum material cadastrado</h3>
            <p className="mt-1 text-xs text-brand-muted">
              Clique em "Adicionar material" acima para anexar um PDF, planilha Excel ou link de
              apoio.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {materials.map((mat) => {
              const kind = getMaterialKind(mat)
              const isExcel = kind === 'excel' || kind === 'csv'
              const isPdf = kind === 'pdf'
              const isLink = mat.tipo === 'link'

              return (
                <div
                  key={mat.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surface p-4 transition sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        isPdf
                          ? 'bg-rose-100 text-rose-700'
                          : isExcel
                            ? 'bg-emerald-100 text-emerald-700'
                            : isLink
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isPdf && <FileText className="h-5 w-5" />}
                      {isExcel && <FileSpreadsheet className="h-5 w-5" />}
                      {isLink && <ExternalLink className="h-5 w-5" />}
                      {!isPdf && !isExcel && !isLink && <FileText className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-brand-navy">{mat.titulo}</strong>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            isPdf
                              ? 'bg-rose-100 text-rose-700'
                              : isExcel
                                ? 'bg-emerald-100 text-emerald-700'
                                : isLink
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isPdf ? 'PDF' : isExcel ? 'Excel' : isLink ? 'Link' : 'Arquivo'}
                        </span>
                        <span className="text-xs text-brand-muted">Ordem: {mat.sort}</span>
                        {mat.situacao === 'inativo' && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                            Inativo
                          </span>
                        )}
                      </div>

                      {mat.descricao && (
                        <p className="mt-1 text-xs text-brand-muted line-clamp-2">
                          {mat.descricao}
                        </p>
                      )}

                      <div className="mt-1 text-[11px] text-brand-muted">
                        {isLink ? (
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sky-600 hover:underline"
                          >
                            <LinkIcon className="mr-1 h-3 w-3" />
                            {mat.url}
                          </a>
                        ) : mat.arquivo ? (
                          <span className="font-mono text-brand-navy">Arquivo: {mat.arquivo}</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Sem arquivo anexado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleOpenEdit(mat)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                      onClick={() => setDeleteConfirmId(mat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter className="mt-4 border-t border-brand-border pt-4">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>

        {/* Modal de Criar/Editar Material */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-brand-navy">
                {editingMat ? 'Editar material' : 'Novo material'}
              </DialogTitle>
              <DialogDescription>
                Configure o material para download (PDF, Excel) ou link externo.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-3 space-y-4">
              <div>
                <Label>Tipo de material</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(val: MaterialType) => setForm({ ...form, tipo: val })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arquivo">
                      Arquivo para Download (PDF, Excel, Word...)
                    </SelectItem>
                    <SelectItem value="link">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título do material *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Ex: Guia de Métricas em PDF ou Planilha de ROI (Excel)"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>

              {form.tipo === 'link' ? (
                <div>
                  <Label>URL do link *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <Label>Arquivo (PDF, XLS, XLSX, CSV, DOC, DOCX - máx 10MB)</Label>
                  <Label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand-border p-3.5 hover:bg-brand-surface">
                    <FileUp className="h-5 w-5 text-brand-orange shrink-0" />
                    <span className="text-xs text-brand-muted truncate">
                      {file
                        ? file.name
                        : editingMat?.arquivo
                          ? `Atual: ${editingMat.arquivo} (clique para substituir)`
                          : 'Clique para selecionar o PDF ou Planilha Excel'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </Label>
                </div>
              )}

              <div>
                <Label>Descrição / Orientações (opcional)</Label>
                <Textarea
                  className="mt-1.5 min-h-20"
                  placeholder="Explique brevemente o conteúdo do material para o aluno."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem de exibição</Label>
                  <Input
                    type="number"
                    min="1"
                    className="mt-1.5"
                    value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select
                    value={form.situacao}
                    onValueChange={(val: 'ativo' | 'inativo') =>
                      setForm({ ...form, situacao: val })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white"
                >
                  {saving && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
                  {editingMat ? 'Salvar alterações' : 'Adicionar material'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirmação de exclusão */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-brand-navy">Excluir material?</DialogTitle>
              <DialogDescription className="text-center">
                Esta ação removerá o material e o arquivo associado permanentemente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteConfirmId && void handleDelete(deleteConfirmId)}
              >
                Sim, excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
