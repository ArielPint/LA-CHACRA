import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
  )

export default function FinancieroLayout() {
  const { perfil, isAdmin, signOut } = useAuth()

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <h1 className="font-semibold">Financiero</h1>
          <nav className="flex items-center gap-1">
            {isAdmin && (
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
            <NavLink to="/ordenes-compra" className={navLinkClass}>
              Órdenes de Compra
            </NavLink>
            <NavLink to="/facturas" className={navLinkClass}>
              Facturas
            </NavLink>
            {isAdmin && (
              <NavLink to="/presupuestos" className={navLinkClass}>
                Presupuestos
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/forecast" className={navLinkClass}>
                Forecast
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/auditoria" className={navLinkClass}>
                Auditoría
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{perfil?.name}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Salir
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
