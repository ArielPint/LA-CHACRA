export type EstadoOC = 'ABIERTA' | 'COMPLETA' | 'ANULADA'
export type EstadoFactura = 'VALIDADA' | 'SUPERA_OC' | 'ANULADA'

export interface Proveedor {
  rut: string
  nombre: string | null
  created_at: string
  updated_at: string
}

export interface Presupuesto {
  id: string
  codigo_articulo: string
  nombre: string
  tarea_wip: string | null
  presupuesto_original: number
  valor_servicio: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ForecastPresupuesto {
  id: string
  presupuesto_id: string
  descripcion_tarea: string | null
  key_original: string | null
  mes: number
  anio: number
  monto_forecast: number | null
  created_at: string
  updated_at: string
}

export interface OrdenCompra {
  id: string
  numero_oc: string
  presupuesto_id: string
  serie: string | null
  proveedor_rut: string | null
  nombre_proveedor_raw: string | null
  fecha: string
  neto: number
  detalle: string | null
  mes: number | null
  anio: number | null
  estado: EstadoOC
  pdf_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Factura {
  id: string
  numero_factura: string | null
  ordenes_compra_id: string
  presupuesto_id: string | null
  proveedor_rut: string | null
  fecha: string
  monto: number
  observacion: string | null
  mes: number | null
  anio: number | null
  estado: EstadoFactura
  pdf_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SeguimientoPresupuesto {
  presupuesto_id: string
  codigo_articulo: string
  nombre: string
  presupuesto_original: number
  valor_servicio: number | null
  oc_ingresadas: number
  facturado: number
  faltante_por_facturar: number
  pct_avance: number
  deficit_o_superavit: number
}

export interface AuditLogEntry {
  id: string
  tabla_afectada: string
  registro_id: string
  accion: 'INSERT' | 'UPDATE'
  datos_previos: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown>
  usuario_id: string | null
  fecha: string
}
