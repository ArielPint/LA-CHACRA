import { Wallet } from 'lucide-react'
import type { SeguimientoPresupuesto } from '@/types/financiero'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { formatCLP, formatPct } from '@/utils/formatters'
import { exportarExcel } from '@/utils/exportExcel'
import { cn } from '@/lib/utils'

function colorAvance(pct: number) {
  if (pct >= 1) return 'text-destructive font-medium'
  if (pct >= 0.7) return 'text-amber-600 font-medium'
  return 'text-foreground'
}

interface TablaPresupuestoResumenProps {
  seguimiento: SeguimientoPresupuesto[]
  loading: boolean
  error: string | null
}

export default function TablaPresupuestoResumen({ seguimiento, loading, error }: TablaPresupuestoResumenProps) {
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          disabled={loading || seguimiento.length === 0}
          onClick={() =>
            exportarExcel(
              'presupuesto_resumen',
              seguimiento.map((row) => ({
                Nombre: row.nombre,
                Presupuesto: row.presupuesto_original,
                'OC Ingresadas': row.oc_ingresadas,
                Facturado: row.facturado,
                'Faltante por Facturar': row.faltante_por_facturar,
                '% Avance': row.pct_avance,
                'Déficit / Superávit': row.deficit_o_superavit,
              })),
            )
          }
        >
          Exportar a Excel
        </Button>
      </div>
      {!loading && seguimiento.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Todavía no hay presupuestos cargados"
          description="Los presupuestos creados van a aparecer acá con su seguimiento en tiempo real."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
                <TableHead className="text-right">OC Ingresadas</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Faltante por Facturar</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead className="text-right">Déficit / Superávit</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : (
              <TableBody>
                {seguimiento.map((row) => (
                  <TableRow key={row.presupuesto_id}>
                    <TableCell className="font-medium">{row.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(row.presupuesto_original)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(row.oc_ingresadas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(row.facturado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(row.faltante_por_facturar)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', colorAvance(row.pct_avance))}>
                      {formatPct(row.pct_avance)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        row.deficit_o_superavit < 0 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {formatCLP(row.deficit_o_superavit)}
                    </TableCell>
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
