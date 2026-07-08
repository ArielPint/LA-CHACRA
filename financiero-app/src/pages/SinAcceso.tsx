import { ShieldAlert } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function SinAcceso() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="No tenés acceso a esta sección"
      description="Pedile a un administrador que te habilite la pestaña correspondiente."
    />
  )
}
