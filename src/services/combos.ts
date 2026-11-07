import pb from '@/lib/pocketbase/client'
import type { ComboRecord, CourseRecord } from '@/lib/types'

export async function listActiveCombos(): Promise<ComboRecord[]> {
  return pb.collection<ComboRecord>('combos').getFullList({
    filter: 'active = true',
    sort: '-created',
    expand: 'courses',
  })
}

export async function listAllCombos(): Promise<ComboRecord[]> {
  return pb.collection<ComboRecord>('combos').getFullList({
    sort: '-created',
    expand: 'courses',
  })
}

export async function getComboBySlug(slug: string): Promise<ComboRecord> {
  return pb
    .collection<ComboRecord>('combos')
    .getFirstListItem(`slug = "${slug.replaceAll('"', '\\"')}"`, {
      expand: 'courses',
    })
}

export async function getComboById(id: string): Promise<ComboRecord> {
  return pb.collection<ComboRecord>('combos').getOne(id, {
    expand: 'courses',
  })
}

export async function findCombosForCourse(courseId: string): Promise<ComboRecord[]> {
  const combos = await listActiveCombos()
  return combos.filter((combo) => combo.courses && combo.courses.includes(courseId))
}

export async function createCombo(data: {
  title: string
  slug: string
  description?: string
  courses: string[]
  price: number
  original_price?: number
  active: boolean
}): Promise<ComboRecord> {
  return pb.collection<ComboRecord>('combos').create(data)
}

export async function updateCombo(
  id: string,
  data: Partial<{
    title: string
    slug: string
    description: string
    courses: string[]
    price: number
    original_price: number
    active: boolean
  }>,
): Promise<ComboRecord> {
  return pb.collection<ComboRecord>('combos').update(id, data)
}

export async function deleteCombo(id: string): Promise<boolean> {
  return pb.collection('combos').delete(id)
}
