import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePresupuestosLookup } from '@/hooks/usePresupuestosLookup'
import { formatCLP } from '@/utils/formatters'
import type { OrdenCompra } from '@/types/financiero'

interface RelacionOCFacturaProps {
  ordenesCompra: OrdenCompra[]
  value: string
  onChange: (value: string) => void
}

// Selector de línea de OC para asociar una factura. Muestra presupuesto + neto
// porque una misma OC puede repetirse repartida entre varias partidas
// (verificado en datos reales) — el N° de OC solo no alcanza para identificarla.
export default function RelacionOCFactura({ ordenesCompra, value, onChange }: RelacionOCFacturaProps) {
  const { presupuestos } = usePresupuestosLookup()
  const nombrePresupuesto = (id: string) => presupuestos.find((p) => p.id === id)?.nombre ?? '—'

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Elegí la OC" />
      </SelectTrigger>
      <SelectContent>
        {ordenesCompra
          .filter((oc) => oc.estado !== 'ANULADA')
          .map((oc) => (
            <SelectItem key={oc.id} value={oc.id}>
              OC {oc.numero_oc} — {nombrePresupuesto(oc.presupuesto_id)} ({formatCLP(oc.neto)})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
