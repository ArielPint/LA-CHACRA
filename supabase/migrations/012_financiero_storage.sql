-- Migración 012: bucket de Storage para PDFs de OC/Facturas
-- Privado (documentos financieros, no público como planta-rechazos): la UI
-- futura genera signed URLs. Path: {tipo}/{codigo_articulo}/{numero}.pdf

INSERT INTO storage.buckets (id, name, public)
VALUES ('financiero-docs', 'financiero-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "financiero_docs_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'financiero-docs');

CREATE POLICY "financiero_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financiero-docs' AND public.has_financiero_oc_permiso());

CREATE POLICY "financiero_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'financiero-docs' AND public.has_financiero_oc_permiso())
  WITH CHECK (bucket_id = 'financiero-docs' AND public.has_financiero_oc_permiso());

-- Sin política DELETE, igual que en ordenes_compra/facturas.
