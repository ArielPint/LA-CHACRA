import { TrendingUp } from 'lucide-react'
import type { EstadoResultadoMensual } from '@/types/financiero'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { formatCLP, nombreMes } from '@/utils/formatters'
import { cn } from '@/lib/utils'

interface EstadoResultadoMensualProps {
  estadoResultado: EstadoResultadoMensual[]
  loading: boolean
  error: string | null
}

export default function EstadoResultadoMensualView({ estadoResultado, loading, error }: EstadoResultadoMensualProps) {
  if (error) return <p className="text-destructive">{error}</p>

  const totales = estadoResultado.reduce(
    (acc, r) => ({
      ingresos: acc.ingresos + r.ingresos,
      costos: acc.costos + r.costos,
      resultado: acc.resultado + r.resultado,
    }),
    { ingresos: 0, costos: 0, resultado: 0 },
  )

  if (!loading && estadoResultado.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Todavía no hay datos para el estado de resultado"
        description="Aparece acá apenas haya facturas, remuneraciones o ingresos cargados con mes y año."
      />
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="text-right">Costos</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        {loading ? (
          <TableSkeleton columns={4} />
        ) : (
          <>
            <TableBody>
              {estadoResultado.map((r) => (
                <TableRow key={`${r.anio}-${r.mes}`}>
                  <TableCell className="font-medium">
                    {nombreMes(r.mes)} {r.anio}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.ingresos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.costos)}</TableCell>
                  <TableCell
                    className={cn('text-right font-medium tabular-nums', r.resultado < 0 ? 'text-destructive' : 'text-success')}
                  >
                    {formatCLP(r.resultado)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(totales.ingresos)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(totales.costos)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold tabular-nums',
                    totales.resultado < 0 ? 'text-destructive' : 'text-success',
                  )}
                >
                  {formatCLP(totales.resultado)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </>
        )}
      </Table>
    </div>
  )
}
