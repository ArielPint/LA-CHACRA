-- Migración 034: incorpora financiero_gastos_directos (migración 033) al
-- costo de financiero_seguimiento_presupuesto (facturado) y de
-- financiero_estado_resultado_mensual (costo mensual por categoría), igual
-- que ya se hace con remuneraciones — para que Arriendo, Gastos 2025 proyecto
-- y cualquier otro gasto cargado ahí cuenten como costo real.

CREATE OR REPLACE VIEW public.financiero_seguimiento_presupuesto AS
SELECT
  p.id                                                                                                AS presupuesto_id,
  p.codigo_articulo,
  p.nombre,
  p.presupuesto_original,
  p.valor_servicio,
  COALESCE(oc.total_oc, 0)                                                                             AS oc_ingresadas,
  COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0) + COALESCE(g.total_gastos, 0)    AS facturado,
  COALESCE(oc.total_oc, 0)
    - (COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0) + COALESCE(g.total_gastos, 0)) AS faltante_por_facturar,
  CASE WHEN p.presupuesto_original = 0 THEN 0
       ELSE ROUND(
         (COALESCE(f.total_facturado, 0) + COALESCE(r.total_remuneraciones, 0) + COALESCE(g.total_gastos, 0)) / p.presupuesto_original,
         4
       )
  END                                                                                                   AS pct_avance,
  p.presupuesto_original - COALESCE(oc.total_oc, 0)                                                    AS deficit_o_superavit,
  COALESCE(fc.monto_forecast, p.presupuesto_original)                                                  AS forecast_actual
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
LEFT JOIN (
  SELECT presupuesto_id, SUM(monto) AS total_gastos
  FROM public.financiero_gastos_directos
  GROUP BY presupuesto_id
) g ON g.presupuesto_id = p.id
LEFT JOIN LATERAL (
  SELECT fp.monto_forecast
  FROM public.financiero_forecast_presupuesto fp
  WHERE fp.presupuesto_id = p.id AND fp.monto_forecast IS NOT NULL
  ORDER BY fp.anio DESC, fp.mes DESC
  LIMIT 1
) fc ON true;

ALTER VIEW public.financiero_seguimiento_presupuesto SET (security_invoker = true);

