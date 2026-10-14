import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Lightbulb,
  LoaderCircle,
  Search,
  SearchX,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SearchResult } from '@/lib/types'
import { searchLessons } from '@/services/search'

const suggestions = ['funil de vendas', 'tráfego pago', 'autoridade', 'métricas']

export default function SearchLessons() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function runSearch(value: string) {
    if (!value.trim()) return
    setQuery(value)
    setSubmitted(value)
    setLoading(true)
    setError('')
    try {
      const response = await searchLessons(value.trim())
      setResults(response.results)
    } catch {
      setResults([])
      setError('A busca semântica não respondeu agora. Tente novamente em instantes.')
    } finally {
      setLoading(false)
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    void runSearch(query)
  }
  return (
    <div className="route-page min-h-[75vh] py-10 sm:py-14">
      <div className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">
            <Sparkles className="h-4 w-4" /> Busca que cita a aula
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-5xl">
            Pergunte. A gente encontra a pílula certa.
          </h1>
          <p className="mt-4 leading-7 text-brand-muted">
            Buscamos pelo significado nos conteúdos e mostramos a aula, o módulo e o trecho exato
            que responde à sua pergunta.
          </p>
          <form onSubmit={submit} className="relative mt-8">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-orange" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque por tema, aula ou professor…"
              className="h-16 rounded-full border-2 border-transparent bg-white pl-14 pr-36 text-base shadow-card focus-visible:border-brand-orange focus-visible:ring-brand-orange/20"
            />
            <Button
              disabled={loading || !query.trim()}
              className="pill-button absolute right-2 top-2 h-12 bg-brand-orange px-6 hover:bg-brand-orange-dark"
            >
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 'Buscar'}
            </Button>
          </form>
          {!submitted && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-xs font-bold text-brand-muted">Experimente:</span>
              {suggestions.map((item) => (
                <button
                  onClick={() => void runSearch(item)}
                  key={item}
                  className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-bold text-brand-muted hover:border-brand-orange hover:text-brand-orange"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading && (
          <div className="mt-16 flex flex-col items-center">
            <LoaderCircle className="h-9 w-9 animate-spin text-brand-orange" />
            <p className="mt-3 text-sm font-semibold text-brand-muted">
              Lendo as pílulas e conectando ideias…
            </p>
          </div>
        )}
        {error && (
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-red-50 p-5 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {!loading && submitted && results.length > 0 && (
          <div className="mx-auto mt-12 max-w-4xl">
            <p className="mb-4 text-sm font-semibold text-brand-muted">
              Encontramos {results.length} resposta{results.length > 1 ? 's' : ''} para “{submitted}
              ”
            </p>
            <article className="relative overflow-hidden rounded-3xl bg-brand-navy p-7 text-white shadow-xl sm:p-9">
              <div className="orange-glow absolute right-[-140px] top-[-180px] h-[450px] w-[450px]" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-extrabold">
                  <Lightbulb className="h-4 w-4" /> Melhor resposta
                </span>
                <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
                  Resposta na aula “{results[0].title}”
                </h2>
                <p className="mt-2 text-sm font-semibold text-brand-orange">
                  {results[0].module.title} · {results[0].course.title}
                </p>
                <blockquote className="mt-6 border-l-2 border-brand-orange pl-5 text-base leading-8 text-white/75">
                  “{results[0].snippet}”
                </blockquote>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="pill-button bg-brand-orange hover:bg-brand-orange-dark"
                  >
                    <Link to={`/app/curso/${results[0].course.slug}?aula=${results[0].id}`}>
                      <Headphones className="mr-2 h-4 w-4" />
                      Ouvir trecho
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="pill-button border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to={`/app/curso/${results[0].course.slug}?aula=${results[0].id}`}>
                      Ir para a aula <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
            {results.length > 1 && (
              <div className="mt-6 space-y-4">
                {results.slice(1).map((result) => (
                  <article key={result.id} className="interactive-card p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-extrabold text-brand-navy">{result.title}</h3>
                        <p className="mt-1 text-xs font-bold text-brand-orange">
                          {result.module.title} · {result.course.title} · {result.duration_min} min
                        </p>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-brand-muted">
                          “{result.snippet}”
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        className="pill-button shrink-0 text-brand-orange"
                      >
                        <Link to={`/app/curso/${result.course.slug}?aula=${result.id}`}>
                          Abrir <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && submitted && !error && results.length === 0 && (
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-brand-border bg-white p-10 text-center">
            <SearchX className="mx-auto h-12 w-12 text-brand-orange" />
            <h2 className="mt-5 text-xl font-extrabold text-brand-navy">
              Não encontramos essa resposta ainda
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Tente reformular com palavras mais diretas ou explore o catálogo para descobrir novos
              conteúdos.
            </p>
            <Button asChild variant="outline" className="pill-button mt-6">
              <Link to="/cursos">Ver catálogo</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
