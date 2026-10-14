import { LoaderCircle } from 'lucide-react'

export function LoadingScreen({ label = 'Preparando sua próxima pílula…' }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-brand-muted">
      <LoaderCircle className="h-8 w-8 animate-spin text-brand-orange" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  )
}
