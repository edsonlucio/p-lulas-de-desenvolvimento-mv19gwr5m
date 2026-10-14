import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Award,
  BookOpen,
  ChevronDown,
  Instagram,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X,
  Youtube,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandLogo } from '@/components/BrandLogo'
import { LevelBadge } from '@/components/LevelBadge'
import { VerifiedBanner } from '@/components/VerifiedBanner'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

const publicLinks = [
  { label: 'Início', href: '/' },
  { label: 'Cursos', href: '/cursos' },
  { label: 'Clube das Pílulas', href: '/#clube' },
  { label: 'Contato', href: '/#contato' },
]
const studentLinks = [
  { label: 'Meus cursos', href: '/app' },
  { label: 'Buscar', href: '/app/busca' },
  { label: 'Meus pontos', href: '/app/perfil#trilha' },
]
const adminLinks = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Cursos', href: '/admin/cursos' },
  { label: 'Alunos', href: '/admin/alunos' },
  { label: 'Pedidos', href: '/admin/pedidos' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')
  const isHome = location.pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setMobileOpen(false), [location.pathname])

  const links = isAdmin ? adminLinks : user ? studentLinks : publicLinks
  const inverse = isAdmin || (isHome && !scrolled)
  const avatarUrl = user?.avatar ? pb.files.getURL(user, user.avatar, { thumb: '100x100' }) : ''
  const initials =
    user?.name
      ?.split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PD'

  const signOut = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-sand text-brand-text">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
          inverse
            ? 'border-white/10 bg-brand-navy/80 text-white backdrop-blur-xl'
            : scrolled || !isHome
              ? 'border-brand-border bg-white/90 text-brand-navy shadow-sm backdrop-blur-xl'
              : 'border-transparent bg-transparent text-white',
        )}
      >
        <div className="mx-auto flex h-[76px] max-w-[1248px] items-center justify-between px-5 sm:px-8 lg:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo inverse={inverse} />
            {isAdmin && (
              <span className="hidden rounded-full bg-brand-orange px-3 py-1 text-xs font-extrabold text-white sm:inline-flex">
                Admin
              </span>
            )}
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {links.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                end={item.href === '/' || item.href === '/app' || item.href === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? inverse
                        ? 'bg-white/12 text-white'
                        : 'bg-brand-subtle text-brand-navy'
                      : inverse
                        ? 'text-white/75 hover:text-white'
                        : 'text-brand-muted hover:text-brand-navy',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            {!user ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    'rounded-full',
                    inverse && 'text-white hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full bg-brand-orange px-5 text-white hover:bg-brand-orange-dark"
                >
                  <Link to="/cadastro">Criar conta</Link>
                </Button>
              </>
            ) : (
              <>
                <LevelBadge points={user.points || 0} small />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'flex items-center gap-2 rounded-full border p-1 pr-2 transition-colors',
                        inverse
                          ? 'border-white/15 hover:bg-white/10'
                          : 'border-brand-border hover:bg-brand-subtle',
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarUrl} alt={user.name} />
                        <AvatarFallback className="bg-brand-orange text-xs font-extrabold text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 opacity-65" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                    <DropdownMenuLabel>
                      <span className="block truncate font-bold">{user.name}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Painel Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/app/perfil#seguranca')}
                          className="rounded-xl font-medium"
                        >
                          <ShieldCheck className="mr-2 h-4 w-4 text-brand-orange" />
                          Minha senha
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => navigate('/app/perfil')}
                      className="rounded-xl"
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/app/perfil#trilha')}
                      className="rounded-xl"
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Meus pontos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={signOut}
                      className="rounded-xl text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className={cn(
              'grid h-11 w-11 place-items-center rounded-full sm:hidden',
              inverse ? 'bg-white/10' : 'bg-brand-subtle',
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-[70] transition sm:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          className={cn(
            'absolute inset-0 bg-brand-navy/65 backdrop-blur-sm transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
        <aside
          className={cn(
            'absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-brand-sand p-6 shadow-2xl transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between">
            <BrandLogo />
            <button
              className="grid h-10 w-10 place-items-center rounded-full bg-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-14 flex flex-col gap-2">
            {links.map((item, index) => (
              <Link
                key={item.label}
                to={item.href}
                className="animate-capsule-rise rounded-2xl px-4 py-4 text-xl font-extrabold text-brand-navy hover:bg-white"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            {!user ? (
              <>
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button
                  asChild
                  className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark"
                >
                  <Link to="/cadastro">Criar conta</Link>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                  <div>
                    <p className="font-extrabold">{user.name}</p>
                    <p className="text-xs text-brand-muted">{user.points || 0} pontos</p>
                  </div>
                  <LevelBadge points={user.points || 0} small />
                </div>
                <Button variant="outline" className="w-full rounded-full" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>

      <div className="h-[76px]" aria-hidden="true" />
      <VerifiedBanner />
      <main className="min-h-[70vh]">
        <Outlet />
      </main>

      {!isAdmin && (
        <footer id="contato" className="bg-brand-navy text-white">
          <div className="mx-auto grid max-w-[1248px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-6">
            <div>
              <BrandLogo inverse />
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
                Desenvolvemos pessoas para vender, liderar e transformar com propósito — uma pílula
                prática por dia.
              </p>
              <p className="mt-6 text-lg font-extrabold text-brand-orange">
                Pequenas pílulas, grandes transformações.
              </p>
            </div>
            <div>
              <h3 className="font-extrabold">Cursos</h3>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <Link className="block hover:text-white" to="/cursos">
                  Todos os cursos
                </Link>
                <Link className="block hover:text-white" to="/cursos/marketing-digital">
                  Marketing Digital
                </Link>
                <Link className="block hover:text-white" to="/#clube">
                  Clube das Pílulas
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-extrabold">Institucional</h3>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <Link className="block hover:text-white" to="/#mentor">
                  Edson Lúcio
                </Link>
                <Link className="block hover:text-white" to="/entrar">
                  Área do aluno
                </Link>
                <a
                  className="block hover:text-white"
                  href="mailto:contato@pilulasdesenvolvimento.com.br"
                >
                  Fale conosco
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-extrabold">Redes</h3>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://www.instagram.com/pilulasdedesenvolvimento"
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-brand-orange"
                  aria-label="Instagram Pílulas de Desenvolvimento"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://www.youtube.com/@prof_edsonlucio"
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-brand-orange"
                  aria-label="YouTube Professor Edson Lúcio"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/55">
                @pilulasdedesenvolvimento
                <br />
                @prof_edsonlucio
              </p>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-[1248px] flex-col gap-3 px-5 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-6">
              <span>© Pílulas de Desenvolvimento — Natal/RN</span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" /> Conhecimento que vira movimento.
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
