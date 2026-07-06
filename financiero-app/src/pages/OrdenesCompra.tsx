import { useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useOrdenesCompra } from '@/hooks/useOrdenesCompra'
import { usePresupuestosLookup } from '@/hooks/usePresupuestosLookup'
import { useAuth } from '@/hooks/useAuth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import FiltrosFinanciero from '@/components/FiltrosFinanciero'
import FormularioOC from '@/components/FormularioOC'
import VisorPDF from '@/components/VisorPDF'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { formatCLP, formatFecha } from '@/utils/formatters'
import { exportarExcel } from '@/utils/exportExcel'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ABIERTA: 'secondary',
  COMPLETA: 'default',
  ANULADA: 'destructive',
}

export default function OrdenesCompra() {
  const { canEditOC } = useAuth()
  const { ordenesCompra, loading, error, createOrdenCompra, updateOrdenCompra } = useOrdenesCompra()
  const { presupuestos } = usePresupuestosLookup()
  const [search, setSearch] = useState('')
  const [presupuestoId, setPresupuestoId] = useState('')

  const nombrePresupuesto = (id: string) => presupuestos.find((p) => p.id === id)?.nombre ?? '—'

  const filtradas = useMemo(() => {
    return ordenesCompra.filter((oc) => {
      if (presupuestoId && oc.presupuesto_id !== presupuestoId) return false
      if (search) {
        const q = search.toLowerCase()
        const enDetalle = oc.detalle?.toLowerCase().includes(q)
        const enNumero = oc.numero_oc.toLowerCase().includes(q)
        if (!enDetalle && !enNumero) return false
      }
      return true
    })
  }, [ordenesCompra, search, presupuestoId])

  if (error) return <p className="text-destructive">{error}</p>

  const hayFiltrosActivos = !!search || !!presupuestoId
  const columnas = 8 + (canEditOC ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FiltrosFinanciero
          search={search}
          onSearchChange={setSearch}
          presupuestoId={presupuestoId}
          onPresupuestoChange={setPresupuestoId}
          placeholder="Buscar por N° OC o detalle…"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading || filtradas.length === 0}
            onClick={() =>
              exportarExcel(
                'ordenes_compra',
                filtradas.map((oc) => ({
                  'N° OC': oc.numero_oc,
                  Presupuesto: nombrePresupuesto(oc.presupuesto_id),
                  Proveedor: oc.proveedor_rut ?? '',
                  Fecha: oc.fecha,
                  Neto: oc.neto,
                  Detalle: oc.detalle ?? '',
                  Estado: oc.estado,
                })),
              )
            }
          >
            Exportar a Excel
          </Button>
          {canEditOC && <FormularioOC onCreate={createOrdenCompra} onUpdate={updateOrdenCompra} />}
        </div>
      </div>

      {!loading && filtradas.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={hayFiltrosActivos ? 'Ninguna OC coincide con el filtro' : 'Todavía no hay órdenes de compra'}
          description={
            hayFiltrosActivos
              ? 'Probá con otro término de búsqueda o quitá el filtro de presupuesto.'
              : canEditOC
                ? 'Creá la primera con el botón "Nueva OC".'
                : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° OC</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>PDF</TableHead>
                {canEditOC && <TableHead />}
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableSkeleton columns={columnas} />
            ) : (
              <TableBody>
                {filtradas.map((oc) => (
                  <TableRow key={oc.id}>
                    <TableCell className="font-medium">{oc.numero_oc}</TableCell>
                    <TableCell>{nombrePresupuesto(oc.presupuesto_id)}</TableCell>
                    <TableCell>{oc.proveedor_rut ?? '—'}</TableCell>
                    <TableCell>{formatFecha(oc.fecha)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCLP(oc.neto)}</TableCell>
                    <TableCell className="max-w-56 truncate">{oc.detalle ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[oc.estado]}>{oc.estado}</Badge>
                    </TableCell>
                    <TableCell>{oc.pdf_path ? <VisorPDF pdfPath={oc.pdf_path} /> : '—'}</TableCell>
                    {canEditOC && (
                      <TableCell>
                        <FormularioOC ordenCompra={oc} onCreate={createOrdenCompra} onUpdate={updateOrdenCompra} />
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
