import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Video,
  Youtube,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CourseCover } from '@/components/CourseCover'
import { AdminLessonModal } from '@/components/admin/AdminLessonModal'
import { AdminMaterialsManager } from '@/components/admin/AdminMaterialsManager'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type {
  CourseBundle,
  CourseRecord,
  EnrollmentRecord,
  LessonRecord,
  ModuleRecord,
} from '@/lib/types'
import {
  createCourse,
  createModule,
  deleteLesson,
  deleteModule,
  reorderLessons,
  reorderModules,
  updateCourse,
  updateModule,
} from '@/services/admin'
import { formatPrice, getCourseBundle, getCourseCounts, listAllCourses } from '@/services/courses'
import { getLessonChunksStats } from '@/services/searchChunks'

export default function AdminCourses() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
  const [counts, setCounts] = useState(
    new Map<string, { modules: number; lessons: number; duration: number }>(),
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CourseRecord | null>(null)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    price: '297',
    category: 'marketing',
    published: false,
  })
  const [thumbnail, setThumbnail] = useState<File | null>(null)

  // Indicador de busca por significado (Etapa 5)
  const [searchStats, setSearchStats] = useState<{
    totalLessons: number
    preparedLessons: number
    unpreparedLessons: number
    totalChunks: number
  } | null>(null)

  // Gerenciamento de aulas e materiais
  const [structureOpen, setStructureOpen] = useState(false)
  const [selectedCourseBundle, setSelectedCourseBundle] = useState<CourseBundle | null>(null)
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [managingLessonMaterials, setManagingLessonMaterials] = useState<LessonRecord | null>(null)

  // Edição de Módulo
  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null)
  const [moduleTitleInput, setModuleTitleInput] = useState('')
  const [savingModule, setSavingModule] = useState(false)

  // Edição / Criação de Aula
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [targetModuleForLesson, setTargetModuleForLesson] = useState<ModuleRecord | null>(null)
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null)

  async function load() {
    const [records, enrollmentList] = await Promise.all([
      listAllCourses(),
      pb.collection<EnrollmentRecord>('enrollments').getFullList({ filter: 'situacao = "ativa"' }),
    ])
    setCourses(records)
    setEnrollments(enrollmentList)
    setCounts(await getCourseCounts(records.map((record) => record.id)))
    try {
      const stats = await getLessonChunksStats()
      setSearchStats(stats)
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void load()
  }, [])
  function startEdit(course?: CourseRecord) {
    const record = course || null
    setEditing(record)
    setForm(
      record
        ? {
            title: record.title,
            slug: record.slug,
            subtitle: record.subtitle,
            description: record.description,
            price: String(record.price),
            category: record.category,
            published: record.published,
          }
        : {
            title: '',
            slug: '',
            subtitle: '',
            description: '',
            price: '297',
            category: 'marketing',
            published: false,
          },
    )
    setThumbnail(null)
    setOpen(true)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.title || !form.slug || !form.price) return
    setSaving(true)
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.set(key, String(value)))
    if (thumbnail) data.set('thumbnail', thumbnail)
    try {
      if (editing) await updateCourse(editing.id, data)
      else await createCourse(data)
      toast({
        title: editing ? 'Curso atualizado' : 'Curso criado',
        description: 'As mudanças já estão no painel.',
      })
      setOpen(false)
      await load()
    } catch {
      toast({ title: 'Não foi possível salvar o curso', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }
  async function toggle(course: CourseRecord) {
    const meta = counts.get(course.id)
    if (!course.published && (!meta?.modules || !meta.lessons))
      return toast({
        title: 'Adicione ao menos um módulo e uma aula antes de publicar',
        variant: 'destructive',
      })
    try {
      await updateCourse(course.id, { published: !course.published })
      await load()
    } catch {
      toast({ title: 'Não foi possível alterar a publicação', variant: 'destructive' })
    }
  }

  async function openStructure(course: CourseRecord) {
    setLoadingStructure(true)
    setStructureOpen(true)
    try {
      const bundle = await getCourseBundle(course.slug)
      setSelectedCourseBundle(bundle)
    } catch {
      toast({ title: 'Erro ao carregar estrutura do curso', variant: 'destructive' })
    } finally {
      setLoadingStructure(false)
    }
  }

  async function refreshStructure() {
    if (!selectedCourseBundle) return
    try {
      const bundle = await getCourseBundle(selectedCourseBundle.course.slug)
      setSelectedCourseBundle(bundle)
      await load()
    } catch {
      /* intentionally ignored */
    }
  }

  // --- Operações de Módulos ---
  function openCreateModule() {
    setEditingModule(null)
    setModuleTitleInput('')
    setModuleModalOpen(true)
  }

  function openEditModule(mod: ModuleRecord) {
    setEditingModule(mod)
    setModuleTitleInput(mod.title)
    setModuleModalOpen(true)
  }

  async function handleSaveModule(e: FormEvent) {
    e.preventDefault()
    if (!selectedCourseBundle || !moduleTitleInput.trim()) return
    setSavingModule(true)
    try {
      if (editingModule) {
        await updateModule(editingModule.id, { title: moduleTitleInput.trim() })
        toast({ title: 'Módulo renomeado com sucesso' })
      } else {
        const nextPos = (selectedCourseBundle.modules.length || 0) + 1
        await createModule(selectedCourseBundle.course.id, moduleTitleInput.trim(), nextPos)
        toast({ title: 'Módulo criado com sucesso' })
      }
      setModuleModalOpen(false)
      await refreshStructure()
    } catch {
      toast({ title: 'Erro ao salvar módulo', variant: 'destructive' })
    } finally {
      setSavingModule(false)
    }
  }

  async function handleMoveModule(index: number, direction: 'up' | 'down') {
    if (!selectedCourseBundle) return
    const modules = [...selectedCourseBundle.modules]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= modules.length) return

    // Trocar posições
    const temp = modules[index]
    modules[index] = modules[targetIndex]
    modules[targetIndex] = temp

    try {
      // Para evitar conflito temporário com índice UNIQUE (course, position),
      // atribuir números temporários altos primeiro
      const tempUpdates = modules.map((m, idx) => ({ id: m.id, position: 1000 + idx }))
      await reorderModules(tempUpdates)
      const finalUpdates = modules.map((m, idx) => ({ id: m.id, position: idx + 1 }))
      await reorderModules(finalUpdates)
      await refreshStructure()
      toast({ title: 'Ordem dos módulos atualizada' })
    } catch {
      toast({ title: 'Erro ao reordenar módulos', variant: 'destructive' })
    }
  }

  async function handleDeleteModule(mod: ModuleRecord & { lessons: LessonRecord[] }) {
    if (mod.lessons.length > 0) {
      const confirm = window.confirm(
        `Atenção: O módulo "${mod.title}" possui ${mod.lessons.length} aula(s). Ao excluir o módulo, todas as aulas vinculadas serão excluídas em cascata. Deseja realmente continuar?`,
      )
      if (!confirm) return
    } else {
      const confirm = window.confirm(`Deseja realmente excluir o módulo "${mod.title}"?`)
      if (!confirm) return
    }

    try {
      await deleteModule(mod.id)
      toast({ title: 'Módulo excluído com sucesso' })
      await refreshStructure()
    } catch {
      toast({ title: 'Erro ao excluir módulo', variant: 'destructive' })
    }
  }

  // --- Operações de Aulas ---
  function openCreateLesson(mod: ModuleRecord) {
    setTargetModuleForLesson(mod)
    setEditingLesson(null)
    setLessonModalOpen(true)
  }

  function openEditLesson(mod: ModuleRecord, lesson: LessonRecord) {
    setTargetModuleForLesson(mod)
    setEditingLesson(lesson)
    setLessonModalOpen(true)
  }

  async function handleMoveLesson(
    mod: ModuleRecord & { lessons: LessonRecord[] },
    lIdx: number,
    direction: 'up' | 'down',
  ) {
    const lessons = [...mod.lessons]
    const targetIndex = direction === 'up' ? lIdx - 1 : lIdx + 1
    if (targetIndex < 0 || targetIndex >= lessons.length) return

    const temp = lessons[lIdx]
    lessons[lIdx] = lessons[targetIndex]
    lessons[targetIndex] = temp

    try {
      // Reordenar com salto temporário para evitar conflito de índice único (module, position)
      const tempUpdates = lessons.map((l, idx) => ({ id: l.id, position: 1000 + idx }))
      await reorderLessons(tempUpdates)
      const finalUpdates = lessons.map((l, idx) => ({ id: l.id, position: idx + 1 }))
      await reorderLessons(finalUpdates)
      await refreshStructure()
      toast({ title: 'Ordem das aulas atualizada' })
    } catch {
      toast({ title: 'Erro ao reordenar aulas', variant: 'destructive' })
    }
  }

  async function handleDeleteLesson(lesson: LessonRecord) {
    const ok = window.confirm(`Deseja realmente excluir a aula "${lesson.title}"?`)
    if (!ok) return
    try {
      await deleteLesson(lesson.id)
      toast({ title: 'Aula excluída com sucesso' })
      await refreshStructure()
    } catch {
      toast({ title: 'Erro ao excluir aula', variant: 'destructive' })
    }
  }
  const visible = courses.filter((course) =>
    course.title.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="route-page py-10">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4" /> Listagem e gestão
            </span>
            <h1 className="section-title mt-3">Cursos</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Organize a vitrine, módulos e aulas em vídeo do YouTube.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => startEdit()}
                className="pill-button bg-brand-orange hover:bg-brand-orange-dark"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo curso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar curso' : 'Novo curso'}</DialogTitle>
                <DialogDescription>
                  Defina as informações que aparecem na vitrine pública.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="mt-3 grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Título</Label>
                  <Input
                    className="mt-2"
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: editing
                          ? form.slug
                          : e.target.value
                              .toLowerCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-|-$/g, ''),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    className="mt-2"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Subtítulo</Label>
                  <Input
                    className="mt-2"
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    className="mt-2 min-h-28"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preço (R$)</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(category) => setForm({ ...form, category })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="lideranca">Liderança</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="motivacional">Motivacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand-border p-4">
                    <ImagePlus className="h-5 w-5 text-brand-orange" />
                    <span className="text-sm">
                      {thumbnail?.name || 'Selecionar imagem de capa'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                    />
                  </Label>
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch
                    checked={form.published}
                    onCheckedChange={(published) => setForm({ ...form, published })}
                  />
                  <Label>Publicar na vitrine</Label>
                </div>
                <Button
                  disabled={saving}
                  className="pill-button bg-brand-orange hover:bg-brand-orange-dark sm:col-span-2"
                >
                  {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Salvar alterações' : 'Criar curso'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="surface-card mt-8 overflow-hidden">
          <div className="flex items-center border-b border-brand-border p-4">
            <Search className="mr-3 h-4 w-4 text-brand-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar curso…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estrutura</th>
                  <th>Preço</th>
                  <th>Publicado</th>
                  <th>Matrículas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((course) => {
                  const meta = counts.get(course.id)
                  const activeEnrollmentsCount = enrollments.filter(
                    (e) => e.course === course.id && e.situacao === 'ativa',
                  ).length
                  return (
                    <tr key={course.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <CourseCover course={course} className="h-14 w-24 shrink-0 rounded-xl" />
                          <div>
                            <strong className="block text-brand-navy">{course.title}</strong>
                            <span className="text-xs capitalize text-brand-muted">
                              {course.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="flex items-center gap-2 font-semibold">
                          <Layers3 className="h-4 w-4 text-brand-orange" />
                          {meta?.modules || 0} módulos · {meta?.lessons || 0} aulas
                        </span>
                      </td>
                      <td className="font-extrabold text-brand-navy">
                        {formatPrice(course.price)}
                      </td>
                      <td>
                        <Switch
                          checked={course.published}
                          onCheckedChange={() => void toggle(course)}
                        />
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-2.5 py-1 text-xs font-extrabold text-brand-navy border border-brand-border">
                          <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                          {activeEnrollmentsCount}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className="rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                            onClick={() => void openStructure(course)}
                          >
                            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                            Aulas & Materiais
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => startEdit(course)}
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="rounded-full text-brand-navy hover:text-brand-orange hover:bg-brand-subtle"
                          >
                            <Link
                              to={`/app/curso/${course.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visualizar este curso como o aluno o vê (Player ou Vendas)"
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Ver como aluno
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <div className="p-12 text-center text-sm text-brand-muted">
              Nenhum curso encontrado.
            </div>
          )}
        </div>

        {/* Indicador Geral: Busca por Significado (Etapa 5) */}
        {searchStats && (
          <div className="mt-6 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-brand-navy">
                      Indicador de Busca por Significado (Etapa 5)
                    </h2>
                    <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-extrabold text-brand-orange uppercase">
                      IA Semântica
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">
                    Total de trechos indexados:{' '}
                    <strong className="text-brand-navy">{searchStats.totalChunks}</strong> · Aulas
                    com busca preparada:{' '}
                    <strong className="text-brand-navy">{searchStats.preparedLessons}</strong> de{' '}
                    <strong className="text-brand-navy">{searchStats.totalLessons}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {searchStats.unpreparedLessons > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      {searchStats.unpreparedLessons}{' '}
                      {searchStats.unpreparedLessons === 1 ? 'aula publicada' : 'aulas publicadas'}{' '}
                      sem transcrição / preparo
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Todas as aulas publicadas estão preparadas para a busca!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-5">
          <div className="flex items-start gap-3">
            <Youtube className="mt-0.5 h-5 w-5 text-brand-orange" />
            <div>
              <h2 className="font-extrabold text-brand-navy">Vídeos e Materiais Didáticos</h2>
              <p className="mt-1 text-sm leading-6 text-brand-muted">
                Em cada aula é possível anexar arquivos para download (PDF, planilhas Excel
                .xlsx/.xls, CSV e Word) ou cadastrar links externos de aprofundamento. Os alunos
                matriculados acessam esses materiais diretamente pela aba "Materiais" na tela do
                Player.
              </p>
            </div>
          </div>
        </div>

        {/* Modal de Gestão de Módulos, Aulas e Acesso a Materiais */}
        <Dialog open={structureOpen} onOpenChange={setStructureOpen}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
                  <span>Estrutura do Curso</span>
                  <span>•</span>
                  <span>Editor de Módulos & Aulas (Etapa 4 + 5)</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div>
                  <DialogTitle className="text-xl font-extrabold text-brand-navy">
                    {selectedCourseBundle?.course.title || 'Estrutura do Curso'}
                  </DialogTitle>
                  <DialogDescription>
                    Organize os módulos, crie aulas com transcrição e anexe materiais de apoio.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={openCreateModule}
                    className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                  >
                    <FolderPlus className="mr-1.5 h-4 w-4" />
                    Novo Módulo
                  </Button>
                  {selectedCourseBundle && (
                    <Button size="sm" variant="outline" asChild className="rounded-full">
                      <Link
                        to={`/app/curso/${selectedCourseBundle.course.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Ver no Player
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            {loadingStructure ? (
              <div className="flex items-center justify-center py-12 text-brand-muted">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-brand-orange" />
                Carregando estrutura…
              </div>
            ) : !selectedCourseBundle?.modules.length ? (
              <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                <p>Nenhum módulo cadastrado para este curso.</p>
                <Button
                  size="sm"
                  onClick={openCreateModule}
                  className="mt-3 pill-button bg-brand-orange text-white"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar Primeiro Módulo
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {selectedCourseBundle.modules.map((mod, modIdx) => (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-brand-border bg-brand-surface p-5"
                  >
                    {/* Cabeçalho do Módulo */}
                    <div className="flex flex-col gap-2 border-b border-brand-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-orange/10 text-xs font-extrabold text-brand-orange">
                          {modIdx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                            Módulo {modIdx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-brand-navy">{mod.title}</h3>
                        </div>
                      </div>

                      {/* Ações do Módulo: Reordenar, Renomear, Criar Aula, Excluir */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                        {/* Subir Módulo */}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={modIdx === 0}
                          onClick={() => void handleMoveModule(modIdx, 'up')}
                          className="h-8 w-8 p-0 rounded-full"
                          title="Mover módulo para cima"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        {/* Descer Módulo */}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={modIdx === selectedCourseBundle.modules.length - 1}
                          onClick={() => void handleMoveModule(modIdx, 'down')}
                          className="h-8 w-8 p-0 rounded-full"
                          title="Mover módulo para baixo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        {/* Renomear Módulo */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModule(mod)}
                          className="h-8 rounded-full px-2.5 text-xs font-semibold"
                          title="Renomear módulo"
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          Renomear
                        </Button>
                        {/* Nova Aula */}
                        <Button
                          size="sm"
                          onClick={() => openCreateLesson(mod)}
                          className="h-8 rounded-full bg-brand-navy hover:bg-brand-navy/90 text-white px-3 text-xs font-bold"
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Nova Aula
                        </Button>
                        {/* Excluir Módulo */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDeleteModule(mod)}
                          className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Excluir módulo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Lista de Aulas do Módulo */}
                    <div className="mt-3 space-y-2">
                      {mod.lessons.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-brand-border/80 p-4 text-center text-xs text-brand-muted">
                          Nenhuma aula neste módulo. Clique em "+ Nova Aula" para adicionar.
                        </div>
                      ) : (
                        mod.lessons.map((lesson, lIdx) => (
                          <div
                            key={lesson.id}
                            className="flex flex-col justify-between gap-3 rounded-xl border border-white bg-white p-3.5 shadow-sm sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-navy/5 text-xs font-bold text-brand-navy">
                                  {lIdx + 1}
                                </span>
                                <strong className="text-sm text-brand-navy truncate">
                                  {lesson.title}
                                </strong>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-brand-muted pl-8">
                                <span>{lesson.duration_min} min</span>
                                <span>•</span>
                                <span
                                  className={
                                    lesson.is_free
                                      ? 'font-bold text-emerald-600'
                                      : 'text-brand-muted'
                                  }
                                >
                                  {lesson.is_free ? 'Degustação grátis' : 'Exclusiva'}
                                </span>
                                <span>•</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    lesson.situacao === 'ativo'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-zinc-100 text-zinc-600'
                                  }`}
                                >
                                  {lesson.situacao}
                                </span>
                                {(lesson.transcript || lesson.transcricao) && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center text-[10px] font-bold text-brand-orange">
                                      <Sparkles className="mr-1 h-3 w-3" />
                                      Com transcrição
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Ações da Aula: Reordenar, Editar, Materiais, Excluir */}
                            <div className="flex flex-wrap items-center gap-1 sm:self-center">
                              {/* Subir Aula */}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={lIdx === 0}
                                onClick={() => void handleMoveLesson(mod, lIdx, 'up')}
                                className="h-7 w-7 p-0 rounded-full"
                                title="Subir aula"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              {/* Descer Aula */}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={lIdx === mod.lessons.length - 1}
                                onClick={() => void handleMoveLesson(mod, lIdx, 'down')}
                                className="h-7 w-7 p-0 rounded-full"
                                title="Descer aula"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                              {/* Editar Aula (com Transcrição e Busca) */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-2.5 text-xs font-bold"
                                onClick={() => openEditLesson(mod, lesson)}
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Editar Aula
                              </Button>
                              {/* Gerenciar Materiais Didáticos */}
                              <Button
                                size="sm"
                                className="h-8 rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white px-2.5 text-xs font-bold"
                                onClick={() => setManagingLessonMaterials(lesson)}
                              >
                                <FileSpreadsheet className="mr-1 h-3 w-3" />
                                Materiais
                              </Button>
                              {/* Excluir Aula */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDeleteLesson(lesson)}
                                className="h-7 w-7 p-0 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                                title="Excluir aula"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Criação / Edição de Módulo */}
        <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-brand-navy">
                {editingModule ? 'Renomear Módulo' : 'Novo Módulo'}
              </DialogTitle>
              <DialogDescription>
                {editingModule
                  ? 'Altere o nome deste módulo no curso.'
                  : 'Adicione uma nova etapa temática à trilha de aprendizado.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveModule} className="mt-3 space-y-4">
              <div>
                <Label htmlFor="module-title">Título do Módulo</Label>
                <Input
                  id="module-title"
                  value={moduleTitleInput}
                  onChange={(e) => setModuleTitleInput(e.target.value)}
                  placeholder="Ex: Módulo 1 — Fundamentos do Posicionamento"
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setModuleModalOpen(false)}
                  disabled={savingModule}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingModule || !moduleTitleInput.trim()}
                  className="rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                >
                  {savingModule && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {editingModule ? 'Salvar nome' : 'Criar módulo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Criação / Edição de Aula (Etapa 4 + Etapa 5 com Transcrição) */}
        {targetModuleForLesson && (
          <AdminLessonModal
            open={lessonModalOpen}
            onOpenChange={setLessonModalOpen}
            courseId={selectedCourseBundle?.course.id || ''}
            moduleId={targetModuleForLesson.id}
            moduleTitle={targetModuleForLesson.title}
            lesson={editingLesson}
            nextPosition={
              editingLesson
                ? editingLesson.position
                : (selectedCourseBundle?.modules.find((m) => m.id === targetModuleForLesson.id)
                    ?.lessons.length || 0) + 1
            }
            onSaved={() => {
              void refreshStructure()
            }}
          />
        )}

        {/* Modal de Materiais da Aula selecionada */}
        {managingLessonMaterials && (
          <AdminMaterialsManager
            lesson={managingLessonMaterials}
            onClose={() => {
              setManagingLessonMaterials(null)
              void refreshStructure()
            }}
          />
        )}
      </div>
    </div>
  )
}
