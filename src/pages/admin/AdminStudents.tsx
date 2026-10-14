import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownAZ,
  Award,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useToast } from '@/hooks/use-toast'
import { getLevel } from '@/lib/gamification'
import pb from '@/lib/pocketbase/client'
import type { EnrollmentRecord, UserRecord } from '@/lib/types'
import { changeStudentPassword, listStudents } from '@/services/admin'

export default function AdminStudents() {
  const { toast } = useToast()
  const [students, setStudents] = useState<UserRecord[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recentes')

  // Modal de alterar senha do aluno
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  useEffect(() => {
    Promise.all([
      listStudents(),
      pb.collection<EnrollmentRecord>('enrollments').getFullList(),
    ]).then(([users, rows]) => {
      setStudents(users)
      setEnrollments(rows)
    })
  }, [])
  const visible = useMemo(
    () =>
      students
        .filter((student) =>
          `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'pontos'
            ? b.points - a.points
            : sort === 'nome'
              ? a.name.localeCompare(b.name)
              : b.created.localeCompare(a.created),
        ),
    [query, sort, students],
  )
  return (
    <div className="route-page py-10">
      <div className="container-site">
        <span className="eyebrow">
          <Sparkles className="h-4 w-4" /> Comunidade
        </span>
        <h1 className="section-title mt-3">Alunos</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Acompanhe quem está evoluindo com a Pílulas.
        </p>
        <div className="surface-card mt-8 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-brand-border p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail…"
                className="rounded-full pl-11"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="rounded-full sm:w-48">
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="nome">Nome A–Z</SelectItem>
                <SelectItem value="pontos">Mais pontos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Nível</th>
                  <th>Pontos</th>
                  <th>Cursos</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((student) => {
                  const level = getLevel(student.points)
                  const avatar = student.avatar
                    ? pb.files.getURL(student, student.avatar, { thumb: '80x80' })
                    : ''
                  return (
                    <tr key={student.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatar} />
                            <AvatarFallback className="bg-brand-orange text-xs font-extrabold text-white">
                              {student.name
                                .split(' ')
                                .map((item) => item[0])
                                .slice(0, 2)
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <strong className="block text-brand-navy">{student.name}</strong>
                            <span className="text-xs text-brand-muted">{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-extrabold"
                          style={{ backgroundColor: `${level.color}16`, color: level.color }}
                        >
                          {level.name}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-2 font-extrabold text-brand-navy">
                          <Award className="h-4 w-4 text-brand-orange" />
                          {student.points}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <UsersRound className="h-4 w-4 text-brand-muted" />
                          {
                            enrollments.filter(
                              (item) => item.user === student.id && item.situacao === 'ativa',
                            ).length
                          }
                        </span>
                      </td>
                      <td className="text-brand-muted">
                        {new Date(student.created).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-brand-border hover:border-brand-orange hover:text-brand-orange"
                          onClick={() => {
                            setPasswordTarget(student)
                            setNewPassword('')
                            setConfirmPassword('')
                          }}
                        >
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                          Alterar senha
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para Alterar Senha do Aluno */}
        <Dialog open={!!passwordTarget} onOpenChange={(open) => !open && setPasswordTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
                <ShieldCheck className="h-4 w-4" />
                <span>Gestão de Acesso</span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-brand-navy">
                Alterar senha do aluno
              </DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{passwordTarget?.name}</strong> (
                {passwordTarget?.email}).
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={async (e: FormEvent) => {
                e.preventDefault()
                if (!passwordTarget) return
                if (newPassword.length < 6) {
                  return toast({
                    title: 'Senha muito curta',
                    description: 'A nova senha deve ter no mínimo 6 caracteres.',
                    variant: 'destructive',
                  })
                }
                if (newPassword !== confirmPassword) {
                  return toast({
                    title: 'Senhas não conferem',
                    description: 'A confirmação deve ser idêntica à nova senha.',
                    variant: 'destructive',
                  })
                }

                setChangingPassword(true)
                try {
                  const res = await changeStudentPassword(passwordTarget.id, newPassword)
                  toast({
                    title: 'Senha alterada com sucesso',
                    description: res.message || `A senha de ${passwordTarget.name} foi atualizada.`,
                  })
                  setPasswordTarget(null)
                  setNewPassword('')
                  setConfirmPassword('')
                } catch (err: unknown) {
                  const errMessage =
                    (err as { data?: { message?: string }; message?: string })?.data?.message ||
                    (err as Error)?.message ||
                    'Não foi possível atualizar a senha.'
                  toast({
                    title: 'Erro ao alterar senha',
                    description: errMessage,
                    variant: 'destructive',
                  })
                } finally {
                  setChangingPassword(false)
                }
              }}
              className="mt-3 space-y-4"
            >
              <div>
                <Label htmlFor="student-new-password">Nova senha (mínimo 6 caracteres)</Label>
                <Input
                  id="student-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label htmlFor="student-confirm-password">Confirmar nova senha</Label>
                <Input
                  id="student-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 rounded-xl"
                  required
                />
              </div>

              <div className="rounded-xl bg-brand-subtle p-3 text-xs text-brand-muted">
                Dica: O aluno poderá entrar imediatamente com esta nova senha e alterá-la depois em
                sua área de perfil.
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPasswordTarget(null)}
                  disabled={changingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
                >
                  {changingPassword && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar nova senha
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
