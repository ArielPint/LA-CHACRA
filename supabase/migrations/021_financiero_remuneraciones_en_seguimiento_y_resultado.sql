-- Migración 021:
--  1) financiero_seguimiento_presupuesto: suma financiero_remuneraciones a
--     "facturado" para las partidas cuyo tarea_wip es 20010 (Mano de Obra
--     Directa Fabrica: categorías operaciones + administrativos) o 30124
--     (Remuneraciones Adm & Ventas: categoría adm_ventas). Con esto el gasto
--     real de mano de obra queda reflejado en facturado/% avance/gráficos del
--     dashboard, igual que cualquier otro gasto facturado.
--  2) financiero_estado_resultado_mensual: vista nueva con el estado de
--     resultado mensual (ingresos vs. costos — todas las facturas + toda
--     remuneraciones — y el resultado neto), para el dashboard.
--
-- Ambas vistas usan security_invoker = true: cada usuario ve solo lo que sus
-- políticas RLS le permiten en facturas/remuneraciones/ingresos (igual que ya
-- pasa con financiero_seguimiento_presupuesto desde la migración 010), así que
-- alguien sin acceso a la pestaña Remuneraciones simplemente no suma ese costo.

CREATE OR REPLACE VIEW public.financiero_seguimiento_presupuesto AS
SELECT
  p.id                                                                            AS presupuesto_id,
  p.codigo_articulo,
  p.nombre,
  p.presupuesto_original,
  p.valor_servicio,
  COALESCE(oc.total_oc, 0)                                                        AS oc_ingresadas,
  COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0)            AS facturado,
  COALESCE(oc.total_oc, 0)
    - (COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0))      AS faltante_por_facturar,
  CASE WHEN p.presupuesto_original = 0 THEN 0
       ELSE ROUND(
         (COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0)) / p.presupuesto_original,
         4
       )
  END                                                                              AS pct_avance,
  p.presupuesto_original - COALESCE(oc.total_oc, 0)                               AS deficit_o_superavit
FROM public.financiero_presupuestos p
LEFT JOIN (
  SELECT presupuesto_id, SUM(neto) AS total_oc
  FROM public.financiero_ordenes_compra WHERE estado <> 'ANULADA'
  GROUP BY presupuesto_id
) oc ON oc.presupuesto_id = p.id
LEFT JOIN (
  SELECT presupuesto_id, SUM(monto) AS total_facturado
  FROM public.financiero_facturas WHERE estado <> 'ANULADA'
  GROUP BY presupuesto_id
) f ON f.presupuesto_id = p.id
LEFT JOIN (
  SELECT
    CASE categoria
      WHEN 'operaciones'     THEN '20010'
      WHEN 'administrativos' THEN '20010'
      WHEN 'adm_ventas'      THEN '30124'
    END AS tarea_wip,
    SUM(monto) AS total_remuneraciones
  FROM public.financiero_remuneraciones
  GROUP BY 1
) r ON r.tarea_wip = p.tarea_wip;

ALTER VIEW public.financiero_seguimiento_presupuesto SET (security_invoker = true);

CREATE OR REPLACE VIEW public.financiero_estado_resultado_mensual AS
SELECT
  COALESCE(c.anio, i.anio)                            AS anio,
  COALESCE(c.mes, i.mes)                               AS mes,
  COALESCE(i.total_ingresos, 0)                        AS ingresos,
  COALESCE(c.total_costos, 0)                          AS costos,
  COALESCE(i.total_ingresos, 0) - COALESCE(c.total_costos, 0) AS resultado
FROM (
  SELECT anio, mes, SUM(monto) AS total_costos FROM (
    SELECT anio, mes, monto
    FROM public.financiero_facturas
    WHERE estado <> 'ANULADA' AND anio IS NOT NULL AND mes IS NOT NULL
    UNION ALL
    SELECT anio, mes, monto FROM public.financiero_remuneraciones
  ) todos_los_costos
  GROUP BY anio, mes
) c
FULL OUTER JOIN (
  SELECT anio, mes, SUM(monto) AS total_ingresos
  FROM public.financiero_ingresos
  GROUP BY anio, mes
) i ON i.anio = c.anio AND i.mes = c.mes;

ALTER VIEW public.financiero_estado_resultado_mensual SET (security_invoker = true);
