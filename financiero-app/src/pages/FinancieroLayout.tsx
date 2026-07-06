import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Wallet,
  TrendingUp,
  History,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, adminOnly: true },
  { to: '/ordenes-compra', label: 'Órdenes de Compra', icon: ShoppingCart },
  { to: '/facturas', label: 'Facturas', icon: Receipt },
  { to: '/presupuestos', label: 'Presupuestos', icon: Wallet, adminOnly: true },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp, adminOnly: true },
  { to: '/auditoria', label: 'Auditoría', icon: History, adminOnly: true },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/ordenes-compra': 'Órdenes de Compra',
  '/facturas': 'Facturas',
  '/presupuestos': 'Presupuestos',
  '/forecast': 'Forecast',
  '/auditoria': 'Auditoría',
}

function iniciales(nombre: string | undefined) {
  if (!nombre) return '?'
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ nombre, rol, onSignOut }: { nombre?: string; rol?: string; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{iniciales(nombre)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{nombre}</p>
        <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{rol}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onSignOut} title="Salir" className="text-sidebar-foreground/70">
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}

export default function FinancieroLayout() {
  const { perfil, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const tituloPagina = PAGE_TITLES[location.pathname] ?? 'Financiero'

  return (
    <div className="flex min-h-svh">
      {/* Sidebar — visible desde md hacia arriba */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar py-4 md:flex">
        <div className="mb-2 px-4">
          <p className="text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">LA CHACRA</p>
          <p className="text-lg font-bold text-sidebar-foreground">Financiero</p>
        </div>
        <SidebarNav isAdmin={isAdmin} />
        <div className="mt-auto pt-4">
          <Separator className="mb-4 bg-sidebar-border" />
          <SidebarFooter nombre={perfil?.name} rol={perfil?.role} onSignOut={signOut} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — siempre visible; el botón de menú solo aparece en mobile */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <div className="flex h-full flex-col py-4">
                <div className="mb-2 px-4">
                  <p className="text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
                    LA CHACRA
                  </p>
                  <p className="text-lg font-bold text-sidebar-foreground">Financiero</p>
                </div>
                <SidebarNav isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
                <div className="mt-auto pt-4">
                  <Separator className="mb-4 bg-sidebar-border" />
                  <SidebarFooter nombre={perfil?.name} rol={perfil?.role} onSignOut={signOut} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-base font-semibold">{tituloPagina}</h1>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
