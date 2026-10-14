import pb from '@/lib/pocketbase/client'
import type {
  CourseRecord,
  EnrollmentRecord,
  LessonProgressRecord,
  OrderRecord,
  UserRecord,
} from '@/lib/types'
import type { SearchHistoryRecord } from '@/services/search'

export async function getAdminSnapshot() {
  const [users, enrollments, orders, progress, allProgress] = await Promise.all([
    pb
      .collection<UserRecord>('users')
      .getFullList({ filter: 'role = "student"', sort: '-created' }),
    pb.collection<EnrollmentRecord>('enrollments').getFullList({ sort: '-created' }),
    pb.collection<OrderRecord>('orders').getFullList({ sort: '-created' }),
    pb
      .collection<LessonProgressRecord>('lesson_progress')
      .getFullList({ filter: 'completed = true' }),
    pb.collection<LessonProgressRecord>('lesson_progress').getFullList({ sort: '-updated' }),
  ])
  return { users, enrollments, orders, progress, allProgress }
}

export async function listSearches() {
  return pb
    .collection<SearchHistoryRecord>('search_history')
    .getList(1, 10, { sort: '-created', expand: 'user' })
}

export async function createCourse(data: FormData | Record<string, unknown>) {
  return pb.collection<CourseRecord>('courses').create(data)
}

export async function updateCourse(id: string, data: FormData | Record<string, unknown>) {
  return pb.collection<CourseRecord>('courses').update(id, data)
}

export async function listStudents() {
  return pb
    .collection<UserRecord>('users')
    .getFullList({ filter: 'role = "student"', sort: '-created' })
}

export async function listOrders() {
  return pb
    .collection<OrderRecord>('orders')
    .getFullList({ sort: '-created', expand: 'user,course' })
}

export async function createModule(courseId: string, title: string, position: number) {
  return pb.collection('modules').create({
    course: courseId,
    title,
    position,
  })
}

export async function updateModule(id: string, data: { title?: string; position?: number }) {
  return pb.collection('modules').update(id, data)
}

export async function deleteModule(id: string) {
  return pb.collection('modules').delete(id)
}

export async function reorderModules(updates: Array<{ id: string; position: number }>) {
  for (const item of updates) {
    await pb.collection('modules').update(item.id, { position: item.position })
  }
}

export async function createLesson(data: {
  module: string
  title: string
  description?: string
  video_url: string
  duration_min: number
  position: number
  is_free?: boolean
  situacao?: 'ativo' | 'inativo'
  transcript?: string
  transcricao?: string
}) {
  return pb.collection('lessons').create(data)
}

export async function updateLesson(id: string, data: Partial<Record<string, unknown>>) {
  return pb.collection('lessons').update(id, data)
}

export async function deleteLesson(id: string) {
  return pb.collection('lessons').delete(id)
}

export async function reorderLessons(updates: Array<{ id: string; position: number }>) {
  for (const item of updates) {
    await pb.collection('lessons').update(item.id, { position: item.position })
  }
}

export async function changeStudentPassword(studentId: string, newPassword: string) {
  return pb.send<{ success: boolean; message: string }>('/backend/v1/admin/alterar-senha-aluno', {
    method: 'POST',
    body: {
      studentId,
      newPassword,
    },
  })
}

export async function getWebhookConfig() {
  return pb.send<{
    name: string
    token: string
    is_active: boolean
    record_id: string
    webhook_path: string
  }>('/backend/v1/admin/webhook-config', {
    method: 'GET',
  })
}

export async function updateWebhookConfig(data: { token: string; is_active?: boolean }) {
  return pb.send<{
    success: boolean
    message: string
    token: string
    is_active: boolean
    webhook_path: string
  }>('/backend/v1/admin/webhook-config', {
    method: 'POST',
    body: data,
  })
}
