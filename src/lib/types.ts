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
  whatsapp?: string
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
  apostila?: string
  quiz_ativo?: boolean
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
  ideia_central?: string
  topico_1?: string
  topico_2?: string
  topico_3?: string
  exercicio?: string
}

export type QuizAlternativeKey = 'a' | 'b' | 'c' | 'd'

export interface QuizQuestionRecord extends RecordModel {
  module: string
  pergunta: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  correta: QuizAlternativeKey
  position: number
  feedback?: string
}

export interface QuizAttemptRecord extends RecordModel {
  user: string
  module: string
  course: string
  respostas: Record<string, QuizAlternativeKey> | null
  acertos: number
  total: number
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

export interface ComboRecord extends RecordModel {
  title: string
  slug: string
  description?: string
  courses: string[]
  price: number
  original_price?: number
  active: boolean
  thumbnail?: string
  expand?: {
    courses?: CourseRecord[]
  }
}

export interface EmailLogRecord extends RecordModel {
  recipient: string
  subject: string
  content?: string
  status: string
  order_id?: string
  error?: string
}

export interface OrderRecord extends RecordModel {
  user: string
  course?: string
  combo?: string
  mentorship?: string
  subscription_plan?: string
  customer_name?: string
  customer_email?: string
  customer_whatsapp?: string
  amount: number
  method: 'pix' | 'cartao'
  status: OrderStatus
  paid_at?: string
  failed_at?: string
  expired_at?: string
  kiwify_order_id?: string
  kiwify_order_ref?: string
  expand?: {
    user?: UserRecord
    course?: CourseRecord
    combo?: ComboRecord
    mentorship?: MentorshipProgramRecord
    subscription_plan?: SubscriptionPlanRecord
  }
}

export interface MentorshipProgramRecord extends RecordModel {
  title: string
  slug: string
  subtitle?: string
  description?: string
  price: number
  original_price?: number
  meeting_cadence?: string
  meeting_schedule?: string
  active: boolean
  contact_whatsapp?: string
  features_list?: string[]
}

export type MentorshipMeetingStatus = 'proximo' | 'realizado' | 'cancelado'

export interface MentorshipMeetingRecord extends RecordModel {
  title: string
  date: string
  status: MentorshipMeetingStatus
  summary?: string
  video_url?: string
  live_meeting_url?: string
  material_title?: string
  material_url?: string
  material_file?: string
  cohort_name?: string
  position?: number
}

export type MentorshipEnrollmentStatus = 'ativa' | 'expirada' | 'cancelada'

export interface MentorshipEnrollmentRecord extends RecordModel {
  user: string
  program?: string
  order?: string
  status: MentorshipEnrollmentStatus
  expires_at?: string
  notes?: string
  expand?: {
    user?: UserRecord
    program?: MentorshipProgramRecord
  }
}

export type CourseWaitlistStatus = 'pendente' | 'contatado' | 'convertido' | 'matriculado'
export type MentorshipProductRecord = MentorshipProgramRecord
export type MentorshipSessionRecord = MentorshipMeetingRecord

export interface CourseWaitlistRecord extends RecordModel {
  name: string
  email: string
  whatsapp: string
  course: string
  user?: string
  source?: string
  notes?: string
  status: CourseWaitlistStatus
  expand?: {
    user?: UserRecord
    course?: CourseRecord
  }
}

export type SubscriptionInterval = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused'

export interface SubscriptionPlanRecord extends RecordModel {
  name: string
  slug: string
  interval: SubscriptionInterval
  price: number
  original_price?: number
  discount_percentage?: number
  description?: string
  active: boolean
}

export interface SubscriptionRecord extends RecordModel {
  user: string
  plan: string
  status: SubscriptionStatus
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  order_id?: string
  expand?: {
    user?: UserRecord
    plan?: SubscriptionPlanRecord
  }
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
  whatsapp?: string
  name?: string
  email?: string
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

export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export interface CommunityTopicRecord extends RecordModel {
  user: string
  course?: string
  title: string
  content: string
  status: ModerationStatus
  moderation_notes?: string
  moderated_at?: string
  pinned?: boolean
  replies_count?: number
  expand?: {
    user?: UserRecord
    course?: CourseRecord
  }
}

export interface CommunityReplyRecord extends RecordModel {
  topic: string
  user: string
  content: string
  status: ModerationStatus
  moderation_notes?: string
  moderated_at?: string
  expand?: {
    user?: UserRecord
    topic?: CommunityTopicRecord
  }
}

export interface TutorQueryRecord extends RecordModel {
  user?: string
  query: string
  category?: string
  is_student?: boolean
  expand?: {
    user?: UserRecord
  }
}
