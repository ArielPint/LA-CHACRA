import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/Login'
import FinancieroLayout from '@/pages/FinancieroLayout'
import Dashboard from '@/pages/Dashboard'
import OrdenesCompra from '@/pages/OrdenesCompra'
import Facturas from '@/pages/Facturas'
import Presupuestos from '@/pages/Presupuestos'
import Forecast from '@/pages/Forecast'
import Auditoria from '@/pages/Auditoria'

// Presupuestos/forecast/seguimiento son admin-only de punta a punta (RLS),
// así que el Dashboard (que depende de la vista de seguimiento) también lo es.
function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? <>{children}</> : <Navigate to="/ordenes-compra" replace />
}

function IndexRoute() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Dashboard /> : <Navigate to="/ordenes-compra" replace />
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
          <Route path="ordenes-compra" element={<OrdenesCompra />} />
          <Route path="facturas" element={<Facturas />} />
          <Route
            path="presupuestos"
            element={
              <SoloAdmin>
                <Presupuestos />
              </SoloAdmin>
            }
          />
          <Route
            path="forecast"
            element={
              <SoloAdmin>
                <Forecast />
              </SoloAdmin>
            }
          />
          <Route
            path="auditoria"
            element={
              <SoloAdmin>
                <Auditoria />
              </SoloAdmin>
            }
          />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
