import pb from '@/lib/pocketbase/client'
import type {
  EnrollmentRecord,
  LessonProgressRecord,
  OrderRecord,
  PointsLedgerRecord,
} from '@/lib/types'

export async function listEnrollments(userId: string) {
  return pb.collection<EnrollmentRecord>('enrollments').getFullList({
    filter: `user = "${userId}" && situacao = "ativa"`,
    sort: '-created',
  })
}

export async function findEnrollment(userId: string, courseId: string) {
  try {
    return await pb
      .collection<EnrollmentRecord>('enrollments')
      .getFirstListItem(`user = "${userId}" && course = "${courseId}" && situacao = "ativa"`)
  } catch {
    return null
  }
}

export async function listProgress(userId: string, courseId?: string) {
  const filter = courseId ? `user = "${userId}" && course = "${courseId}"` : `user = "${userId}"`
  return pb
    .collection<LessonProgressRecord>('lesson_progress')
    .getFullList({ filter, sort: '-updated' })
}

export async function saveLessonPosition(input: {
  userId: string
  lessonId: string
  courseId: string
  enrollmentId: string
  currentMinute: number
  completed?: boolean
}) {
  let existing: LessonProgressRecord | null = null
  try {
    existing = await pb
      .collection<LessonProgressRecord>('lesson_progress')
      .getFirstListItem(`user = "${input.userId}" && lesson = "${input.lessonId}"`)
  } catch {
    existing = null
  }
  const data = {
    user: input.userId,
    lesson: input.lessonId,
    course: input.courseId,
    enrollment: input.enrollmentId,
    current_minute: input.currentMinute,
    completed: input.completed ?? existing?.completed ?? false,
    completed_at: input.completed ? new Date().toISOString() : existing?.completed_at || '',
  }
  if (existing)
    return pb.collection<LessonProgressRecord>('lesson_progress').update(existing.id, data)
  return pb.collection<LessonProgressRecord>('lesson_progress').create(data)
}

export async function listPoints(userId: string) {
  return pb.collection<PointsLedgerRecord>('points_ledger').getFullList({
    filter: `user = "${userId}"`,
    sort: '-created',
  })
}

export async function createPendingOrder(
  userId: string,
  courseId: string,
  amount: number,
  method: 'pix' | 'cartao',
) {
  return pb
    .collection<OrderRecord>('orders')
    .create({ user: userId, course: courseId, amount, method, status: 'pending' })
}

export async function confirmOrder(orderId: string) {
  return pb.send<OrderRecord>(`/backend/v1/checkout/confirm/${orderId}`, { method: 'POST' })
}

export async function findLatestPendingOrder(userId: string, courseId: string) {
  try {
    return await pb
      .collection<OrderRecord>('orders')
      .getFirstListItem(`user = "${userId}" && course = "${courseId}" && status = "pending"`, {
        sort: '-created',
      })
  } catch {
    return null
  }
}
