-- Migración 006: proveedores del módulo Financiero
-- Prefijo financiero_ en toda la tabla nueva: la base real ya tenía una tabla
-- public.ordenes_compra de otro módulo (Compras/Despachos GD, id text, sin
-- relación con presupuestos) que no aparecía en las migraciones locales
-- versionadas (001-004) — hay desfasaje entre este repo y lo aplicado en
-- Supabase. Prefijar evita choques con esa u otra tabla no versionada.
-- RUT como PK natural (evita un join extra solo para deduplicar por RUT).
-- nombre queda NULL en la importación inicial; se completa después desde una UI futura.

CREATE TABLE IF NOT EXISTS public.financiero_proveedores (
  rut        text PRIMARY KEY,
  nombre     text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financiero_proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiero_proveedores_select" ON public.financiero_proveedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "financiero_proveedores_insert" ON public.financiero_proveedores
  FOR INSERT TO authenticated WITH CHECK (public.has_financiero_oc_permiso());

CREATE POLICY "financiero_proveedores_update" ON public.financiero_proveedores
  FOR UPDATE TO authenticated
  USING (public.has_financiero_oc_permiso())
  WITH CHECK (public.has_financiero_oc_permiso());
