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
    meeting_cadence: '',
    meeting_schedule: '',
    contact_whatsapp: '',
  })

  // Modal de Sessão
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<MentorshipSessionRecord | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    title: '',
    summary: '',
    date: '',
    cohort_name: 'Turma Semanal',
    status: 'proximo' as MentorshipSessionRecord['status'],
    live_meeting_url: '',
    video_url: '',
    material_url: '',
    material_title: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [prod, sess] = await Promise.all([getMentorshipProduct(), listMentorshipSessions()])
      if (prod) {
        setProduct(prod)
        setProductForm({
          title: prod.title || '',
          subtitle: prod.subtitle || '',
          description: prod.description || '',
          price: prod.price || 0,
          active: prod.active ?? true,
          meeting_cadence: prod.meeting_cadence || '',
          meeting_schedule: prod.meeting_schedule || '',
          contact_whatsapp: prod.contact_whatsapp || '',
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
        meeting_cadence: productForm.meeting_cadence,
        meeting_schedule: productForm.meeting_schedule,
        contact_whatsapp: productForm.contact_whatsapp,
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
      summary: '',
      date: nextDate.toISOString().slice(0, 16),
      cohort_name: 'Turma Semanal',
      status: 'proximo',
      live_meeting_url: '',
      video_url: '',
      material_url: '',
      material_title: 'Material Prático em PDF',
    })
    setSessionModalOpen(true)
  }

  function openEditSession(s: MentorshipSessionRecord) {
    setEditingSession(s)
    let formattedDate = ''
    try {
      formattedDate = new Date(s.date).toISOString().slice(0, 16)
    } catch {
      formattedDate = ''
    }
    setSessionForm({
      title: s.title,
      summary: s.summary || '',
      date: formattedDate,
      cohort_name: s.cohort_name || 'Turma Semanal',
      status: s.status,
      live_meeting_url: s.live_meeting_url || '',
      video_url: s.video_url || '',
      material_url: s.material_url || '',
      material_title: s.material_title || '',
    })
    setSessionModalOpen(true)
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault()
    setSavingSession(true)
    try {
      const payload: Partial<MentorshipSessionRecord> = {
        title: sessionForm.title,
        summary: sessionForm.summary,
        date: new Date(sessionForm.date).toISOString(),
        cohort_name: sessionForm.cohort_name,
        status: sessionForm.status,
        live_meeting_url: sessionForm.live_meeting_url,
        video_url: sessionForm.video_url,
        material_url: sessionForm.material_url,
        material_title: sessionForm.material_title,
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
              <Label className="text-xs font-bold text-brand-navy">Cadência dos Encontros</Label>
              <Input
                placeholder="Ex: Uma turma por semana"
                value={productForm.meeting_cadence}
                onChange={(e) =>
                  setProductForm({ ...productForm, meeting_cadence: e.target.value })
                }
                className="mt-1.5 rounded-xl border-brand-border bg-white text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-brand-navy">Horário Oficial / Agenda</Label>
              <Input
                placeholder="Ex: Toda terça-feira às 20h00 (horário de Brasília)"
                value={productForm.meeting_schedule}
                onChange={(e) =>
                  setProductForm({ ...productForm, meeting_schedule: e.target.value })
                }
                className="mt-1.5 rounded-xl border-brand-border bg-white text-xs"
              />
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

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-brand-navy">
                Link do Grupo / Contato de WhatsApp dos Mentorados
              </Label>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                value={productForm.contact_whatsapp}
                onChange={(e) =>
                  setProductForm({ ...productForm, contact_whatsapp: e.target.value })
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
                const dateStr = s.date
                  ? new Date(s.date).toLocaleString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Data não informada'
                return (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-border bg-white p-5 lg:flex-row lg:items-center"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.status === 'proximo' && (
                          <Badge className="bg-brand-orange text-white text-[10px] font-extrabold">
                            Próximo em Destaque
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            s.status === 'realizado'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : s.status === 'cancelado'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                          }
                        >
                          {s.status === 'realizado'
                            ? 'Realizado'
                            : s.status === 'cancelado'
                              ? 'Cancelado'
                              : 'Próximo'}
                        </Badge>
                        <span className="text-xs font-bold text-brand-muted">{s.cohort_name}</span>
                      </div>

                      <h3 className="font-extrabold text-brand-navy text-base">{s.title}</h3>
                      {s.summary && (
                        <p className="text-xs text-brand-muted line-clamp-2">{s.summary}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-brand-muted">
                        <span className="flex items-center gap-1 font-semibold text-brand-navy">
                          <Clock className="h-3.5 w-3.5 text-brand-orange" /> {dateStr}
                        </span>
                        {s.video_url && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <Video className="h-3.5 w-3.5" /> Gravação disponível
                          </span>
                        )}
                        {s.material_url && (
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
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
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

            <div>
              <Label className="text-xs font-bold text-brand-navy">Status do Encontro</Label>
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
                <option value="proximo">Próximo (Em destaque)</option>
                <option value="realizado">Realizado (Gravação e Material liberados)</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">Resumo dos Tópicos</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Validação do script de prospecção, precificação e diagnóstico ao vivo."
                value={sessionForm.summary}
                onChange={(e) => setSessionForm({ ...sessionForm, summary: e.target.value })}
                className="mt-1.5 rounded-xl border-brand-border text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-brand-navy">
                Link da Sala ao Vivo (Google Meet / Zoom)
              </Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={sessionForm.live_meeting_url}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, live_meeting_url: e.target.value })
                }
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
                    Link da Gravação (YouTube ou Vimeo)
                  </Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={sessionForm.video_url}
                    onChange={(e) => setSessionForm({ ...sessionForm, video_url: e.target.value })}
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
                      value={sessionForm.material_url}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          material_url: e.target.value,
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
                      value={sessionForm.material_title}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          material_title: e.target.value,
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
