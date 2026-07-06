-- Migración 011: financiero_audit_log
-- Solo INSERT/UPDATE (por diseño no hay DELETE en presupuestos/ordenes_compra/
-- facturas — el borrado es lógico vía estado='ANULADA' — así el historial
-- queda siempre completo). Visibilidad admin-only.

CREATE TABLE IF NOT EXISTS public.financiero_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_afectada text NOT NULL,
  registro_id    uuid NOT NULL,
  accion         text NOT NULL CHECK (accion IN ('INSERT', 'UPDATE')),
  datos_previos  jsonb,
  datos_nuevos   jsonb NOT NULL,
  usuario_id     uuid REFERENCES public.user_profiles(id),
  fecha          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financiero_audit_log_tabla_registro_idx ON public.financiero_audit_log (tabla_afectada, registro_id);
CREATE INDEX IF NOT EXISTS financiero_audit_log_fecha_idx          ON public.financiero_audit_log (fecha DESC);

CREATE OR REPLACE FUNCTION public.fn_financiero_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.financiero_audit_log (tabla_afectada, registro_id, accion, datos_previos, datos_nuevos, usuario_id)
  VALUES (
    TG_TABLE_NAME,
    NEW.id,
    TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER financiero_audit_presupuestos_trigger
  AFTER INSERT OR UPDATE ON public.financiero_presupuestos
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

CREATE TRIGGER financiero_audit_ordenes_compra_trigger
  AFTER INSERT OR UPDATE ON public.financiero_ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

CREATE TRIGGER financiero_audit_facturas_trigger
  AFTER INSERT OR UPDATE ON public.financiero_facturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_audit_log();

ALTER TABLE public.financiero_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_audit_log_select" ON public.financiero_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- Sin políticas de escritura para authenticated: solo el trigger SECURITY
-- DEFINER (ejecutado por el rol dueño de la función, con BYPASSRLS) inserta.
