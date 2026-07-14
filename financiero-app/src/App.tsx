import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useAuth, type FinancieroTab } from '@/hooks/useAuth'
import Login from '@/pages/Login'
import FinancieroLayout from '@/pages/FinancieroLayout'
import Dashboard from '@/pages/Dashboard'
import OrdenesCompra from '@/pages/OrdenesCompra'
import Facturas from '@/pages/Facturas'
import Presupuestos from '@/pages/Presupuestos'
import Forecast from '@/pages/Forecast'
import Remuneraciones from '@/pages/Remuneraciones'
import Ingresos from '@/pages/Ingresos'
import GastosDirectos from '@/pages/GastosDirectos'
import Auditoria from '@/pages/Auditoria'
import SinAcceso from '@/pages/SinAcceso'

const ORDEN_TABS: FinancieroTab[] = [
  'dashboard',
  'ordenes-compra',
  'facturas',
  'presupuestos',
  'forecast',
  'remuneraciones',
  'ingresos',
  'gastos-directos',
  'auditoria',
]

function RequiereTab({ tab, children }: { tab: FinancieroTab; children: React.ReactNode }) {
  const { puedeVer } = useAuth()
  return puedeVer(tab) ? <>{children}</> : <Navigate to="/sin-acceso" replace />
}

function IndexRoute() {
  const { puedeVer } = useAuth()
  const primerTabDisponible = ORDEN_TABS.find((tab) => puedeVer(tab))
  if (!primerTabDisponible) return <Navigate to="/sin-acceso" replace />
  return primerTabDisponible === 'dashboard' ? <Dashboard /> : <Navigate to={`/${primerTabDisponible}`} replace />
}

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Login />

  return (
    <>
      <Routes>
        <Route element={<FinancieroLayout />}>
          <Route index element={<IndexRoute />} />
          <Route
            path="ordenes-compra"
            element={
              <RequiereTab tab="ordenes-compra">
                <OrdenesCompra />
              </RequiereTab>
            }
          />
          <Route
            path="facturas"
            element={
              <RequiereTab tab="facturas">
                <Facturas />
              </RequiereTab>
            }
          />
          <Route
            path="presupuestos"
            element={
              <RequiereTab tab="presupuestos">
                <Presupuestos />
              </RequiereTab>
            }
          />
          <Route
            path="forecast"
            element={
              <RequiereTab tab="forecast">
                <Forecast />
              </RequiereTab>
            }
          />
          <Route
            path="remuneraciones"
            element={
              <RequiereTab tab="remuneraciones">
                <Remuneraciones />
              </RequiereTab>
            }
          />
          <Route
            path="ingresos"
            element={
              <RequiereTab tab="ingresos">
                <Ingresos />
              </RequiereTab>
            }
          />
          <Route
            path="gastos-directos"
            element={
              <RequiereTab tab="gastos-directos">
                <GastosDirectos />
              </RequiereTab>
            }
          />
          <Route
            path="auditoria"
            element={
              <RequiereTab tab="auditoria">
                <Auditoria />
              </RequiereTab>
            }
          />
          <Route path="sin-acceso" element={<SinAcceso />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
