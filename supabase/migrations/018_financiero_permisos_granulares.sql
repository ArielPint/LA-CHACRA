-- Migración 018: permisos específicos por pestaña del módulo Financiero.
--
-- Reutiliza la convención ya existente en user_profiles.permissions.pages.<pagina>
-- (ver ejemplo real: permissions.pages.layout / .planta / .dashboard con {access, tabs})
-- para la VISTA de cada pestaña, y sigue el patrón de flags planos ya usado
-- (permiso_stock, permiso_financiero_oc) para la EDICIÓN por sección.
--
-- Vista de una pestaña "<tab>" del financiero:
--   is_admin() OR (permissions.pages.financiero.access = true
--                  AND <tab> está en permissions.pages.financiero.tabs)
-- Edición de una sección "<seccion>":
--   is_admin() OR permissions['permiso_financiero_' || <seccion>] = true
--
-- Tabs válidos: dashboard, ordenes-compra, facturas, presupuestos, forecast,
--               remuneraciones, ingresos, auditoria
-- Secciones de edición: oc (cubre OC + Facturas, ya existía), presupuestos
--               (cubre Presupuestos + Forecast), remuneraciones, ingresos

CREATE OR REPLACE FUNCTION public.has_financiero_tab_view(tab text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
       role = 'admin'
       OR (
         (permissions #> '{pages,financiero,access}')::boolean IS TRUE
         AND (permissions #> '{pages,financiero,tabs}') ? tab
       )
     FROM public.user_profiles
     WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.has_financiero_edit(seccion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
       role = 'admin'
       OR (permissions ->> ('permiso_financiero_' || seccion))::boolean IS TRUE
     FROM public.user_profiles
     WHERE id = auth.uid()),
    false
  );
$$;

-- Reemplaza las políticas admin-only de presupuestos/forecast por las granulares.
DROP POLICY IF EXISTS "financiero_presupuestos_select" ON public.financiero_presupuestos;
DROP POLICY IF EXISTS "financiero_presupuestos_insert" ON public.financiero_presupuestos;
DROP POLICY IF EXISTS "financiero_presupuestos_update" ON public.financiero_presupuestos;

CREATE POLICY "financiero_presupuestos_select" ON public.financiero_presupuestos
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('presupuestos'));
CREATE POLICY "financiero_presupuestos_insert" ON public.financiero_presupuestos
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('presupuestos'));
CREATE POLICY "financiero_presupuestos_update" ON public.financiero_presupuestos
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('presupuestos')) WITH CHECK (public.has_financiero_edit('presupuestos'));

DROP POLICY IF EXISTS "financiero_forecast_presupuesto_select" ON public.financiero_forecast_presupuesto;
DROP POLICY IF EXISTS "financiero_forecast_presupuesto_insert" ON public.financiero_forecast_presupuesto;
DROP POLICY IF EXISTS "financiero_forecast_presupuesto_update" ON public.financiero_forecast_presupuesto;

CREATE POLICY "financiero_forecast_presupuesto_select" ON public.financiero_forecast_presupuesto
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('forecast'));
CREATE POLICY "financiero_forecast_presupuesto_insert" ON public.financiero_forecast_presupuesto
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('presupuestos'));
CREATE POLICY "financiero_forecast_presupuesto_update" ON public.financiero_forecast_presupuesto
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('presupuestos')) WITH CHECK (public.has_financiero_edit('presupuestos'));

-- OC y Facturas: SELECT pasa de "cualquier authenticated" a gateado por pestaña.
-- El flag de edición permiso_financiero_oc ya existía y sigue igual (sin migrar datos).
DROP POLICY IF EXISTS "financiero_ordenes_compra_select" ON public.financiero_ordenes_compra;
DROP POLICY IF EXISTS "financiero_ordenes_compra_insert" ON public.financiero_ordenes_compra;
DROP POLICY IF EXISTS "financiero_ordenes_compra_update" ON public.financiero_ordenes_compra;

CREATE POLICY "financiero_ordenes_compra_select" ON public.financiero_ordenes_compra
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('ordenes-compra'));
CREATE POLICY "financiero_ordenes_compra_insert" ON public.financiero_ordenes_compra
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('oc'));
CREATE POLICY "financiero_ordenes_compra_update" ON public.financiero_ordenes_compra
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('oc')) WITH CHECK (public.has_financiero_edit('oc'));

DROP POLICY IF EXISTS "financiero_facturas_select" ON public.financiero_facturas;
DROP POLICY IF EXISTS "financiero_facturas_insert" ON public.financiero_facturas;
DROP POLICY IF EXISTS "financiero_facturas_update" ON public.financiero_facturas;

CREATE POLICY "financiero_facturas_select" ON public.financiero_facturas
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('facturas'));
CREATE POLICY "financiero_facturas_insert" ON public.financiero_facturas
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('oc'));
CREATE POLICY "financiero_facturas_update" ON public.financiero_facturas
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('oc')) WITH CHECK (public.has_financiero_edit('oc'));

-- Proveedores: lectura ligada a poder ver OC o Facturas; escritura ligada a poder editarlas.
DROP POLICY IF EXISTS "financiero_proveedores_select" ON public.financiero_proveedores;
DROP POLICY IF EXISTS "financiero_proveedores_insert" ON public.financiero_proveedores;
DROP POLICY IF EXISTS "financiero_proveedores_update" ON public.financiero_proveedores;

CREATE POLICY "financiero_proveedores_select" ON public.financiero_proveedores
  FOR SELECT TO authenticated USING (
    public.has_financiero_tab_view('ordenes-compra') OR public.has_financiero_tab_view('facturas')
  );
CREATE POLICY "financiero_proveedores_insert" ON public.financiero_proveedores
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_edit('oc'));
CREATE POLICY "financiero_proveedores_update" ON public.financiero_proveedores
  FOR UPDATE TO authenticated USING (public.has_financiero_edit('oc')) WITH CHECK (public.has_financiero_edit('oc'));

-- Auditoría: solo vista, gateada por pestaña (antes era admin-only a secas).
DROP POLICY IF EXISTS "financiero_audit_log_select" ON public.financiero_audit_log;
CREATE POLICY "financiero_audit_log_select" ON public.financiero_audit_log
  FOR SELECT TO authenticated USING (public.has_financiero_tab_view('auditoria'));

-- Backfill de los usuarios de prueba para que conserven su alcance actual
-- bajo el nuevo esquema (antes OC/Facturas eran de lectura abierta a todo authenticated).
-- guard_profile_update_trigger fuerza NEW.permissions := OLD.permissions cuando
-- is_admin() es false, y auth.uid() es NULL en este contexto de migración
-- (sin sesión autenticada) — hay que desactivarlo momentáneamente o el UPDATE
-- no tiene efecto real pese a no arrojar error.
ALTER TABLE public.user_profiles DISABLE TRIGGER guard_profile_update_trigger;

UPDATE public.user_profiles
SET permissions = permissions || jsonb_build_object(
  'pages', jsonb_build_object(
    'financiero', jsonb_build_object(
      'access', true,
      'tabs', jsonb_build_array('ordenes-compra', 'facturas')
    )
  )
)
WHERE username IN ('financiero_test_operador', 'financiero_test_viewer');

ALTER TABLE public.user_profiles ENABLE TRIGGER guard_profile_update_trigger;
