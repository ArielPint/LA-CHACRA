import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import FormularioMontoMensual from '@/components/FormularioMontoMensual'
import GraficoMontoMensual from '@/components/GraficoMontoMensual'
import type { MontoMensual } from '@/types/financiero'
import { formatCLP, nombreMes } from '@/utils/formatters'
import { cn } from '@/lib/utils'

interface MontoMensualViewProps {
  registros: MontoMensual[]
  loading: boolean
  error: string | null
  icon: LucideIcon
  tituloVacio: string
  descripcionVacio: string
  tituloNuevo: string
  tituloEditar: string
  etiquetaGrafico: string
  colorVar: string
  colorClase: string
  puedeEditar: boolean
  onUpsert: (input: { id?: string; mes: number; anio: number; monto: number; observacion: string | null }) => Promise<MontoMensual>
}

export default function MontoMensualView({
  registros,
  loading,
  error,
  icon,
  tituloVacio,
  descripcionVacio,
  tituloNuevo,
  tituloEditar,
  etiquetaGrafico,
  colorVar,
  colorClase,
  puedeEditar,
  onUpsert,
}: MontoMensualViewProps) {
  const { total, promedio, ultimo } = useMemo(() => {
    const total = registros.reduce((acc, r) => acc + r.monto, 0)
    const promedio = registros.length > 0 ? total / registros.length : 0
    const ultimo = [...registros].sort((a, b) => b.anio - a.anio || b.mes - a.mes)[0]
    return { total, promedio, ultimo }
  }, [registros])

  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Total acumulado</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', colorClase)}>{loading ? '—' : formatCLP(total)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Promedio mensual</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{loading ? '—' : formatCLP(promedio)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Último mes cargado</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {loading ? '—' : ultimo ? formatCLP(ultimo.monto) : '—'}
          </p>
          {!loading && ultimo && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {nombreMes(ultimo.mes)} {ultimo.anio}
            </p>
          )}
        </div>
      </div>

      {!loading && registros.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <GraficoMontoMensual registros={registros} loading={loading} colorVar={colorVar} etiqueta={etiquetaGrafico} />
        </div>
      )}

      <div className="flex justify-end">
        {puedeEditar && <FormularioMontoMensual tituloNuevo={tituloNuevo} tituloEditar={tituloEditar} onUpsert={onUpsert} />}
      </div>

      {!loading && registros.length === 0 ? (
        <EmptyState icon={icon} title={tituloVacio} description={puedeEditar ? descripcionVacio : undefined} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Observación</TableHead>
                {puedeEditar && <TableHead />}
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableSkeleton columns={puedeEditar ? 4 : 3} />
            ) : (
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {nombreMes(r.mes)} {r.anio}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(r.monto)}</TableCell>
                    <TableCell className="max-w-96 truncate">{r.observacion ?? '—'}</TableCell>
                    {puedeEditar && (
                      <TableCell>
                        <FormularioMontoMensual
                          registroExistente={r}
                          tituloNuevo={tituloNuevo}
                          tituloEditar={tituloEditar}
                          onUpsert={onUpsert}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
      )}
    </div>
  )
}
