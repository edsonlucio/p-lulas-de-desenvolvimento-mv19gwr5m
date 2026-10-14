import pb from '@/lib/pocketbase/client'
import type { CourseBundle, CourseRecord, LessonRecord, ModuleRecord } from '@/lib/types'

export async function listPublishedCourses() {
  return pb.collection<CourseRecord>('courses').getFullList({
    filter: 'published = true',
    sort: '-created',
  })
}

export async function listAllCourses() {
  return pb.collection<CourseRecord>('courses').getFullList({ sort: '-created' })
}

export async function getCourseBySlug(slug: string) {
  return pb
    .collection<CourseRecord>('courses')
    .getFirstListItem(`slug = "${slug.replaceAll('"', '\\"')}"`)
}

export async function getCourseBundle(slug: string): Promise<CourseBundle> {
  const course = await getCourseBySlug(slug)
  const modules = await pb.collection<ModuleRecord>('modules').getFullList({
    filter: `course = "${course.id}"`,
    sort: 'position',
  })
  const moduleIds = modules.map((module) => module.id)
  const lessons = moduleIds.length
    ? await pb.collection<LessonRecord>('lessons').getFullList({
        filter: moduleIds.map((id) => `module = "${id}"`).join(' || '),
        sort: 'position',
      })
    : []
  const enriched = modules.map((module) => ({
    ...module,
    lessons: lessons.filter((lesson) => lesson.module === module.id),
  }))
  return {
    course,
    modules: enriched,
    lessonCount: lessons.length,
    duration: lessons.reduce((total, lesson) => total + Number(lesson.duration_min || 0), 0),
  }
}

export async function getCourseCounts(courseIds: string[]) {
  if (!courseIds.length)
    return new Map<string, { modules: number; lessons: number; duration: number }>()
  const modules = await pb.collection<ModuleRecord>('modules').getFullList({
    filter: courseIds.map((id) => `course = "${id}"`).join(' || '),
  })
  const moduleIds = modules.map((module) => module.id)
  const lessons = moduleIds.length
    ? await pb
        .collection<LessonRecord>('lessons')
        .getFullList({ filter: moduleIds.map((id) => `module = "${id}"`).join(' || ') })
    : []
  const result = new Map<string, { modules: number; lessons: number; duration: number }>()
  for (const courseId of courseIds) {
    const ownModules = modules.filter((module) => module.course === courseId)
    const ownModuleIds = ownModules.map((module) => module.id)
    const ownLessons = lessons.filter((lesson) => ownModuleIds.includes(lesson.module))
    result.set(courseId, {
      modules: ownModules.length,
      lessons: ownLessons.length,
      duration: ownLessons.reduce((sum, lesson) => sum + Number(lesson.duration_min || 0), 0),
    })
  }
  return result
}

export function courseThumbnail(course: CourseRecord, size = '720x405') {
  if (!course.thumbnail) return ''
  return pb.files.getURL(course, course.thumbnail, { thumb: size })
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}
