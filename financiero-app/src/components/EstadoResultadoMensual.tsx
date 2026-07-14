import { TrendingUp } from 'lucide-react'
import type { EstadoResultadoMensual } from '@/types/financiero'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { formatCLP, formatPct, nombreMes } from '@/utils/formatters'
import { cn } from '@/lib/utils'

interface EstadoResultadoMensualProps {
  estadoResultado: EstadoResultadoMensual[]
  loading: boolean
  error: string | null
}

const COLUMNAS = 15

function sumar(rows: EstadoResultadoMensual[], campo: keyof EstadoResultadoMensual) {
  return rows.reduce((acc, r) => acc + r[campo], 0)
}

function celdaResultado(valor: number, negrita = false) {
  return (
    <TableCell className={cn('text-right tabular-nums', negrita && 'font-semibold', valor < 0 ? 'text-destructive' : 'text-success')}>
      {formatCLP(valor)}
    </TableCell>
  )
}

export default function EstadoResultadoMensualView({ estadoResultado, loading, error }: EstadoResultadoMensualProps) {
  if (error) return <p className="text-destructive">{error}</p>

  if (!loading && estadoResultado.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Todavía no hay datos para el estado de resultado"
        description="Aparece acá apenas haya OC, remuneraciones o ingresos cargados con mes y año."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Materiales</TableHead>
            <TableHead className="text-right">% Avance Materiales Fabrica</TableHead>
            <TableHead className="text-right">Mano de Obra</TableHead>
            <TableHead className="text-right">Gastos Operacionales</TableHead>
            <TableHead className="text-right">Fletes</TableHead>
            <TableHead className="text-right">Subtotal Costos Directos</TableHead>
            <TableHead className="text-right">Gastos Generales</TableHead>
            <TableHead className="text-right">Gastos Activados 2025</TableHead>
            <TableHead className="text-right">Total Costos</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="text-right">Margen</TableHead>
            <TableHead className="text-right">EBITDA</TableHead>
            <TableHead className="text-right">Margen Proforma</TableHead>
            <TableHead className="text-right">EBITDA Proforma</TableHead>
          </TableRow>
        </TableHeader>
        {loading ? (
          <TableSkeleton columns={COLUMNAS} />
        ) : (
          <>
            <TableBody>
              {estadoResultado.map((r) => (
                <TableRow key={`${r.anio}-${r.mes}`}>
                  <TableCell className="font-medium">
                    {nombreMes(r.mes)} {r.anio}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.materiales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(r.pct_avance_materiales_fabrica)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.mano_obra)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.gastos_operacionales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.fletes)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCLP(r.subtotal_costos_directos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.gastos_generales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.gastos_activados)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCLP(r.costos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCLP(r.ingresos)}</TableCell>
                  {celdaResultado(r.margen, true)}
                  {celdaResultado(r.ebitda)}
                  {celdaResultado(r.margen_proforma)}
                  {celdaResultado(r.ebitda_proforma)}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(sumar(estadoResultado, 'materiales'))}</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(sumar(estadoResultado, 'mano_obra'))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCLP(sumar(estadoResultado, 'gastos_operacionales'))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(sumar(estadoResultado, 'fletes'))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCLP(sumar(estadoResultado, 'subtotal_costos_directos'))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCLP(sumar(estadoResultado, 'gastos_generales'))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCLP(sumar(estadoResultado, 'gastos_activados'))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(sumar(estadoResultado, 'costos'))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCLP(sumar(estadoResultado, 'ingresos'))}</TableCell>
                {celdaResultado(sumar(estadoResultado, 'margen'), true)}
                {celdaResultado(sumar(estadoResultado, 'ebitda'), true)}
                {celdaResultado(sumar(estadoResultado, 'margen_proforma'), true)}
                {celdaResultado(sumar(estadoResultado, 'ebitda_proforma'), true)}
              </TableRow>
            </TableFooter>
          </>
        )}
      </Table>
    </div>
  )
}
