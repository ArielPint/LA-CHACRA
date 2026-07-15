-- fn_financiero_factura_actualizar_oc (009) recalculaba el estado de la OC
-- pero no el de las demás facturas de la misma línea — el BEFORE trigger solo
-- fija el estado de LA FILA que se inserta/actualiza. Al borrar o editar una
-- factura, sus hermanas quedaban con el estado (VALIDADA/SUPERA_OC) calculado
-- en el momento en que ellas mismas fueron insertadas/actualizadas, aunque el
-- total de la línea haya cambiado. Se recalcula también acá, con el mismo
-- criterio: sum(monto no-anuladas) > neto de la OC → SUPERA_OC para TODAS.

CREATE OR REPLACE FUNCTION public.fn_financiero_factura_actualizar_oc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oc_id  uuid;
  v_neto   numeric(15,2);
  v_total  numeric(15,2);
BEGIN
  FOR v_oc_id IN
    SELECT DISTINCT oc_id FROM (
      VALUES (CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.ordenes_compra_id END),
             (CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.ordenes_compra_id END)
    ) AS ids(oc_id)
    WHERE oc_id IS NOT NULL
  LOOP
    SELECT neto INTO v_neto FROM public.financiero_ordenes_compra WHERE id = v_oc_id;
    SELECT COALESCE(SUM(monto), 0) INTO v_total
    FROM public.financiero_facturas
    WHERE ordenes_compra_id = v_oc_id AND estado <> 'ANULADA';

    UPDATE public.financiero_ordenes_compra oc
    SET estado = CASE
                   WHEN oc.estado = 'ANULADA' THEN oc.estado
                   WHEN v_total >= v_neto THEN 'COMPLETA'
                   ELSE 'ABIERTA'
                 END,
        updated_at = now()
    WHERE oc.id = v_oc_id;

    UPDATE public.financiero_facturas f
    SET estado = CASE WHEN v_total > v_neto THEN 'SUPERA_OC' ELSE 'VALIDADA' END,
        updated_at = now()
    WHERE f.ordenes_compra_id = v_oc_id
      AND f.estado <> 'ANULADA'
      AND f.estado IS DISTINCT FROM (CASE WHEN v_total > v_neto THEN 'SUPERA_OC' ELSE 'VALIDADA' END);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;