CREATE OR REPLACE VIEW public.financiero_estado_resultado_mensual AS
WITH costo_materiales_oc AS (
  SELECT p.codigo_articulo, oc.mes, oc.anio, SUM(oc.neto) AS monto
  FROM public.financiero_ordenes_compra oc
  JOIN public.financiero_presupuestos p ON p.id = oc.presupuesto_id
  WHERE oc.estado <> 'ANULADA' AND oc.mes IS NOT NULL AND oc.anio IS NOT NULL
    AND p.codigo_articulo IN ('100101', '100132', '100703', '101204')
  GROUP BY p.codigo_articulo, oc.mes, oc.anio
),
costo_facturas AS (
  SELECT p.codigo_articulo, f.mes, f.anio, SUM(f.monto) AS monto
  FROM public.financiero_facturas f
  JOIN public.financiero_presupuestos p ON p.id = f.presupuesto_id
  WHERE f.estado <> 'ANULADA' AND f.mes IS NOT NULL AND f.anio IS NOT NULL
    AND p.codigo_articulo NOT IN ('100101', '100132', '100703', '101204')
  GROUP BY p.codigo_articulo, f.mes, f.anio
),
costo_remuneraciones AS (
  SELECT
    CASE r.categoria
      WHEN 'operaciones'     THEN '200105'
      WHEN 'administrativos' THEN '200105'
      WHEN 'adm_ventas'      THEN '3012415'
    END AS codigo_articulo,
    r.mes, r.anio, SUM(r.monto) AS monto
  FROM public.financiero_remuneraciones r
  GROUP BY 1, r.mes, r.anio
),
costo_gastos_directos AS (
  SELECT p.codigo_articulo, g.mes, g.anio, SUM(g.monto) AS monto
  FROM public.financiero_gastos_directos g
  JOIN public.financiero_presupuestos p ON p.id = g.presupuesto_id
  GROUP BY p.codigo_articulo, g.mes, g.anio
),
costo AS (
  SELECT codigo_articulo, mes, anio, monto FROM costo_materiales_oc
  UNION ALL
  SELECT codigo_articulo, mes, anio, monto FROM costo_facturas
  UNION ALL
  SELECT codigo_articulo, mes, anio, monto FROM costo_remuneraciones
  UNION ALL
  SELECT codigo_articulo, mes, anio, monto FROM costo_gastos_directos
),
categorizado AS (
  SELECT
    mes, anio, monto,
    CASE codigo_articulo
      WHEN '100101' THEN 'materiales'
      WHEN '100132' THEN 'materiales'
      WHEN '100703' THEN 'materiales'
      WHEN '101204' THEN 'materiales'
      WHEN '200105' THEN 'mano_obra'
      WHEN '200206' THEN 'mano_obra'
      WHEN '200307' THEN 'mano_obra'
      WHEN '200408' THEN 'mano_obra'
      WHEN '200609' THEN 'mano_obra'
      WHEN '8201010' THEN 'gastos_operacionales'
      WHEN '5014012' THEN 'gastos_operacionales'
      WHEN '8204013' THEN 'gastos_operacionales'
      WHEN '4003714' THEN 'fletes'
      WHEN '3012415' THEN 'gastos_generales'
      WHEN '3012516' THEN 'gastos_generales'
      WHEN '3013017' THEN 'gastos_activados'
    END AS categoria,
    CASE WHEN codigo_articulo = '5014012' THEN monto ELSE 0 END AS monto_arriendo,
    CASE WHEN codigo_articulo = '100101' THEN monto ELSE 0 END AS monto_materiales_fabrica
  FROM costo
),
costo_mensual AS (
  SELECT
    anio, mes,
    SUM(CASE WHEN categoria = 'materiales' THEN monto ELSE 0 END)             AS materiales,
    SUM(CASE WHEN categoria = 'mano_obra' THEN monto ELSE 0 END)              AS mano_obra,
    SUM(CASE WHEN categoria = 'gastos_operacionales' THEN monto ELSE 0 END)   AS gastos_operacionales,
    SUM(CASE WHEN categoria = 'fletes' THEN monto ELSE 0 END)                AS fletes,
    SUM(CASE WHEN categoria IN ('materiales','mano_obra','gastos_operacionales','fletes') THEN monto ELSE 0 END)
                                                                               AS subtotal_costos_directos,
    SUM(CASE WHEN categoria = 'gastos_generales' THEN monto ELSE 0 END)       AS gastos_generales,
    SUM(CASE WHEN categoria = 'gastos_activados' THEN monto ELSE 0 END)       AS gastos_activados,
    SUM(monto)                                                                AS total_costos,
    SUM(monto_arriendo)                                                       AS arriendo,
    SUM(monto_materiales_fabrica)                                             AS materiales_fabrica
  FROM categorizado
  GROUP BY anio, mes
),
ingreso_mensual AS (
  SELECT anio, mes, SUM(monto) AS total_ingresos
  FROM public.financiero_ingresos
  GROUP BY anio, mes
),
presupuesto_materiales_fabrica AS (
  SELECT presupuesto_original FROM public.financiero_presupuestos WHERE codigo_articulo = '100101'
)
SELECT
  COALESCE(c.anio, i.anio)                                       AS anio,
  COALESCE(c.mes, i.mes)                                         AS mes,
  COALESCE(c.materiales, 0)                                      AS materiales,
  COALESCE(c.mano_obra, 0)                                       AS mano_obra,
  COALESCE(c.gastos_operacionales, 0)                            AS gastos_operacionales,
  COALESCE(c.fletes, 0)                                          AS fletes,
  COALESCE(c.subtotal_costos_directos, 0)                        AS subtotal_costos_directos,
  COALESCE(c.gastos_generales, 0)                                AS gastos_generales,
  COALESCE(c.gastos_activados, 0)                                AS gastos_activados,
  COALESCE(c.total_costos, 0)                                    AS costos,
  COALESCE(i.total_ingresos, 0)                                  AS ingresos,
  COALESCE(i.total_ingresos, 0) - COALESCE(c.total_costos, 0)    AS margen,
  COALESCE(i.total_ingresos, 0) - COALESCE(c.total_costos, 0)
    + COALESCE(c.arriendo, 0)                                    AS ebitda,
  COALESCE(i.total_ingresos, 0) - COALESCE(c.total_costos, 0)
    + COALESCE(c.gastos_activados, 0)                            AS margen_proforma,
  COALESCE(i.total_ingresos, 0) - COALESCE(c.total_costos, 0)
    + COALESCE(c.arriendo, 0) + COALESCE(c.gastos_activados, 0)  AS ebitda_proforma,
  CASE WHEN pm.presupuesto_original > 0
       THEN ROUND(COALESCE(c.materiales_fabrica, 0) / pm.presupuesto_original, 4)
       ELSE 0
  END                                                             AS pct_avance_materiales_fabrica
FROM costo_mensual c
FULL OUTER JOIN ingreso_mensual i ON i.anio = c.anio AND i.mes = c.mes
CROSS JOIN presupuesto_materiales_fabrica pm;

ALTER VIEW public.financiero_estado_resultado_mensual SET (security_invoker = true);
