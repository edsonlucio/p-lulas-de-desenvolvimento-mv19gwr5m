import { useEffect, useState, type FormEvent } from 'react'
import {
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Video,
  Youtube,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { AdminMaterialsManager } from '@/components/admin/AdminMaterialsManager'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { CourseBundle, CourseRecord, LessonRecord } from '@/lib/types'
import { createCourse, updateCourse } from '@/services/admin'
import { formatPrice, getCourseBundle, getCourseCounts, listAllCourses } from '@/services/courses'

export default function AdminCourses() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<CourseRecord[]>([])
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

  // Gerenciamento de aulas e materiais
  const [structureOpen, setStructureOpen] = useState(false)
  const [selectedCourseBundle, setSelectedCourseBundle] = useState<CourseBundle | null>(null)
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [managingLessonMaterials, setManagingLessonMaterials] = useState<LessonRecord | null>(null)

  async function load() {
    const records = await listAllCourses()
    setCourses(records)
    setCounts(await getCourseCounts(records.map((record) => record.id)))
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
                  <th>Pedidos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((course) => {
                  const meta = counts.get(course.id)
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
                      <td className="font-bold">—</td>
                      <td>
                        <div className="flex items-center gap-2">
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
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
                <span>Estrutura do Curso</span>
                <span>•</span>
                <span>Módulos, Aulas & Materiais</span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-brand-navy">
                {selectedCourseBundle?.course.title || 'Estrutura do Curso'}
              </DialogTitle>
              <DialogDescription>
                Selecione uma aula para gerenciar seus materiais didáticos (PDFs, planilhas Excel,
                links).
              </DialogDescription>
            </DialogHeader>

            {loadingStructure ? (
              <div className="flex items-center justify-center py-12 text-brand-muted">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-brand-orange" />
                Carregando estrutura…
              </div>
            ) : !selectedCourseBundle?.modules.length ? (
              <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                Nenhum módulo cadastrado para este curso.
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {selectedCourseBundle.modules.map((mod, modIdx) => (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-brand-border bg-brand-surface p-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                          Módulo {modIdx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-brand-navy">{mod.title}</h3>
                      </div>
                      <span className="text-xs text-brand-muted font-semibold">
                        {mod.lessons.length} {mod.lessons.length === 1 ? 'aula' : 'aulas'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {mod.lessons.map((lesson, lIdx) => (
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
                            <div className="mt-1 flex items-center gap-3 text-xs text-brand-muted pl-8">
                              <span>{lesson.duration_min} min</span>
                              <span>•</span>
                              <span>{lesson.is_free ? 'Degustação grátis' : 'Exclusiva'}</span>
                              <span>•</span>
                              <span className="capitalize">{lesson.situacao}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:self-center">
                            <Button
                              size="sm"
                              className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                              onClick={() => setManagingLessonMaterials(lesson)}
                            >
                              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                              Gerenciar Materiais
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

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
