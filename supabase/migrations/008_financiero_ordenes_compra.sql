-- Migración 008: financiero_ordenes_compra
-- Nombre prefijado a propósito: ya existe public.ordenes_compra (otro módulo,
-- Compras/Despachos GD, id text, sin relación con presupuestos) no versionado
-- en las migraciones locales — se detectó al listar tablas en la base real.
-- numero_oc NO es único por sí solo: una misma OC real puede repartirse entre
-- varias partidas presupuestarias (verificado en el Excel real, ej. OC 5531).
-- La clave natural de una línea de OC es (numero_oc, presupuesto_id).

CREATE TABLE IF NOT EXISTS public.financiero_ordenes_compra (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_oc            text NOT NULL,
  presupuesto_id       uuid NOT NULL REFERENCES public.financiero_presupuestos(id),
  serie                text,   -- columna SERIE original del Excel, redundante con codigo_articulo pero se conserva
  proveedor_rut        text REFERENCES public.financiero_proveedores(rut),
  nombre_proveedor_raw text,   -- columna NOMBRE de la hoja OC (nombre de la tarea, no del proveedor; se conserva igual)
  fecha                date NOT NULL,
  neto                 numeric(15,2) NOT NULL DEFAULT 0,
  detalle              text,
  mes                  smallint CHECK (mes BETWEEN 1 AND 12),
  anio                 smallint CHECK (anio BETWEEN 2000 AND 2100),
  estado               text NOT NULL DEFAULT 'ABIERTA'
                          CHECK (estado IN ('ABIERTA', 'COMPLETA', 'ANULADA')),
  pdf_path             text,
  created_by           uuid REFERENCES public.user_profiles(id),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  CONSTRAINT financiero_ordenes_compra_natural_key UNIQUE (numero_oc, presupuesto_id)
);

CREATE INDEX IF NOT EXISTS financiero_ordenes_compra_presupuesto_idx ON public.financiero_ordenes_compra (presupuesto_id);
CREATE INDEX IF NOT EXISTS financiero_ordenes_compra_numero_idx      ON public.financiero_ordenes_compra (numero_oc);
CREATE INDEX IF NOT EXISTS financiero_ordenes_compra_proveedor_idx   ON public.financiero_ordenes_compra (proveedor_rut);

ALTER TABLE public.financiero_ordenes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_ordenes_compra_select" ON public.financiero_ordenes_compra
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "financiero_ordenes_compra_insert" ON public.financiero_ordenes_compra
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_oc_permiso());

CREATE POLICY "financiero_ordenes_compra_update" ON public.financiero_ordenes_compra
  FOR UPDATE TO authenticated
  USING (public.has_financiero_oc_permiso())
  WITH CHECK (public.has_financiero_oc_permiso());

-- Sin política DELETE: el borrado es lógico vía estado = 'ANULADA', para que
-- el audit_log (migración 011) quede siempre completo.
