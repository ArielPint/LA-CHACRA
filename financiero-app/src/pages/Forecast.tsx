import { useMemo } from 'react'
import { useForecast } from '@/hooks/useForecast'
import { usePresupuestosLookup } from '@/hooks/usePresupuestosLookup'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import FormularioForecast from '@/components/FormularioForecast'
import { formatCLP, nombreMes } from '@/utils/formatters'

export default function Forecast() {
  const { forecast, loading, upsertForecast } = useForecast()
  const { presupuestos } = usePresupuestosLookup()

  const presupuestoPorId = useMemo(() => new Map(presupuestos.map((p) => [p.id, p])), [presupuestos])

  const filasOrdenadas = useMemo(
    () =>
      [...forecast].sort((a, b) => {
        const wipA = presupuestoPorId.get(a.presupuesto_id)?.tarea_wip ?? ''
        const wipB = presupuestoPorId.get(b.presupuesto_id)?.tarea_wip ?? ''
        return wipA.localeCompare(wipB) || a.anio - b.anio || a.mes - b.mes
      }),
    [forecast, presupuestoPorId],
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormularioForecast onUpsert={upsertForecast} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código WIP</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Monto Forecast</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasOrdenadas.map((f) => {
              const presupuesto = presupuestoPorId.get(f.presupuesto_id)
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{presupuesto?.tarea_wip ?? '—'}</TableCell>
                  <TableCell>{presupuesto?.nombre ?? '—'}</TableCell>
                  <TableCell>
                    {nombreMes(f.mes)} {f.anio}
                  </TableCell>
                  <TableCell className="text-right">{formatCLP(f.monto_forecast)}</TableCell>
                  <TableCell>
                    <FormularioForecast forecastExistente={f} onUpsert={upsertForecast} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
