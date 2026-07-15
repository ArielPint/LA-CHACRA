-- Migración 036: vista de detalle por partida para el Estado de Resultado,
-- misma lógica de costo que financiero_estado_resultado_mensual (035) pero
-- sin agrupar por categoría — permite desplegar cada agrupación (Materiales,
-- Mano de Obra, Gastos Operacionales, Gastos Generales) y ver el monto mes a
-- mes de cada partida que la compone.

CREATE VIEW public.financiero_estado_resultado_detalle_mensual AS
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
)
SELECT
  p.codigo_articulo,
  p.nombre,
  p.tarea_wip,
  CASE p.codigo_articulo
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
  c.mes,
  c.anio,
  SUM(c.monto) AS monto
FROM costo c
JOIN public.financiero_presupuestos p ON p.codigo_articulo = c.codigo_articulo
GROUP BY p.codigo_articulo, p.nombre, p.tarea_wip, c.mes, c.anio;

ALTER VIEW public.financiero_estado_resultado_detalle_mensual SET (security_invoker = true);
