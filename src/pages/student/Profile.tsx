import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Award,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Crown,
  KeyRound,
  LoaderCircle,
  Mail,
  Medal,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getLevel } from '@/lib/gamification'
import pb from '@/lib/pocketbase/client'
import type { PointsLedgerRecord, PointsReason } from '@/lib/types'
import { listPoints } from '@/services/student'

const reasonLabels: Record<PointsReason, string> = {
  boas_vindas: 'Boas-vindas',
  aula_concluida: 'Aula concluída',
  modulo_concluido: 'Módulo concluído',
  curso_concluido: 'Curso concluído',
  compra: 'Compra de curso',
}
const reasonIcons: Record<PointsReason, typeof Star> = {
  boas_vindas: Sparkles,
  aula_concluida: BookOpenCheck,
  modulo_concluido: Medal,
  curso_concluido: Crown,
  compra: Star,
}

export default function Profile() {
  const { user, refreshUser, logout } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(
    location.hash === '#seguranca'
      ? 'seguranca'
      : location.hash === '#trilha'
        ? 'trilha'
        : 'perfil',
  )
  const [name, setName] = useState(user?.name || '')
  const [newEmail, setNewEmail] = useState('')
  const [ledger, setLedger] = useState<PointsLedgerRecord[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwords, setPasswords] = useState({ old: '', password: '', confirm: '' })
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (location.hash === '#seguranca') setActiveTab('seguranca')
    else if (location.hash === '#trilha') setActiveTab('trilha')
  }, [location.hash])

  useEffect(() => {
    if (user) void listPoints(user.id).then(setLedger)
  }, [user])
  useEffect(() => {
    if (!avatarFile) return
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])
  const avatarUrl =
    avatarPreview || (user?.avatar ? pb.files.getURL(user, user.avatar, { thumb: '200x200' }) : '')
  const level = getLevel(user?.points || 0)
  const initials =
    user?.name
      ?.split(' ')
      .map((item) => item[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PD'
  const achievements = useMemo(
    () => [
      { title: 'Primeiro passo', active: (user?.points || 0) >= 100 },
      { title: 'Explorador', active: (user?.points || 0) >= 150 },
      {
        title: 'Módulo completo',
        active: ledger.some((item) => item.reason === 'modulo_concluido'),
      },
      { title: 'Curso completo', active: ledger.some((item) => item.reason === 'curso_concluido') },
    ],
    [ledger, user?.points],
  )
  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (avatarFile && avatarFile.size > 2 * 1024 * 1024)
      return toast({ title: 'A imagem deve ter no máximo 2 MB', variant: 'destructive' })
    setSaving(true)
    try {
      const data = new FormData()
      data.set('name', name)
      if (avatarFile) data.set('avatar', avatarFile)
      await pb.collection('users').update(user.id, data)
      await refreshUser()
      toast({ title: 'Perfil atualizado' })
    } catch {
      toast({ title: 'Não foi possível atualizar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }
  async function requestEmail(e: FormEvent) {
    e.preventDefault()
    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail))
      return toast({ title: 'Informe um e-mail válido', variant: 'destructive' })
    try {
      await pb.collection('users').requestEmailChange(newEmail)
      setEmailSent(true)
    } catch {
      toast({ title: 'Não foi possível enviar a confirmação', variant: 'destructive' })
    }
  }
  async function changePassword(e: FormEvent) {
    e.preventDefault()
    if (!user || passwords.password.length < 8 || passwords.password !== passwords.confirm)
      return toast({ title: 'Revise as novas senhas', variant: 'destructive' })
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: passwords.old,
        password: passwords.password,
        passwordConfirm: passwords.confirm,
      })
      toast({ title: 'Senha atualizada' })
      setPasswords({ old: '', password: '', confirm: '' })
    } catch {
      toast({ title: 'A senha atual não confere', variant: 'destructive' })
    }
  }
  if (!user) return null
  return (
    <div className="route-page py-10 sm:py-14">
      <div className="container-site">
        <div className="grid gap-7 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-5">
            <div className="surface-card p-6 text-center">
              <div className="relative mx-auto w-fit">
                <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-brand-orange text-2xl font-extrabold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-brand-navy text-white shadow-lg">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <h1 className="mt-5 text-xl font-extrabold text-brand-navy">{user.name}</h1>
              <p className="mt-1 text-xs text-brand-muted">{user.email}</p>
              <span
                className="mt-4 inline-flex rounded-full px-4 py-1.5 text-xs font-extrabold"
                style={{ backgroundColor: `${level.color}18`, color: level.color }}
              >
                {level.name} · {user.points || 0} pts
              </span>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-brand-subtle">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${level.progress}%`, backgroundColor: level.color }}
                />
              </div>
              {level.next && (
                <p className="mt-2 text-[11px] text-brand-muted">
                  {level.remaining} pontos para {level.next.name}
                </p>
              )}
            </div>
            <div className="surface-card p-5">
              <h2 className="text-sm font-extrabold text-brand-navy">Conquistas</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {achievements.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-xl p-3 text-center ${item.active ? 'bg-amber-50 text-amber-600' : 'bg-brand-subtle text-brand-muted/40'}`}
                  >
                    <Award className="mx-auto h-5 w-5" />
                    <p className="mt-2 text-[10px] font-extrabold">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
          <main>
            <div className="mb-7">
              <span className="eyebrow">
                <UserRound className="h-4 w-4" /> Minha conta
              </span>
              <h1 className="section-title mt-3">Perfil e trilha</h1>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 h-auto flex-wrap rounded-2xl bg-white p-1.5 shadow-card">
                <TabsTrigger value="perfil" className="rounded-xl px-5 py-2.5">
                  Perfil
                </TabsTrigger>
                <TabsTrigger value="seguranca" className="rounded-xl px-5 py-2.5">
                  Segurança
                </TabsTrigger>
                <TabsTrigger value="trilha" className="rounded-xl px-5 py-2.5">
                  Minha trilha
                </TabsTrigger>
              </TabsList>
              <TabsContent value="perfil">
                <div className="surface-card p-6 sm:p-8">
                  <h2 className="text-xl font-extrabold text-brand-navy">Informações pessoais</h2>
                  <form onSubmit={saveProfile} className="mt-6 space-y-5">
                    <div>
                      <label className="form-label">Nome</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="form-label">E-mail atual</label>
                      <Input
                        value={user.email}
                        disabled
                        className="h-12 rounded-xl bg-brand-subtle"
                      />
                    </div>
                    <p className="text-xs text-brand-muted">Avatar JPG, PNG ou WebP de até 2 MB.</p>
                    <Button
                      disabled={saving}
                      className="pill-button bg-brand-orange hover:bg-brand-orange-dark"
                    >
                      {saving ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar alterações
                    </Button>
                  </form>
                  <div className="my-8 h-px bg-brand-border" />
                  <h2 className="text-xl font-extrabold text-brand-navy">Alterar e-mail</h2>
                  {emailSent ? (
                    <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      Enviamos a confirmação para o novo endereço.
                    </div>
                  ) : (
                    <form onSubmit={requestEmail} className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="novo@email.com"
                        className="h-12 flex-1 rounded-xl"
                      />
                      <Button variant="outline" className="pill-button h-12">
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar confirmação
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="seguranca">
                <div className="surface-card p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold text-brand-navy">Alterar senha</h2>
                      <p className="text-sm text-brand-muted">
                        Proteja sua conta com uma senha exclusiva.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={changePassword} className="mt-7 max-w-lg space-y-5">
                    <div>
                      <label className="form-label">Senha atual</label>
                      <Input
                        type="password"
                        value={passwords.old}
                        onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="form-label">Nova senha</label>
                      <Input
                        type="password"
                        value={passwords.password}
                        onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="form-label">Confirmar nova senha</label>
                      <Input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <Button className="pill-button bg-brand-orange hover:bg-brand-orange-dark">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Atualizar senha
                    </Button>
                  </form>
                </div>
              </TabsContent>
              <TabsContent value="trilha">
                <div id="trilha" className="surface-card p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-brand-navy">
                        Histórico de pontos
                      </h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        Cada ação conta uma parte da sua evolução.
                      </p>
                    </div>
                    <span className="text-2xl font-extrabold text-brand-orange">
                      {user.points || 0} pts
                    </span>
                  </div>
                  <div className="mt-7 space-y-3">
                    {ledger.map((item) => {
                      const Icon = reasonIcons[item.reason]
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 rounded-xl border border-brand-border p-4"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-brand-navy">
                              {reasonLabels[item.reason]}
                            </p>
                            <p className="truncate text-xs text-brand-muted">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <strong
                              className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}
                            >
                              {item.amount >= 0 ? '+' : ''}
                              {item.amount}
                            </strong>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                              {new Date(item.created).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
