-- Tabla de perfiles y permisos (debe ir antes que is_admin para que la función pueda referenciarla)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'viewer',
  active      BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',
  planta_rol  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Función helper sin recursión: verifica si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$;

-- Usuarios autenticados pueden leer todos los perfiles
CREATE POLICY "profiles_read" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- Admin puede actualizar cualquier perfil; usuario puede actualizar su propia fila
CREATE POLICY "profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());

-- Trigger: impide que un no-admin cambie campos sensibles de su propia fila
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> auth.uid() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;
  -- No-admin solo puede actualizar last_login
  NEW.role        := OLD.role;
  NEW.permissions := OLD.permissions;
  NEW.active      := OLD.active;
  NEW.username    := OLD.username;
  NEW.name        := OLD.name;
  NEW.email       := OLD.email;
  NEW.planta_rol  := OLD.planta_rol;
  NEW.created_at  := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profile_update_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();
