import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-site grid min-h-[65vh] place-items-center py-16">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid h-20 w-32 place-items-center rounded-full bg-brand-orange/10 text-brand-orange">
          <SearchX className="h-8 w-8" />
        </span>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[.18em] text-brand-orange">
          Erro 404
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-.04em] text-brand-navy">
          Essa pílula saiu da cartela.
        </h1>
        <p className="mt-4 leading-7 text-brand-muted">
          A página que você procurou não existe ou mudou de endereço. Volte para a vitrine e siga
          sua trilha.
        </p>
        <Button asChild className="pill-button mt-7 bg-brand-orange hover:bg-brand-orange-dark">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  )
}
