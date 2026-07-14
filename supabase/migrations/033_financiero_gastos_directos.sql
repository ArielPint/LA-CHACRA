-- Migración 033: financiero_gastos_directos — gastos mensuales que no entran
-- por OC/factura (ej. Arriendo WIP 50140, Gastos 2025 proyecto WIP 30130, o
-- cualquier otro costo cargado directo). Un monto por (presupuesto, mes, año),
-- igual patrón que financiero_remuneraciones/financiero_ingresos.

CREATE TABLE IF NOT EXISTS public.financiero_gastos_directos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid NOT NULL REFERENCES public.financiero_presupuestos(id),
  mes            smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio           smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  monto          numeric(15,2) NOT NULL DEFAULT 0,
  observacion    text,
  created_by     uuid REFERENCES public.user_profiles(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT financiero_gastos_directos_unico UNIQUE (presupuesto_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS financiero_gastos_directos_presupuesto_idx ON public.financiero_gastos_directos (presupuesto_id);

ALTER TABLE public.financiero_gastos_directos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_gastos_directos_select" ON public.financiero_gastos_directos
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('gastos-directos'));
CREATE POLICY "financiero_gastos_directos_insert" ON public.financiero_gastos_directos
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('gastos-directos'));
CREATE POLICY "financiero_gastos_directos_update" ON public.financiero_gastos_directos
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('gastos-directos')) WITH CHECK (public.has_financiero_edit('gastos-directos'));

CREATE TRIGGER financiero_gastos_directos_audit
  AFTER INSERT OR UPDATE ON public.financiero_gastos_directos
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

ALTER PUBLICATION supabase_realtime ADD TABLE public.financiero_gastos_directos;
