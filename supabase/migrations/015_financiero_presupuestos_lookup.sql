-- Migración 015: vista mínima para elegir presupuesto al cargar OC/Facturas
-- Sin esto, un usuario con permiso_financiero_oc (no admin) no podría leer
-- financiero_presupuestos (admin-only de punta a punta) y por lo tanto no
-- tendría forma de elegir a qué presupuesto pertenece la OC/factura que carga.
-- Expone solo id/código/nombre — nunca montos — así que no compromete la
-- confidencialidad de los presupuestos que se pidió proteger.

CREATE OR REPLACE VIEW public.financiero_presupuestos_lookup AS
SELECT id, codigo_articulo, nombre, tarea_wip
FROM public.financiero_presupuestos
WHERE activo = true;

ALTER VIEW public.financiero_presupuestos_lookup SET (security_invoker = false);

REVOKE ALL ON public.financiero_presupuestos_lookup FROM anon;
GRANT SELECT ON public.financiero_presupuestos_lookup TO authenticated;
