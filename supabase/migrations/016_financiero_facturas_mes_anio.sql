-- Migración 016: completa mes/anio en financiero_facturas
-- La migración 013 nunca los seteó al importar (solo fecha quedó cargada),
-- por eso el agrupado mensual del dashboard colapsaba todas las facturas
-- reales en una sola clave "null-null" y el detalle por mes se veía en $0
-- aunque el Total sí sumaba bien. Se deriva siempre de fecha, tanto para las
-- filas históricas como para cualquier INSERT/UPDATE futuro (vía trigger),
-- así nunca vuelve a depender de que el cliente lo mande.

UPDATE public.financiero_facturas
SET mes = EXTRACT(MONTH FROM fecha)::smallint,
    anio = EXTRACT(YEAR FROM fecha)::smallint
WHERE mes IS NULL OR anio IS NULL;

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
  NEW.mes  := EXTRACT(MONTH FROM NEW.fecha)::smallint;
  NEW.anio := EXTRACT(YEAR FROM NEW.fecha)::smallint;

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
