-- Migración 025: corrige nombre_proveedor_raw de las 11 OC importadas en la
-- migración 024. El usuario aclaró que TECNOFAST solo aplica a las OC cuya
-- nota (detalle) dice "MP"; el resto debe quedar sin proveedor.

UPDATE public.financiero_ordenes_compra foc
SET nombre_proveedor_raw = NULL
FROM public.financiero_presupuestos p
WHERE p.id = foc.presupuesto_id
  AND p.codigo_articulo = '100101'
  AND foc.numero_oc IN ('6469', '6403', '6404', '6310', '6267', '6257', '6231', '6237');
