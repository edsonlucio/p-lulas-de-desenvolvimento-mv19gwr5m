import type { RecordModel } from 'pocketbase'

export type UserRole = 'student' | 'admin'
export type CourseCategory = 'vendas' | 'lideranca' | 'marketing' | 'motivacional'

export interface UserRecord extends RecordModel {
  name: string
  email: string
  avatar: string
  verified: boolean
  role: UserRole
  points: number
}

export interface CourseRecord extends RecordModel {
  title: string
  slug: string
  subtitle: string
  description: string
  category: CourseCategory
  price: number
  thumbnail: string
  published: boolean
}

export interface ModuleRecord extends RecordModel {
  course: string
  title: string
  position: number
}

export interface LessonRecord extends RecordModel {
  module: string
  title: string
  description: string
  video_url: string
  duration_min: number
  position: number
  is_free: boolean
  situacao: 'ativo' | 'inativo'
  transcript: string
}

export type MaterialType = 'arquivo' | 'link'

export interface LessonMaterialRecord extends RecordModel {
  lesson: string
  titulo: string
  tipo: MaterialType
  arquivo?: string
  url?: string
  descricao?: string
  sort: number
  situacao?: 'ativo' | 'inativo'
}

export interface EnrollmentRecord extends RecordModel {
  user: string
  course: string
  situacao: 'ativa' | 'cancelada'
}

export interface LessonProgressRecord extends RecordModel {
  user: string
  lesson: string
  course: string
  enrollment: string
  completed: boolean
  completed_at: string
  current_minute: number
}

export interface OrderRecord extends RecordModel {
  user: string
  course: string
  amount: number
  method: 'pix' | 'cartao'
  status: 'pending' | 'paid' | 'cancelled'
}

export type PointsReason =
  | 'boas_vindas'
  | 'aula_concluida'
  | 'modulo_concluido'
  | 'curso_concluido'
  | 'compra'

export interface PointsLedgerRecord extends RecordModel {
  user: string
  amount: number
  reason: PointsReason
  description: string
  lesson: string
}

export interface CourseBundle {
  course: CourseRecord
  modules: Array<ModuleRecord & { lessons: LessonRecord[] }>
  lessonCount: number
  duration: number
}

export interface SearchResult {
  id: string
  title: string
  description: string
  duration_min: number
  video_url: string
  snippet: string
  distance: number | null
  module: { id: string; title: string }
  course: { id: string; title: string; slug: string }
}
