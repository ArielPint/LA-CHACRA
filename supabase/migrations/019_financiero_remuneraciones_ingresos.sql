-- Migración 019: financiero_remuneraciones (costo mensual de RRHH) y
-- financiero_ingresos (ingreso mensual del proyecto). MVP: un monto total por mes
-- cada una (sin desglose por concepto todavía, sin estado de pago todavía).

CREATE TABLE IF NOT EXISTS public.financiero_remuneraciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes          smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio         smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  monto        numeric(15,2) NOT NULL DEFAULT 0,
  observacion  text,
  created_by   uuid REFERENCES public.user_profiles(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT financiero_remuneraciones_unico UNIQUE (mes, anio)
);

ALTER TABLE public.financiero_remuneraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_remuneraciones_select" ON public.financiero_remuneraciones
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('remuneraciones'));
CREATE POLICY "financiero_remuneraciones_insert" ON public.financiero_remuneraciones
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('remuneraciones'));
CREATE POLICY "financiero_remuneraciones_update" ON public.financiero_remuneraciones
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('remuneraciones')) WITH CHECK (public.has_financiero_edit('remuneraciones'));

CREATE TABLE IF NOT EXISTS public.financiero_ingresos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes          smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio         smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  monto        numeric(15,2) NOT NULL DEFAULT 0,
  observacion  text,
  created_by   uuid REFERENCES public.user_profiles(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT financiero_ingresos_unico UNIQUE (mes, anio)
);

ALTER TABLE public.financiero_ingresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_ingresos_select" ON public.financiero_ingresos
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('ingresos'));
CREATE POLICY "financiero_ingresos_insert" ON public.financiero_ingresos
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('ingresos'));
CREATE POLICY "financiero_ingresos_update" ON public.financiero_ingresos
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('ingresos')) WITH CHECK (public.has_financiero_edit('ingresos'));

-- Auditoría: reutiliza el mismo trigger/función que ya usan presupuestos/OC/facturas.
CREATE TRIGGER financiero_remuneraciones_audit
  AFTER INSERT OR UPDATE ON public.financiero_remuneraciones
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

CREATE TRIGGER financiero_ingresos_audit
  AFTER INSERT OR UPDATE ON public.financiero_ingresos
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

ALTER PUBLICATION supabase_realtime ADD TABLE public.financiero_remuneraciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financiero_ingresos;
