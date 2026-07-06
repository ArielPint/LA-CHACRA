import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import './index.css'
import App from './App.tsx'

// HashRouter (no BrowserRouter): GitHub Pages es hosting estático sin
// rewrites del lado del servidor, así que un link directo a una ruta como
// /financiero/ordenes-compra daría 404 al recargar. Con hash (/financiero/#/ordenes-compra)
// siempre funciona porque el servidor solo ve la parte antes del #.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
