import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/services/supabaseClient'
import { usePresupuestos } from '@/hooks/usePresupuestos'
import { useForecast } from '@/hooks/useForecast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCLP, formatPct, nombreMes } from '@/utils/formatters'

interface FacturadoPorMes {
  [key: string]: number // "mes-anio" -> total
}

export default function TablaForecastMensual() {
  const { presupuestos, loading: loadingPresupuestos } = usePresupuestos()
  const [presupuestoId, setPresupuestoId] = useState<string>('')
  const { forecast, loading: loadingForecast } = useForecast(presupuestoId || undefined)
  const [facturadoPorMes, setFacturadoPorMes] = useState<FacturadoPorMes>({})

  useEffect(() => {
    if (!presupuestoId) return
    supabase
      .from('financiero_facturas')
      .select('mes, anio, monto')
      .eq('presupuesto_id', presupuestoId)
      .neq('estado', 'ANULADA')
      .then(({ data }) => {
        const totales: FacturadoPorMes = {}
        for (const fila of data ?? []) {
          const key = `${fila.mes}-${fila.anio}`
          totales[key] = (totales[key] ?? 0) + Number(fila.monto)
        }
        setFacturadoPorMes(totales)
      })
  }, [presupuestoId])

  useEffect(() => {
    if (!presupuestoId && presupuestos.length > 0) setPresupuestoId(presupuestos[0].id)
  }, [presupuestos, presupuestoId])

  const presupuesto = presupuestos.find((p) => p.id === presupuestoId)

  // Unión de meses con forecast cargado Y meses con facturas reales: si solo
  // se itera `forecast`, los meses sin fila de forecast (ej. sin cobertura
  // para ese período) quedan invisibles aunque sí tengan facturas — y el
  // Total terminaba sin coincidir con la suma visible fila por fila.
  const periodos = useMemo(() => {
    const mapa = new Map<string, { mes: number; anio: number; montoForecast: number | null }>()
    for (const f of forecast) {
      mapa.set(`${f.mes}-${f.anio}`, { mes: f.mes, anio: f.anio, montoForecast: f.monto_forecast })
    }
    for (const key of Object.keys(facturadoPorMes)) {
      if (!mapa.has(key)) {
        const [mes, anio] = key.split('-').map(Number)
        mapa.set(key, { mes, anio, montoForecast: null })
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes)
  }, [forecast, facturadoPorMes])

  const totalForecast = forecast.reduce((acc, f) => acc + (f.monto_forecast ?? 0), 0)
  const totalFacturado = Object.values(facturadoPorMes).reduce((acc, v) => acc + v, 0)

  return (
    <div className="space-y-4">
      <Select value={presupuestoId} onValueChange={setPresupuestoId} disabled={loadingPresupuestos}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder="Elegí un presupuesto" />
        </SelectTrigger>
        <SelectContent>
          {presupuestos.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loadingForecast ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Facturado</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-right">% vs. presupuesto original</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map(({ mes, anio, montoForecast }) => {
              const facturadoMes = facturadoPorMes[`${mes}-${anio}`] ?? 0
              const restante = (montoForecast ?? 0) - facturadoMes
              return (
                <TableRow key={`${mes}-${anio}`}>
                  <TableCell>
                    {nombreMes(mes)} {anio}
                  </TableCell>
                  <TableCell className="text-right">{montoForecast === null ? '—' : formatCLP(montoForecast)}</TableCell>
                  <TableCell className="text-right">{formatCLP(facturadoMes)}</TableCell>
                  <TableCell className="text-right">{formatCLP(restante)}</TableCell>
                  <TableCell className="text-right">
                    {presupuesto ? formatPct(facturadoMes / presupuesto.presupuesto_original) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatCLP(totalForecast)}</TableCell>
              <TableCell className="text-right">{formatCLP(totalFacturado)}</TableCell>
              <TableCell className="text-right">{formatCLP(totalForecast - totalFacturado)}</TableCell>
              <TableCell className="text-right">
                {presupuesto ? formatPct(totalFacturado / presupuesto.presupuesto_original) : '—'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  )
}
