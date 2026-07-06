import { useMemo, useState } from 'react'
import { useFacturas } from '@/hooks/useFacturas'
import { useOrdenesCompra } from '@/hooks/useOrdenesCompra'
import { usePresupuestosLookup } from '@/hooks/usePresupuestosLookup'
import { useAuth } from '@/hooks/useAuth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import FormularioFactura from '@/components/FormularioFactura'
import AlertaSobreepaso from '@/components/AlertaSobreepaso'
import VisorPDF from '@/components/VisorPDF'
import FiltrosFinanciero from '@/components/FiltrosFinanciero'
import { exportarExcel } from '@/utils/exportExcel'
import { Button } from '@/components/ui/button'
import { formatCLP, formatFecha } from '@/utils/formatters'
import { cn } from '@/lib/utils'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  VALIDADA: 'default',
  SUPERA_OC: 'destructive',
  ANULADA: 'secondary',
}

export default function Facturas() {
  const { canEditOC } = useAuth()
  const { facturas, loading, error, createFactura, updateFactura } = useFacturas()
  const { ordenesCompra } = useOrdenesCompra()
  const { presupuestos } = usePresupuestosLookup()
  const [search, setSearch] = useState('')
  const [presupuestoId, setPresupuestoId] = useState('')

  const ocPorId = useMemo(() => new Map(ordenesCompra.map((oc) => [oc.id, oc])), [ordenesCompra])
  const nombrePresupuesto = (presupuestoId: string | null) =>
    presupuestos.find((p) => p.id === presupuestoId)?.nombre ?? '—'

  const filtradas = useMemo(() => {
    return facturas.filter((f) => {
      if (presupuestoId && f.presupuesto_id !== presupuestoId) return false
      if (search) {
        const q = search.toLowerCase()
        const enNumero = f.numero_factura?.toLowerCase().includes(q)
        const enObs = f.observacion?.toLowerCase().includes(q)
        const enOc = ocPorId.get(f.ordenes_compra_id)?.numero_oc.toLowerCase().includes(q)
        if (!enNumero && !enObs && !enOc) return false
      }
      return true
    })
  }, [facturas, search, presupuestoId, ocPorId])

  const haySuperapaso = filtradas.some((f) => f.estado === 'SUPERA_OC')

  if (loading) return <p className="text-muted-foreground">Cargando…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      {haySuperapaso && <AlertaSobreepaso />}

      <div className="flex items-center justify-between">
        <FiltrosFinanciero
          search={search}
          onSearchChange={setSearch}
          presupuestoId={presupuestoId}
          onPresupuestoChange={setPresupuestoId}
          placeholder="Buscar por N° factura, OC u observación…"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarExcel(
                'facturas',
                filtradas.map((f) => ({
                  'N° Factura': f.numero_factura ?? '',
                  'N° OC': ocPorId.get(f.ordenes_compra_id)?.numero_oc ?? '',
                  Presupuesto: nombrePresupuesto(f.presupuesto_id),
                  Proveedor: f.proveedor_rut ?? '',
                  Fecha: f.fecha,
                  Monto: f.monto,
                  Observación: f.observacion ?? '',
                  Estado: f.estado,
                })),
              )
            }
          >
            Exportar a Excel
          </Button>
          {canEditOC && (
            <FormularioFactura ordenesCompra={ordenesCompra} onCreate={createFactura} onUpdate={updateFactura} />
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Factura</TableHead>
            <TableHead>N° OC</TableHead>
            <TableHead>Presupuesto</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Observación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>PDF</TableHead>
            {canEditOC && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtradas.map((f) => {
            const oc = ocPorId.get(f.ordenes_compra_id)
            return (
              <TableRow key={f.id} className={cn(f.estado === 'SUPERA_OC' && 'bg-destructive/10')}>
                <TableCell className="font-medium">{f.numero_factura ?? '(sin número)'}</TableCell>
                <TableCell>{oc?.numero_oc ?? '—'}</TableCell>
                <TableCell>{nombrePresupuesto(f.presupuesto_id)}</TableCell>
                <TableCell>{f.proveedor_rut ?? '—'}</TableCell>
                <TableCell>{formatFecha(f.fecha)}</TableCell>
                <TableCell className="text-right">{formatCLP(f.monto)}</TableCell>
                <TableCell className="max-w-56 truncate">{f.observacion ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[f.estado]}>{f.estado}</Badge>
                </TableCell>
                <TableCell>{f.pdf_path ? <VisorPDF pdfPath={f.pdf_path} /> : '—'}</TableCell>
                {canEditOC && (
                  <TableCell>
                    <FormularioFactura
                      factura={f}
                      ordenesCompra={ordenesCompra}
                      onCreate={createFactura}
                      onUpdate={updateFactura}
                    />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
