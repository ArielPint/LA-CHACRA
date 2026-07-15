-- Migración 038: financiero_proveedores ahora se usa también desde Gastos
-- Directos (migración 037 le agregó proveedor_rut) — las políticas de 018
-- solo contemplaban OC/Facturas.

DROP POLICY IF EXISTS "financiero_proveedores_select" ON public.financiero_proveedores;
DROP POLICY IF EXISTS "financiero_proveedores_insert" ON public.financiero_proveedores;
DROP POLICY IF EXISTS "financiero_proveedores_update" ON public.financiero_proveedores;

CREATE POLICY "financiero_proveedores_select" ON public.financiero_proveedores
  FOR SELECT TO authenticated USING (
    public.has_financiero_tab_view('ordenes-compra')
    OR public.has_financiero_tab_view('facturas')
    OR public.has_financiero_tab_view('gastos-directos')
  );
CREATE POLICY "financiero_proveedores_insert" ON public.financiero_proveedores
  FOR INSERT TO authenticated WITH CHECK (
    public.has_financiero_edit('oc') OR public.has_financiero_edit('gastos-directos')
  );
CREATE POLICY "financiero_proveedores_update" ON public.financiero_proveedores
  FOR UPDATE TO authenticated USING (
    public.has_financiero_edit('oc') OR public.has_financiero_edit('gastos-directos')
  ) WITH CHECK (
    public.has_financiero_edit('oc') OR public.has_financiero_edit('gastos-directos')
  );
