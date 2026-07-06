import { useSeguimiento } from '@/hooks/useSeguimiento'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCLP, formatPct } from '@/utils/formatters'
import { exportarExcel } from '@/utils/exportExcel'
import { cn } from '@/lib/utils'

function colorAvance(pct: number) {
  if (pct >= 1) return 'text-destructive font-medium'
  if (pct >= 0.7) return 'text-amber-600 font-medium'
  return 'text-foreground'
}

export default function TablaPresupuestoResumen() {
  const { seguimiento, loading, error } = useSeguimiento()

  if (loading) return <p className="text-muted-foreground">Cargando…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
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
        <TableBody>
          {seguimiento.map((row) => (
            <TableRow key={row.presupuesto_id}>
              <TableCell className="font-medium">{row.nombre}</TableCell>
              <TableCell className="text-right">{formatCLP(row.presupuesto_original)}</TableCell>
              <TableCell className="text-right">{formatCLP(row.oc_ingresadas)}</TableCell>
              <TableCell className="text-right">{formatCLP(row.facturado)}</TableCell>
              <TableCell className="text-right">{formatCLP(row.faltante_por_facturar)}</TableCell>
              <TableCell className={cn('text-right', colorAvance(row.pct_avance))}>
                {formatPct(row.pct_avance)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right',
                  row.deficit_o_superavit < 0 ? 'text-destructive' : 'text-foreground',
                )}
              >
                {formatCLP(row.deficit_o_superavit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
