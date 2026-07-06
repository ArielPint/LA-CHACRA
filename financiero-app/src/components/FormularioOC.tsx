import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import UploadPDF from '@/components/UploadPDF'
import BuscadorPresupuestoWip from '@/components/BuscadorPresupuestoWip'
import { usePresupuestosLookup, type PresupuestoLookup } from '@/hooks/usePresupuestosLookup'
import { pdfPath, subirPdf } from '@/services/pdfStorage'
import type { OrdenCompra } from '@/types/financiero'

interface FormularioOCProps {
  ordenCompra?: OrdenCompra
  onCreate: (input: {
    numero_oc: string
    presupuesto_id: string
    proveedor_rut: string | null
    fecha: string
    neto: number
    detalle: string | null
    pdf_path: null
  }) => Promise<OrdenCompra>
  onUpdate: (id: string, patch: Partial<OrdenCompra>) => Promise<OrdenCompra>
}

export default function FormularioOC({ ordenCompra, onCreate, onUpdate }: FormularioOCProps) {
  const { presupuestos } = usePresupuestosLookup()
  const [open, setOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const esEdicion = !!ordenCompra
  const presupuestoActual = presupuestos.find((p) => p.id === ordenCompra?.presupuesto_id)

  const [numeroOc, setNumeroOc] = useState(ordenCompra?.numero_oc ?? '')
  const [codigoWip, setCodigoWip] = useState(presupuestoActual?.tarea_wip ?? '')
  const [presupuesto, setPresupuesto] = useState<PresupuestoLookup | null>(presupuestoActual ?? null)
  const [proveedorRut, setProveedorRut] = useState(ordenCompra?.proveedor_rut ?? '')
  const [fecha, setFecha] = useState(ordenCompra?.fecha ?? new Date().toISOString().slice(0, 10))
  const [neto, setNeto] = useState(String(ordenCompra?.neto ?? ''))
  const [detalle, setDetalle] = useState(ordenCompra?.detalle ?? '')
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!presupuesto) {
      toast.error('Ingresá un código WIP válido')
      return
    }
    setEnviando(true)
    try {
      let registro: OrdenCompra
      if (esEdicion && ordenCompra) {
        registro = await onUpdate(ordenCompra.id, {
          numero_oc: numeroOc,
          presupuesto_id: presupuesto.id,
          proveedor_rut: proveedorRut || null,
          fecha,
          neto: Number(neto),
          detalle: detalle || null,
        })
      } else {
        registro = await onCreate({
          numero_oc: numeroOc,
          presupuesto_id: presupuesto.id,
          proveedor_rut: proveedorRut || null,
          fecha,
          neto: Number(neto),
          detalle: detalle || null,
          pdf_path: null,
        })
      }

      if (archivoPdf) {
        const path = pdfPath('oc', presupuesto.codigo_articulo, registro.id)
        await subirPdf(archivoPdf, path)
        await onUpdate(registro.id, { pdf_path: path })
      }

      toast.success(esEdicion ? 'OC actualizada' : 'OC creada')
      if (!esEdicion) {
        setNumeroOc('')
        setCodigoWip('')
        setPresupuesto(null)
        setProveedorRut('')
        setNeto('')
        setDetalle('')
        setArchivoPdf(null)
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la OC')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={esEdicion ? 'outline' : 'default'} size={esEdicion ? 'sm' : 'default'}>
          {esEdicion ? 'Editar' : 'Nueva OC'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numero_oc">N° OC</Label>
            <Input id="numero_oc" value={numeroOc} onChange={(e) => setNumeroOc(e.target.value)} required />
          </div>
          <BuscadorPresupuestoWip codigoWip={codigoWip} onCodigoWipChange={setCodigoWip} onResolved={setPresupuesto} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proveedor_rut">RUT proveedor</Label>
            <Input id="proveedor_rut" value={proveedorRut ?? ''} onChange={(e) => setProveedorRut(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="neto">Neto (CLP)</Label>
            <Input id="neto" type="number" min="0" step="1" value={neto} onChange={(e) => setNeto(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detalle">Detalle</Label>
            <Textarea id="detalle" value={detalle ?? ''} onChange={(e) => setDetalle(e.target.value)} />
          </div>
          <UploadPDF tienePdfExistente={!!ordenCompra?.pdf_path} onFileChange={setArchivoPdf} />
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
