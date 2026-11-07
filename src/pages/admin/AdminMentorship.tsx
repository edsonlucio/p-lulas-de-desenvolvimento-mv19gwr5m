import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  Layers,
  Plus,
  Save,
  Trash2,
  Video,
  UsersRound,
} from 'lucide-react'

import { LoadingScreen } from '@/components/LoadingScreen'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { MentorshipProductRecord, MentorshipSessionRecord } from '@/lib/types'
import {
  createMentorshipSession,
  deleteMentorshipSession,
  getMentorshipProduct,
  listMentorshipSessions,
  updateMentorshipProduct,
  updateMentorshipSession,
} from '@/services/mentorship'

export default function AdminMentorship() {
  const { toast } = useToast()
  const [product, setProduct] = useState<MentorshipProductRecord | null>(null)
  const [sessions, setSessions] = useState<MentorshipSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingProduct, setSavingProduct] = useState(false)

  // Edit product state
  const [productForm, setProductForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    price: 0,
    active: true,
    weekly_day: '',
    weekly_time: '',
    meeting_link: '',
    whatsapp_support: '',
  })

  // Modal de Sessão
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<MentorshipSessionRecord | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    cohort_name: 'Turma Semanal',
    is_next: false,
    status: 'scheduled' as MentorshipSessionRecord['status'],
    meeting_url: '',
    recording_url: '',
    application_material_url: '',
    application_material_title: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [prod, sess] = await Promise.all([
        getMentorshipProduct(),
        listMentorshipSessions(false),
      ])
      if (prod) {
        setProduct(prod)
        setProductForm({
          title: prod.title || '',
          subtitle: prod.subtitle || '',
          description: prod.description || '',
          price: prod.price || 0,
          active: prod.active ?? true,
          weekly_day: prod.weekly_day || '',
          weekly_time: prod.weekly_time || '',
          meeting_link: prod.meeting_link || '',
          whatsapp_support: prod.whatsapp_support || '',
        })
      }
      setSessions(sess)
    } catch {
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações de mentoria.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return
    setSavingProduct(true)
    try {
      const updated = await updateMentorshipProduct(product.id, {
        title: productForm.title,
        subtitle: productForm.subtitle,
        description: productForm.description,
        price: Number(productForm.price),
        active: productForm.active,
        weekly_day: productForm.weekly_day,
        weekly_time: productForm.weekly_time,
        meeting_link: productForm.meeting_link,
        whatsapp_support: productForm.whatsapp_support,
      })
      setProduct(updated)
      toast({
        title: 'Configurações salvas',
        description: 'O produto de mentoria foi atualizado com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingProduct(false)
    }
  }

  function openCreateSession() {
    setEditingSession(null)
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 7)
    nextDate.setHours(20, 0, 0, 0)
    setSessionForm({
      title: '',
      description: '',
      scheduled_at: nextDate.toISOString().slice(0, 16),
      cohort_name: 'Turma Semanal',
      is_next: false,
      status: 'scheduled',
      meeting_url: product?.meeting_link || '',
      recording_url: '',
      application_material_url: '',
      application_material_title: 'Material Prático em PDF',
    })
    setSessionModalOpen(true)
  }

  function openEditSession(s: MentorshipSessionRecord) {
    setEditingSession(s)
    let formattedDate = ''
    try {
      formattedDate = new Date(s.scheduled_at).toISOString().slice(0, 16)
    } catch {
      formattedDate = ''
    }
    setSessionForm({
      title: s.title,
      description: s.description || '',
      scheduled_at: formattedDate,
      cohort_name: s.cohort_name || 'Turma Semanal',
      is_next: s.is_next,
      status: s.status,
      meeting_url: s.meeting_url || '',
      recording_url: s.recording_url || '',
      application_material_url: s.application_material_url || '',
      application_material_title: s.application_material_title || '',
    })
    setSessionModalOpen(true)
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault()
    setSavingSession(true)
    try {
      const payload = {
        title: sessionForm.title,
        description: sessionForm.description,
        scheduled_at: new Date(sessionForm.scheduled_at).toISOString(),
        cohort_name: sessionForm.cohort_name,
        is_next: sessionForm.is_next,
        status: sessionForm.status,
        meeting_url: sessionForm.meeting_url,
        recording_url: sessionForm.recording_url,
        application_material_url: sessionForm.application_material_url,
        application_material_title: sessionForm.application_material_title,
      }

      if (editingSession) {
        await updateMentorshipSession(editingSession.id, payload)
        toast({ title: 'Encontro atualizado com sucesso!' })
      } else {
        await createMentorshipSession(payload)
        toast({ title: 'Encontro criado com sucesso!' })
      }
      setSessionModalOpen(false)
      loadData()
    } catch {
      toast({
        title: 'Erro ao salvar encontro',
        description: 'Verifique se a data e o título foram preenchidos corretamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingSession(false)
    }
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Deseja excluir este encontro da mentoria?')) return
    try {
      await deleteMentorshipSession(id)
      toast({ title: 'Encontro excluído' })
      loadData()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  if (loading) return <LoadingScreen label="Carregando painel de Mentorias…" />

  return (
    <div className="route-page bg-brand-sand py-10">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              <UsersRound className="h-4 w-4" /> Gestão de Mentorias
            </span>
            <h1 className="section-title mt-3">Mentorias & Turmas Semanais</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Configure o valor da mentoria, o próximo encontro semanal em destaque e as gravações
              anteriores.
            </p>
          </div>
          <Button
            onClick={openCreateSession}
            className="rounded-full bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Encontro Semanal
          </Button>
        </div>

        {/* Bloco 1: Configuração do Produto de Mentoria */}
        <section className="surface-card mt-8 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <DollarSign className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-extrabold text-brand-navy">Preço & Parâmetros da Mentoria</h2>
              <p className="text-xs text-brand-muted">
                Valores e informações exibidos na vitrine /mentorias e no checkout
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProduct} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-brand-navy">Título do Produto</Label>
              <Input
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border bg-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })
                }
                className="mt-1.5 rounded-xl border-brand-border bg-white font-bold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">Dia e Horário Semanal</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <Input
                  placeholder="Ex: Toda Terça-feira"
                  value={productForm.weekly_day}
                  onChange={(e) => setProductForm({ ...productForm, weekly_day: e.target.value })}
                  className="rounded-xl border-brand-border bg-white text-xs"
                />
                <Input
                  placeholder="Ex: 20h00 às 21h30"
                  value={productForm.weekly_time}
                  onChange={(e) => setProductForm({ ...productForm, weekly_time: e.target.value })}
                  className="rounded-xl border-brand-border bg-white text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-brand-navy">Subtítulo / Chamada</Label>
              <Input
                value={productForm.subtitle}
                onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-brand-navy">Descrição Completa</Label>
              <Textarea
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border bg-white"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">
                Link Padrão da Sala Virtual (Google Meet / Zoom)
              </Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={productForm.meeting_link}
                onChange={(e) => setProductForm({ ...productForm, meeting_link: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border bg-white text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">
                WhatsApp de Suporte aos Mentorados
              </Label>
              <Input
                placeholder="Ex: 84999999999"
                value={productForm.whatsapp_support}
                onChange={(e) =>
                  setProductForm({ ...productForm, whatsapp_support: e.target.value })
                }
                className="mt-1.5 rounded-xl border-brand-border bg-white text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button
                type="submit"
                disabled={savingProduct}
                className="rounded-full bg-brand-navy text-white hover:bg-brand-navy-dark"
              >
                <Save className="mr-2 h-4 w-4 text-brand-orange" />
                {savingProduct ? 'Salvando…' : 'Salvar Preço e Parâmetros'}
              </Button>
            </div>
          </form>
        </section>

        {/* Bloco 2: Lista de Encontros (Próximo em destaque e Anteriores com Gravação/Material) */}
        <section className="surface-card mt-8 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-brand-navy">
                  Encontros Semanais ({sessions.length})
                </h2>
                <p className="text-xs text-brand-muted">
                  Turmas semanais, gravações de encontros anteriores e materiais de aplicação
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                Nenhum encontro de mentoria cadastrado ainda. Clique em "Novo Encontro Semanal"
                acima.
              </div>
            ) : (
              sessions.map((s) => {
                const dateStr = new Date(s.scheduled_at).toLocaleString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-border bg-white p-5 lg:flex-row lg:items-center"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.is_next && (
                          <Badge className="bg-brand-orange text-white text-[10px] font-extrabold">
                            Próximo em Destaque
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            s.status === 'completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }
                        >
                          {s.status === 'completed' ? 'Concluído' : 'Agendado'}
                        </Badge>
                        <span className="text-xs font-bold text-brand-muted">{s.cohort_name}</span>
                      </div>

                      <h3 className="font-extrabold text-brand-navy text-base">{s.title}</h3>
                      {s.description && (
                        <p className="text-xs text-brand-muted line-clamp-2">{s.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-brand-muted">
                        <span className="flex items-center gap-1 font-semibold text-brand-navy">
                          <Clock className="h-3.5 w-3.5 text-brand-orange" /> {dateStr}
                        </span>
                        {s.recording_url && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <Video className="h-3.5 w-3.5" /> Gravação disponível
                          </span>
                        )}
                        {s.application_material_url && (
                          <span className="flex items-center gap-1 text-purple-700 font-bold">
                            <Download className="h-3.5 w-3.5" /> Material de aplicação
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSession(s)}
                        className="rounded-xl border-brand-border text-xs"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(s.id)}
                        className="rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Modal de Criação / Edição de Encontro */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-brand-navy">
              {editingSession ? 'Editar Encontro de Mentoria' : 'Novo Encontro Semanal'}
            </DialogTitle>
            <DialogDescription className="text-xs text-brand-muted">
              Preencha os detalhes do encontro semanal, data, link ao vivo, gravação e material de
              aplicação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSession} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-brand-navy">Título do Encontro</Label>
              <Input
                placeholder="Ex: Encontro #14 — Estruturação de Oferta Irresistível"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-brand-navy">Data e Horário</Label>
                <Input
                  type="datetime-local"
                  value={sessionForm.scheduled_at}
                  onChange={(e) => setSessionForm({ ...sessionForm, scheduled_at: e.target.value })}
                  className="mt-1.5 rounded-xl border-brand-border"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-brand-navy">Nome da Turma</Label>
                <Input
                  value={sessionForm.cohort_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, cohort_name: e.target.value })}
                  className="mt-1.5 rounded-xl border-brand-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-brand-navy">Status</Label>
                <select
                  value={sessionForm.status}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      status: e.target.value as MentorshipSessionRecord['status'],
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-brand-border bg-white px-3 text-xs"
                >
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs font-bold text-brand-navy cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sessionForm.is_next}
                    onChange={(e) => setSessionForm({ ...sessionForm, is_next: e.target.checked })}
                    className="h-4 w-4 rounded text-brand-orange"
                  />
                  Destacar como Próximo Encontro
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">Descrição dos Tópicos</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Validação do script de prospecção, precificação e diagnóstico ao vivo."
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">
                Link da Sala ao Vivo (Google Meet / Zoom)
              </Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={sessionForm.meeting_url}
                onChange={(e) => setSessionForm({ ...sessionForm, meeting_url: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border text-xs"
              />
            </div>

            <div className="border-t border-brand-border pt-3">
              <h4 className="text-xs font-extrabold text-brand-navy mb-2">
                Pós-Encontro: Gravação & Material
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-brand-muted">
                    Link da Gravação (YouTube não listado ou Vimeo)
                  </Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={sessionForm.recording_url}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, recording_url: e.target.value })
                    }
                    className="mt-1 rounded-xl border-brand-border text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-brand-muted">
                      Link do Material de Aplicação
                    </Label>
                    <Input
                      placeholder="https://drive.google.com/... ou link de download"
                      value={sessionForm.application_material_url}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          application_material_url: e.target.value,
                        })
                      }
                      className="mt-1 rounded-xl border-brand-border text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-brand-muted">
                      Título do Material
                    </Label>
                    <Input
                      placeholder="Ex: Planilha de Oferta + PDF de Aplicação"
                      value={sessionForm.application_material_title}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          application_material_title: e.target.value,
                        })
                      }
                      className="mt-1 rounded-xl border-brand-border text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSessionModalOpen(false)}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingSession}
                className="rounded-full bg-brand-orange text-white hover:bg-brand-orange-dark"
              >
                {savingSession ? 'Salvando…' : 'Salvar Encontro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
