-- Migración 035: en el Estado de Resultado, las OC de Materiales fechadas en
-- 2025 (nov/dic, antes del arranque del proyecto en el sistema) se suman en
-- enero 2026 en vez de aparecer en meses 2025 sueltos — enero no tenía
-- ninguna OC de materiales cargada (verificado), así que no hay superposición.

CREATE OR REPLACE VIEW public.financiero_estado_resultado_mensual AS
WITH costo_materiales_oc AS (
  SELECT
    p.codigo_articulo,
    CASE WHEN oc.anio < 2026 THEN 1::smallint ELSE oc.mes END   AS mes,
    CASE WHEN oc.anio < 2026 THEN 2026::smallint ELSE oc.anio END AS anio,
    SUM(oc.neto) AS monto
  FROM public.financiero_ordenes_compra oc
  JOIN public.financiero_presupuestos p ON p.id = oc.presupuesto_id
  WHERE oc.estado <> 'ANULADA' AND oc.mes IS NOT NULL AND oc.anio IS NOT NULL
    AND p.codigo_articulo IN ('100101', '100132', '100703', '101204')
  GROUP BY p.codigo_articulo,
    CASE WHEN oc.anio < 2026 THEN 1::smallint ELSE oc.mes END,
    CASE WHEN oc.anio < 2026 THEN 2026::smallint ELSE oc.anio END
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
