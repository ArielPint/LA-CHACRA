-- Migración 007: financiero_presupuestos (maestro) y financiero_forecast_presupuesto (mensual)
-- Admin-only de punta a punta: nadie más lee ni escribe estas dos tablas.

CREATE TABLE IF NOT EXISTS public.financiero_presupuestos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_articulo      text NOT NULL UNIQUE,
  nombre               text NOT NULL,
  tarea_wip            text,
  presupuesto_original numeric(15,2) NOT NULL DEFAULT 0,
  valor_servicio       numeric(15,2),
  activo               boolean NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financiero_presupuestos_codigo_idx ON public.financiero_presupuestos (codigo_articulo);

ALTER TABLE public.financiero_presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_presupuestos_select" ON public.financiero_presupuestos
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "financiero_presupuestos_insert" ON public.financiero_presupuestos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "financiero_presupuestos_update" ON public.financiero_presupuestos
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- financiero_forecast_presupuesto: desglose mensual (hoja BD_PRESUPUESTO del Excel real).
-- monto_forecast es nullable: los meses futuros del Excel llegan sin valor cargado todavía.
CREATE TABLE IF NOT EXISTS public.financiero_forecast_presupuesto (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id    uuid NOT NULL REFERENCES public.financiero_presupuestos(id) ON DELETE CASCADE,
  descripcion_tarea text,
  key_original      text,   -- columna "KEY" original del Excel, guardada para trazabilidad
  mes               smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio              smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  monto_forecast    numeric(15,2),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT financiero_forecast_presupuesto_unico UNIQUE (presupuesto_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS financiero_forecast_presupuesto_periodo_idx ON public.financiero_forecast_presupuesto (anio, mes);

ALTER TABLE public.financiero_forecast_presupuesto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_forecast_presupuesto_select" ON public.financiero_forecast_presupuesto
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "financiero_forecast_presupuesto_insert" ON public.financiero_forecast_presupuesto
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "financiero_forecast_presupuesto_update" ON public.financiero_forecast_presupuesto
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
