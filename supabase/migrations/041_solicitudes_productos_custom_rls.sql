-- solicitudes.html pegaba contra REST con el anon key (público, embebido en el
-- HTML) y las tablas tenían policy "allow_all" (USING true / WITH CHECK true):
-- cualquiera sin login podía leer/editar/borrar cualquier solicitud ajena,
-- auto-aprobarse la propia, o vaciar el catálogo de productos.
-- El front ya autentica con Supabase Auth (auth.js) y ahora manda
-- Authorization: Bearer <access_token> del usuario (ver authFetch en
-- solicitudes.html) — acá se cierra el acceso en base a auth.uid()/is_admin().

DROP POLICY IF EXISTS "allow_all_solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "allow_all_productos_custom" ON public.productos_custom;

CREATE OR REPLACE FUNCTION public.can_edit_productos_custom()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' OR (permissions ->> 'canEditProducts')::boolean IS TRUE
     FROM public.user_profiles
     WHERE id = auth.uid() AND active = true),
    false
  );
$$;

-- solicitudes: cada usuario ve/crea las propias; admin ve todas y aprueba/rechaza
CREATE POLICY "solicitudes_select" ON public.solicitudes
  FOR SELECT TO authenticated
  USING (public.is_admin() OR usuario_id = auth.uid()::text);

CREATE POLICY "solicitudes_insert" ON public.solicitudes
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "solicitudes_update" ON public.solicitudes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- productos_custom: catálogo visible para cualquier usuario autenticado,
-- edición solo admin o permissions.canEditProducts (mismo flag que ya usa el front)
CREATE POLICY "productos_custom_select" ON public.productos_custom
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "productos_custom_insert" ON public.productos_custom
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_productos_custom());

CREATE POLICY "productos_custom_update" ON public.productos_custom
  FOR UPDATE TO authenticated
  USING (public.can_edit_productos_custom())
  WITH CHECK (public.can_edit_productos_custom());
