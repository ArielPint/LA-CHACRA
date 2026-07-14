-- Migración 026: sincronización automática de OC "Materiales Fabrica"
-- (codigo_articulo 100101) desde registro-gd (tablas ordenes_compra, oc_guias,
-- registro_compras — mismo proyecto Supabase, sin relación con RLS de
-- financiero) hacia financiero_ordenes_compra. Reemplaza el proceso manual de
-- las migraciones 024/025.
--
-- Monto = misma fórmula que usa registro-gd.html (getVTI): valor_total_item si
-- está cargado, si no valor_und * (cantidad_sol - devolucion), sumado sobre
-- todas las guías vinculadas a la OC vía oc_guias.
-- Proveedor: si ordenes_compra.proveedor viene cargado se usa tal cual; si no,
-- y la nota contiene "MP", se usa TECNOFAST (regla confirmada por el usuario
-- para la carga inicial); en cualquier otro caso queda sin proveedor.
--
-- Alcance deliberadamente limitado (no destructivo):
--  - Solo INSERT/UPDATE de ordenes_compra disparan sync directo; un DELETE de
--    OC en registro-gd NO borra la fila ya sincronizada en financiero (evita
--    borrados en cascada automáticos entre dos sistemas distintos).
--  - Cambios en oc_guias o registro_compras (agregar/quitar/editar una guía)
--    recalculan el monto de la(s) OC afectada(s).
--  - Corre con SECURITY DEFINER: quien carga una OC en registro-gd no
--    necesita permiso financiero_oc para que el reflejo se guarde.

CREATE INDEX IF NOT EXISTS oc_guias_gd_idx ON public.oc_guias (gd);

CREATE OR REPLACE FUNCTION public.fn_sync_oc_materiales(p_oc_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oc              public.ordenes_compra%ROWTYPE;
  v_presupuesto_id  uuid;
  v_monto           numeric(15,2);
  v_proveedor       text;
  v_detalle         text;
BEGIN
  SELECT * INTO v_oc FROM public.ordenes_compra WHERE id = p_oc_id;
  IF NOT FOUND THEN
    RETURN; -- la OC ya no existe en registro-gd; no se borra nada en financiero
  END IF;

  SELECT id INTO v_presupuesto_id FROM public.financiero_presupuestos WHERE codigo_articulo = '100101';
  IF v_presupuesto_id IS NULL THEN
    RETURN; -- no debería pasar, pero sin presupuesto destino no hay dónde sincronizar
  END IF;

  SELECT COALESCE(SUM(COALESCE(rc.valor_total_item, rc.valor_und * (COALESCE(rc.cantidad_sol, 0) - COALESCE(rc.devolucion, 0)))), 0)
  INTO v_monto
  FROM public.oc_guias og
  JOIN public.registro_compras rc ON rc.gd = og.gd
  WHERE og.oc_id = p_oc_id;

  v_detalle := NULLIF(v_oc.notas, '');
  v_proveedor := CASE
    WHEN NULLIF(v_oc.proveedor, '') IS NOT NULL THEN v_oc.proveedor
    WHEN v_detalle ILIKE '%MP%' THEN 'TECNOFAST'
    ELSE NULL
  END;

  INSERT INTO public.financiero_ordenes_compra
    (numero_oc, presupuesto_id, serie, proveedor_rut, nombre_proveedor_raw, fecha, neto, detalle, mes, anio)
  VALUES (
    v_oc.numero, v_presupuesto_id, '100101', NULL, v_proveedor,
    v_oc.fecha, v_monto, v_detalle,
    CASE WHEN v_oc.fecha IS NOT NULL THEN EXTRACT(MONTH FROM v_oc.fecha)::smallint END,
    CASE WHEN v_oc.fecha IS NOT NULL THEN EXTRACT(YEAR FROM v_oc.fecha)::smallint END
  )
  ON CONFLICT (numero_oc, presupuesto_id) DO UPDATE SET
    nombre_proveedor_raw = EXCLUDED.nombre_proveedor_raw,
    fecha                = EXCLUDED.fecha,
    neto                 = EXCLUDED.neto,
    detalle              = EXCLUDED.detalle,
    mes                  = EXCLUDED.mes,
    anio                 = EXCLUDED.anio,
    updated_at           = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trg_sync_oc_materiales_desde_oc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_sync_oc_materiales(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_oc_materiales_desde_oc
  AFTER INSERT OR UPDATE ON public.ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_oc_materiales_desde_oc();

CREATE OR REPLACE FUNCTION public.fn_trg_sync_oc_materiales_desde_guia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_sync_oc_materiales(COALESCE(NEW.oc_id, OLD.oc_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_oc_materiales_desde_guia
  AFTER INSERT OR UPDATE OR DELETE ON public.oc_guias
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_oc_materiales_desde_guia();

CREATE OR REPLACE FUNCTION public.fn_trg_sync_oc_materiales_desde_registro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oc_id text;
BEGIN
  FOR v_oc_id IN
    SELECT DISTINCT oc_id FROM public.oc_guias WHERE gd = COALESCE(NEW.gd, OLD.gd)
  LOOP
    PERFORM public.fn_sync_oc_materiales(v_oc_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_oc_materiales_desde_registro
  AFTER INSERT OR UPDATE OR DELETE ON public.registro_compras
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_sync_oc_materiales_desde_registro();
