-- Migración 022: agrega forecast_actual (el forecast mensual con monto no nulo
-- más reciente de cada presupuesto) a financiero_seguimiento_presupuesto, para
-- mostrar "Presupuesto (original)" vs "Forecast (más actualizado)" en el
-- dashboard. Si un presupuesto nunca tuvo forecast cargado, cae al original.

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
  p.presupuesto_original - COALESCE(oc.total_oc, 0)                               AS deficit_o_superavit,
  COALESCE(fc.monto_forecast, p.presupuesto_original)                             AS forecast_actual
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
) r ON r.tarea_wip = p.tarea_wip
LEFT JOIN LATERAL (
  SELECT fp.monto_forecast
  FROM public.financiero_forecast_presupuesto fp
  WHERE fp.presupuesto_id = p.id AND fp.monto_forecast IS NOT NULL
  ORDER BY fp.anio DESC, fp.mes DESC
  LIMIT 1
) fc ON true;

ALTER VIEW public.financiero_seguimiento_presupuesto SET (security_invoker = true);
