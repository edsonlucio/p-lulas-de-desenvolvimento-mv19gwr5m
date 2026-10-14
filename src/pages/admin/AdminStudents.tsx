import { useEffect, useMemo, useState } from 'react'
import { ArrowDownAZ, Award, Search, Sparkles, UsersRound } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLevel } from '@/lib/gamification'
import pb from '@/lib/pocketbase/client'
import type { EnrollmentRecord, UserRecord } from '@/lib/types'
import { listStudents } from '@/services/admin'

export default function AdminStudents() {
  const [students, setStudents] = useState<UserRecord[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recentes')
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
