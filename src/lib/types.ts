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
  kiwify_checkout_url?: string
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
  transcript?: string
  transcricao?: string
}

export interface SearchChunkRecord extends RecordModel {
  course: string
  lesson: string
  posicao: number
  texto: string
  caracteres?: number
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

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'falhou' | 'expirado'

export interface OrderRecord extends RecordModel {
  user: string
  course: string
  amount: number
  method: 'pix' | 'cartao'
  status: OrderStatus
  paid_at?: string
  failed_at?: string
  expired_at?: string
  kiwify_order_id?: string
  kiwify_order_ref?: string
}

export interface WebhookConfig {
  name: string
  token: string
  is_active: boolean
  record_id?: string
  webhook_path: string
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

export type RewardCode = 'primeira_aula' | 'dedicado_7' | 'maratonista_30'

export interface RewardRecord extends RecordModel {
  user: string
  code: RewardCode
  title: string
  awarded_at: string
}

export interface PontuacaoRecord extends RecordModel {
  user: string
  points: number
  level: number
  streak_days: number
  last_activity_date: string
}

export interface CourseBundle {
  course: CourseRecord
  modules: Array<ModuleRecord & { lessons: LessonRecord[] }>
  lessonCount: number
  duration: number
}

export type SearchCitation = {
  lesson_id: string
  lesson_title: string
  module_title: string
  course_title: string
  course_slug: string
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

export type ClubMemberStatus = 'ativo' | 'inativo'
export type ClubCardStatus = 'rascunho' | 'agendado' | 'enviado'

export interface ClubMemberRecord extends RecordModel {
  user: string
  joined_at: string
  status: ClubMemberStatus
  notes?: string
  expand?: {
    user?: UserRecord
  }
}

export interface ClubDailyCardRecord extends RecordModel {
  date: string
  title?: string
  pages_from?: number
  pages_to?: number
  pergunta: string
  resumo: string
  provocacao: string
  status: ClubCardStatus
}
