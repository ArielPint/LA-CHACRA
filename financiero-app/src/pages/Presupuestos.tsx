import { usePresupuestos } from '@/hooks/usePresupuestos'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import FormularioPresupuesto from '@/components/FormularioPresupuesto'
import { formatCLP } from '@/utils/formatters'

export default function Presupuestos() {
  const { presupuestos, loading, error, createPresupuesto, updatePresupuesto } = usePresupuestos()

  if (loading) return <p className="text-muted-foreground">Cargando…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormularioPresupuesto onCreate={createPresupuesto} onUpdate={updatePresupuesto} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Tarea WIP</TableHead>
            <TableHead className="text-right">Presupuesto Original</TableHead>
            <TableHead className="text-right">Valor Servicio</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {presupuestos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.codigo_articulo}</TableCell>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.tarea_wip ?? '—'}</TableCell>
              <TableCell className="text-right">{formatCLP(p.presupuesto_original)}</TableCell>
              <TableCell className="text-right">{formatCLP(p.valor_servicio)}</TableCell>
              <TableCell>
                <FormularioPresupuesto presupuesto={p} onCreate={createPresupuesto} onUpdate={updatePresupuesto} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
