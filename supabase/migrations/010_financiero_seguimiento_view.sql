-- Migración 010: vista financiero_seguimiento_presupuesto
-- Vista (no tabla): a esta escala (15 presupuestos / ~62 OC / ~58 facturas) una
-- vista siempre-correcta es preferible a mantener una tabla sincronizada por
-- trigger. Fórmulas verificadas celda a celda contra la hoja real "RESUMEN
-- COBROS" del Excel (no coinciden con lo asumido en los documentos originales):
--   faltante_por_facturar = oc_ingresadas - facturado   (NO presupuesto - facturado)
--   pct_avance            = facturado / presupuesto_original  (fracción, sin *100)
--   deficit_o_superavit   = presupuesto_original - oc_ingresadas

CREATE OR REPLACE VIEW public.financiero_seguimiento_presupuesto AS
SELECT
  p.id                                                      AS presupuesto_id,
  p.codigo_articulo,
  p.nombre,
  p.presupuesto_original,
  p.valor_servicio,
  COALESCE(oc.total_oc, 0)                                  AS oc_ingresadas,
  COALESCE(f.total_facturado, 0)                            AS facturado,
  COALESCE(oc.total_oc, 0) - COALESCE(f.total_facturado, 0) AS faltante_por_facturar,
  CASE WHEN p.presupuesto_original = 0 THEN 0
       ELSE ROUND(COALESCE(f.total_facturado, 0) / p.presupuesto_original, 4)
  END                                                        AS pct_avance,
  p.presupuesto_original - COALESCE(oc.total_oc, 0)          AS deficit_o_superavit
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
) f ON f.presupuesto_id = p.id;

ALTER VIEW public.financiero_seguimiento_presupuesto SET (security_invoker = true);
