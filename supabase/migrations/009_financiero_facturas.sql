-- Migración 009: financiero_facturas + validación automática
-- numero_factura NO es único por sí solo (una factura real puede repartirse
-- entre varias líneas de OC, ej. factura 15658 en el Excel real) y puede
-- llegar sin número capturado todavía (verificado: al menos un caso real).
-- Clave natural: (numero_factura, ordenes_compra_id).
-- Una línea de OC puede tener muchas facturas (1:N verificado en datos reales,
-- NO 1:1 como se asumió originalmente) — el trigger suma todas las no-anuladas.

CREATE TABLE IF NOT EXISTS public.financiero_facturas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura    text,
  ordenes_compra_id uuid NOT NULL REFERENCES public.financiero_ordenes_compra(id),
  presupuesto_id    uuid REFERENCES public.financiero_presupuestos(id),  -- denormalizado; el trigger lo sobrescribe siempre
  proveedor_rut     text REFERENCES public.financiero_proveedores(rut),
  fecha             date NOT NULL,
  monto             numeric(15,2) NOT NULL DEFAULT 0,
  observacion       text,
  mes               smallint CHECK (mes BETWEEN 1 AND 12),
  anio              smallint CHECK (anio BETWEEN 2000 AND 2100),
  estado            text NOT NULL DEFAULT 'VALIDADA'
                       CHECK (estado IN ('VALIDADA', 'SUPERA_OC', 'ANULADA')),
  pdf_path          text,
  created_by        uuid REFERENCES public.user_profiles(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT financiero_facturas_natural_key UNIQUE (numero_factura, ordenes_compra_id)
);

CREATE INDEX IF NOT EXISTS financiero_facturas_oc_idx          ON public.financiero_facturas (ordenes_compra_id);
CREATE INDEX IF NOT EXISTS financiero_facturas_presupuesto_idx ON public.financiero_facturas (presupuesto_id);
CREATE INDEX IF NOT EXISTS financiero_facturas_proveedor_idx   ON public.financiero_facturas (proveedor_rut);

-- BEFORE: fija presupuesto_id desde la OC (nunca se confía en lo que mande el
-- cliente) y calcula el estado de ESTA factura según la suma acumulada de la línea de OC.
CREATE OR REPLACE FUNCTION public.fn_financiero_factura_calcular_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_presupuesto_id uuid;
  v_neto           numeric(15,2);
  v_suma_otras     numeric(15,2);
BEGIN
  IF NEW.estado = 'ANULADA' THEN
    RETURN NEW;
  END IF;

  SELECT presupuesto_id, neto INTO v_presupuesto_id, v_neto
  FROM public.financiero_ordenes_compra WHERE id = NEW.ordenes_compra_id;

  NEW.presupuesto_id := v_presupuesto_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_suma_otras
  FROM public.financiero_facturas
  WHERE ordenes_compra_id = NEW.ordenes_compra_id
    AND estado <> 'ANULADA'
    AND id IS DISTINCT FROM NEW.id;

  IF (v_suma_otras + NEW.monto) > v_neto THEN
    NEW.estado := 'SUPERA_OC';
  ELSE
    NEW.estado := 'VALIDADA';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER financiero_facturas_calcular_estado_trigger
  BEFORE INSERT OR UPDATE ON public.financiero_facturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_factura_calcular_estado();

-- AFTER: recalcula el estado de la(s) línea(s) de OC afectada(s) (ABIERTA/COMPLETA)
-- según la suma de sus facturas no-anuladas vs. el neto. No toca una OC que ya
-- esté ANULADA manualmente.
CREATE OR REPLACE FUNCTION public.fn_financiero_factura_actualizar_oc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oc_id uuid;
BEGIN
  FOR v_oc_id IN
    SELECT DISTINCT oc_id FROM (
      VALUES (CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.ordenes_compra_id END),
             (CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.ordenes_compra_id END)
    ) AS ids(oc_id)
    WHERE oc_id IS NOT NULL
  LOOP
    UPDATE public.financiero_ordenes_compra oc
    SET estado = CASE
                   WHEN oc.estado = 'ANULADA' THEN oc.estado
                   WHEN (SELECT COALESCE(SUM(f.monto), 0) FROM public.financiero_facturas f
                         WHERE f.ordenes_compra_id = v_oc_id AND f.estado <> 'ANULADA') >= oc.neto
                     THEN 'COMPLETA'
                   ELSE 'ABIERTA'
                 END,
        updated_at = now()
    WHERE oc.id = v_oc_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER financiero_facturas_actualizar_oc_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.financiero_facturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_financiero_factura_actualizar_oc();

ALTER TABLE public.financiero_facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_facturas_select" ON public.financiero_facturas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "financiero_facturas_insert" ON public.financiero_facturas
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_oc_permiso());

CREATE POLICY "financiero_facturas_update" ON public.financiero_facturas
  FOR UPDATE TO authenticated
  USING (public.has_financiero_oc_permiso())
  WITH CHECK (public.has_financiero_oc_permiso());

-- Sin política DELETE: el borrado es lógico vía estado = 'ANULADA'.
