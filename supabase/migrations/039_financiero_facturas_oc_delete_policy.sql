-- Faltaban las políticas DELETE para OC y Facturas (018 solo migró
-- select/insert/update). Sin policy, RLS bloquea el delete en silencio:
-- 0 filas afectadas, sin error, la fila "no eliminada" queda igual.
-- Mismo gate que insert/update: has_financiero_edit('oc').

CREATE POLICY "financiero_ordenes_compra_delete" ON public.financiero_ordenes_compra
  FOR DELETE TO authenticated USING (public.has_financiero_edit('oc'));

CREATE POLICY "financiero_facturas_delete" ON public.financiero_facturas
  FOR DELETE TO authenticated USING (public.has_financiero_edit('oc'));
