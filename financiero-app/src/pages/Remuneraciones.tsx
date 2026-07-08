import { Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRemuneraciones } from '@/hooks/useRemuneraciones'
import MontoMensualView from '@/components/MontoMensualView'

export default function Remuneraciones() {
  const { puedeEditar } = useAuth()
  const { remuneraciones, loading, error, upsertRemuneracion } = useRemuneraciones()

  return (
    <MontoMensualView
      registros={remuneraciones}
      loading={loading}
      error={error}
      icon={Users}
      tituloVacio="Todavía no hay remuneraciones cargadas"
      descripcionVacio='Cargá el primer mes con el botón "Agregar mes".'
      tituloNuevo="Agregar mes"
      tituloEditar="Editar remuneraciones del mes"
      etiquetaGrafico="Remuneraciones"
      colorVar="--warning"
      colorClase="text-warning"
      puedeEditar={puedeEditar('remuneraciones')}
      onUpsert={upsertRemuneracion}
    />
  )
}
