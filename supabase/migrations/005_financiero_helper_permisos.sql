-- Migración 005: helper de permisos para el módulo Financiero
-- Calco de is_admin() (001_create_user_profiles.sql): admin siempre puede,
-- cualquier otro usuario solo si tiene el flag permiso_financiero_oc en
-- user_profiles.permissions (mismo patrón que permiso_stock, no atado a un rol).

CREATE OR REPLACE FUNCTION public.has_financiero_oc_permiso()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND active = true
      AND (
        role = 'admin'
        OR (permissions ->> 'permiso_financiero_oc')::boolean IS TRUE
      )
  );
$$;
