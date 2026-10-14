import pb from '@/lib/pocketbase/client'
import type {
  CourseRecord,
  EnrollmentRecord,
  LessonProgressRecord,
  OrderRecord,
  UserRecord,
} from '@/lib/types'

export async function getAdminSnapshot() {
  const [users, enrollments, orders, progress] = await Promise.all([
    pb
      .collection<UserRecord>('users')
      .getFullList({ filter: 'role = "student"', sort: '-created' }),
    pb.collection<EnrollmentRecord>('enrollments').getFullList({ sort: '-created' }),
    pb.collection<OrderRecord>('orders').getFullList({ sort: '-created' }),
    pb
      .collection<LessonProgressRecord>('lesson_progress')
      .getFullList({ filter: 'completed = true' }),
  ])
  return { users, enrollments, orders, progress }
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
}) {
  return pb.collection('lessons').create(data)
}

export async function updateLesson(id: string, data: Partial<Record<string, unknown>>) {
  return pb.collection('lessons').update(id, data)
}

export async function deleteLesson(id: string) {
  return pb.collection('lessons').delete(id)
}
