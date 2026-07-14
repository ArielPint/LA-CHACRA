import { TrendingUp } from 'lucide-react'
import type { EstadoResultadoMensual } from '@/types/financiero'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { formatCLP, formatPct, nombreMes } from '@/utils/formatters'
import { cn } from '@/lib/utils'

interface EstadoResultadoMensualProps {
  estadoResultado: EstadoResultadoMensual[]
  loading: boolean
  error: string | null
}

type CampoNumerico = Exclude<keyof EstadoResultadoMensual, 'anio' | 'mes'>

interface FilaMetrica {
  campo: CampoNumerico
  label: string
  esPct?: boolean
  esSubtotal?: boolean
  esResultado?: boolean
}

const FILAS: FilaMetrica[] = [
  { campo: 'materiales', label: 'Materiales' },
  { campo: 'pct_avance_materiales_fabrica', label: '% Avance Materiales Fabrica', esPct: true },
  { campo: 'mano_obra', label: 'Mano de Obra' },
  { campo: 'gastos_operacionales', label: 'Gastos Operacionales' },
  { campo: 'fletes', label: 'Fletes' },
  { campo: 'subtotal_costos_directos', label: 'Subtotal Costos Directos', esSubtotal: true },
  { campo: 'gastos_generales', label: 'Gastos Generales' },
  { campo: 'gastos_activados', label: 'Gastos Activados 2025' },
  { campo: 'costos', label: 'Total Costos', esSubtotal: true },
  { campo: 'ingresos', label: 'Ingresos' },
  { campo: 'margen', label: 'Margen', esResultado: true },
  { campo: 'ebitda', label: 'EBITDA', esResultado: true },
  { campo: 'margen_proforma', label: 'Margen Proforma', esResultado: true },
  { campo: 'ebitda_proforma', label: 'EBITDA Proforma', esResultado: true },
]

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
            <TableHead>Categoría</TableHead>
            {estadoResultado.map((r) => (
              <TableHead key={`${r.anio}-${r.mes}`} className="text-right whitespace-nowrap">
                {nombreMes(r.mes).slice(0, 3)} {r.anio}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        {loading ? (
          <TableSkeleton columns={estadoResultado.length + 2} rows={FILAS.length} />
        ) : (
          <TableBody>
            {FILAS.map((fila) => {
              const total = fila.esPct ? null : estadoResultado.reduce((acc, r) => acc + r[fila.campo], 0)
              return (
                <TableRow key={fila.campo}>
                  <TableCell className={cn('font-medium', fila.esSubtotal && 'font-semibold')}>{fila.label}</TableCell>
                  {estadoResultado.map((r) => {
                    const valor = r[fila.campo]
                    return (
                      <TableCell
                        key={`${r.anio}-${r.mes}`}
                        className={cn(
                          'text-right tabular-nums',
                          fila.esSubtotal && 'font-semibold',
                          fila.esResultado && cn('font-semibold', valor < 0 ? 'text-destructive' : 'text-success'),
                        )}
                      >
                        {fila.esPct ? formatPct(valor) : formatCLP(valor)}
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={cn(
                      'text-right font-semibold tabular-nums',
                      fila.esResultado && total !== null && (total < 0 ? 'text-destructive' : 'text-success'),
                    )}
                  >
                    {total === null ? '—' : formatCLP(total)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        )}
      </Table>
    </div>
  )
}
