import { useState } from 'react'
import { AlertCircle, Check, Edit3, Layers, Package, Plus, Trash2 } from 'lucide-react'

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
import type { ComboRecord, CourseRecord } from '@/lib/types'
import { createCombo, deleteCombo, updateCombo } from '@/services/combos'
import { formatPrice } from '@/services/courses'

interface AdminCombosSectionProps {
  combos: ComboRecord[]
  courses: CourseRecord[]
  onRefresh: () => Promise<void>
}

export function AdminCombosSection({ combos, courses, onRefresh }: AdminCombosSectionProps) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ComboRecord | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    price: '497',
    active: true,
    selectedCourses: [] as string[],
  })

  function openCreate() {
    setEditingCombo(null)
    // Pre-selecionar os 3 primeiros cursos se existirem
    const initialCourses = courses.slice(0, 3).map((c) => c.id)
    const sum = courses
      .filter((c) => initialCourses.includes(c.id))
      .reduce((acc, c) => acc + (c.price || 0), 0)
    const suggestedPrice = Math.round(sum * 0.7) || 497

    setForm({
      title: '',
      slug: '',
      description: '',
      price: String(suggestedPrice),
      active: true,
      selectedCourses: initialCourses,
    })
    setModalOpen(true)
  }

  function openEdit(combo: ComboRecord) {
    setEditingCombo(combo)
    setForm({
      title: combo.title,
      slug: combo.slug,
      description: combo.description || '',
      price: String(combo.price),
      active: combo.active,
      selectedCourses: combo.courses || [],
    })
    setModalOpen(true)
  }

  function toggleCourseSelection(courseId: string) {
    setForm((prev) => {
      const exists = prev.selectedCourses.includes(courseId)
      if (exists) {
        return {
          ...prev,
          selectedCourses: prev.selectedCourses.filter((id) => id !== courseId),
        }
      }
      if (prev.selectedCourses.length >= 3) {
        toast({
          title: 'Limite atingido',
          description: 'Um combo reúne exatamente 3 cursos.',
          variant: 'destructive',
        })
        return prev
      }
      return {
        ...prev,
        selectedCourses: [...prev.selectedCourses, courseId],
      }
    })
  }

  const selectedCoursesList = courses.filter((c) => form.selectedCourses.includes(c.id))
  const calculatedSum = selectedCoursesList.reduce((acc, c) => acc + (c.price || 0), 0)
  const numericPrice = Number(form.price) || 0
  const calculatedDiscount = calculatedSum > numericPrice ? calculatedSum - numericPrice : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' })
      return
    }
    if (form.selectedCourses.length !== 3) {
      toast({
        title: 'Selecione 3 cursos',
        description: 'Um combo precisa reunir exatamente 3 cursos conforme a regra da plataforma.',
        variant: 'destructive',
      })
      return
    }
    if (numericPrice <= 0) {
      toast({ title: 'Preço inválido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const slugVal =
        form.slug.trim() ||
        form.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

      if (editingCombo) {
        await updateCombo(editingCombo.id, {
          title: form.title.trim(),
          slug: slugVal,
          description: form.description.trim(),
          courses: form.selectedCourses,
          price: numericPrice,
          original_price: calculatedSum,
          active: form.active,
        })
        toast({ title: 'Combo atualizado com sucesso!' })
      } else {
        await createCombo({
          title: form.title.trim(),
          slug: slugVal,
          description: form.description.trim(),
          courses: form.selectedCourses,
          price: numericPrice,
          original_price: calculatedSum,
          active: form.active,
        })
        toast({ title: 'Combo criado com sucesso!' })
      }
      setModalOpen(false)
      await onRefresh()
    } catch (err) {
      toast({
        title: 'Erro ao salvar combo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(combo: ComboRecord) {
    if (!window.confirm(`Deseja realmente excluir o combo "${combo.title}"?`)) return
    try {
      await deleteCombo(combo.id)
      toast({ title: 'Combo excluído' })
      await onRefresh()
    } catch {
      toast({ title: 'Erro ao excluir combo', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">
            <Package className="h-4 w-4" /> Ofertas Combinadas
          </span>
          <h2 className="section-title mt-2">Combos (3 em 1)</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Reúna 3 cursos com desconto progressivo. A matrícula libera os 3 cursos de uma vez na
            conta do aluno.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white self-start sm:self-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Combo
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => {
          const comboCourses =
            combo.expand?.courses || courses.filter((c) => combo.courses?.includes(c.id))
          const sumOriginal =
            combo.original_price || comboCourses.reduce((acc, c) => acc + (c.price || 0), 0)
          const discount = sumOriginal > combo.price ? sumOriginal - combo.price : 0

          return (
            <div
              key={combo.id}
              className={`rounded-2xl border p-6 shadow-sm transition ${
                combo.active
                  ? 'border-brand-border bg-white'
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-black uppercase text-brand-orange">
                  <Layers className="h-3.5 w-3.5" />3 cursos
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    combo.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {combo.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-black text-brand-navy">{combo.title}</h3>
              <p className="mt-1 text-xs text-brand-muted line-clamp-2">
                {combo.description || 'Sem descrição.'}
              </p>

              <div className="mt-4 rounded-xl border border-brand-border bg-brand-subtle/50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Cursos inclusos:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs font-medium text-brand-navy">
                  {comboCourses.map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5 truncate">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </li>
                  ))}
                  {comboCourses.length === 0 && (
                    <li className="text-gray-400">Nenhum curso associado</li>
                  )}
                </ul>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t border-brand-border pt-3">
                <div>
                  {sumOriginal > combo.price && (
                    <p className="text-xs text-brand-muted line-through">
                      De {formatPrice(sumOriginal)}
                    </p>
                  )}
                  <p className="text-xl font-black text-brand-orange">{formatPrice(combo.price)}</p>
                </div>
                {discount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                    -{formatPrice(discount)}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-brand-border pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => openEdit(combo)}
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => void handleDelete(combo)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}

        {combos.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
            Nenhum combo cadastrado ainda. Clique em &quot;Novo Combo&quot; para criar o primeiro.
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Combo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCombo ? 'Editar Combo' : 'Novo Combo (3 Cursos)'}</DialogTitle>
            <DialogDescription>
              Selecione exatamente 3 cursos para compor o combo e defina o valor com desconto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Título do Combo</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Ex: Combo Tríade de Alta Performance"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: editingCombo
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
                  className="mt-1.5"
                  placeholder="combo-triade-alta-performance"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                className="mt-1.5 min-h-20"
                placeholder="Breve resumo da oferta e dos benefícios de levar os 3 cursos juntos."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Cursos Inclusos (exatamente 3)</Label>
                <span className="text-xs font-bold text-brand-orange">
                  {form.selectedCourses.length} de 3 selecionados
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                Clique nos cursos abaixo para incluir ou remover da composição do combo:
              </p>

              <div className="mt-2.5 max-h-48 overflow-y-auto space-y-2 rounded-xl border border-brand-border p-3">
                {courses.map((course) => {
                  const selected = form.selectedCourses.includes(course.id)
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleCourseSelection(course.id)}
                      className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs font-semibold transition ${
                        selected
                          ? 'bg-brand-orange/10 border border-brand-orange/40 text-brand-navy'
                          : 'bg-white border border-brand-border/60 hover:bg-brand-subtle text-brand-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`grid h-4 w-4 place-items-center rounded border ${
                            selected
                              ? 'bg-brand-orange border-brand-orange text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="font-bold text-brand-navy">{course.title}</span>
                      </div>
                      <span className="text-brand-muted">{formatPrice(course.price)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Resumo de valores e economia */}
            <div className="rounded-xl border border-brand-orange/20 bg-orange-50/40 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-brand-muted">Soma dos 3 cursos:</span>
                  <p className="mt-0.5 text-lg font-bold text-brand-navy line-through">
                    {formatPrice(calculatedSum)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Preço do Combo (R$):</Label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1 h-9 bg-white"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-xs text-brand-muted">Economia do aluno:</span>
                  <p className="mt-0.5 text-lg font-black text-emerald-600">
                    {calculatedDiscount > 0 ? formatPrice(calculatedDiscount) : 'R$ 0,00'}
                  </p>
                </div>
              </div>
              {calculatedDiscount <= 0 && form.selectedCourses.length === 3 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Dica: defina um preço menor que {formatPrice(calculatedSum)} para dar desconto
                    real ao aluno.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-brand-border p-3">
              <div>
                <Label className="text-sm font-bold">Combo Ativo na Vitrine</Label>
                <p className="text-xs text-brand-muted">
                  Combos inativos ficam ocultos para os alunos.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="pill-button bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
              >
                {saving ? 'Salvando…' : editingCombo ? 'Salvar Alterações' : 'Criar Combo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
