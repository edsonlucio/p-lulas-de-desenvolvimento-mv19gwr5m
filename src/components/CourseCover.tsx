import { Play, Sparkles } from 'lucide-react'

import type { CourseRecord } from '@/lib/types'
import { courseThumbnail } from '@/services/courses'
import { cn } from '@/lib/utils'

export function CourseCover({
  course,
  className,
  showPlay = false,
}: {
  course: CourseRecord
  className?: string
  showPlay?: boolean
}) {
  const thumbnail = courseThumbnail(course)
  return (
    <div className={cn('course-cover relative isolate overflow-hidden bg-brand-navy', className)}>
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={`Capa do curso ${course.title}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-brand-orange/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex h-full min-h-[180px] flex-col justify-between p-6 text-white">
            <span className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em]">
              <Sparkles className="h-3 w-3 text-brand-orange" /> Pílula prática
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-brand-orange">
                Curso completo
              </span>
              <h3 className="mt-2 max-w-[80%] text-2xl font-extrabold leading-tight">
                {course.title}
              </h3>
            </div>
          </div>
        </>
      )}
      {showPlay && (
        <span className="absolute inset-0 grid place-items-center bg-brand-navy/10">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-brand-orange shadow-xl">
            <Play className="ml-1 h-5 w-5 fill-current" />
          </span>
        </span>
      )}
    </div>
  )
}
