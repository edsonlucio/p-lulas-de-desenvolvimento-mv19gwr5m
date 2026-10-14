import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-brand-border bg-white px-6 py-14 text-center">
      <span className="mb-5 grid h-16 w-24 place-items-center rounded-full bg-brand-orange/10 text-brand-orange">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-xl font-extrabold text-brand-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-brand-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
