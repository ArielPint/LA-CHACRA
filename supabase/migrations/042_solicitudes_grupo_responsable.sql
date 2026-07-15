-- Agrega grupo/responsable solicitante a solicitudes, reusando catálogos
-- ya existentes en Registro GD (public.grupos / public.responsables).
alter table public.solicitudes
  add column if not exists grupo_id integer references public.grupos(id),
  add column if not exists responsable_id integer references public.responsables(id);

create index if not exists solicitudes_grupo_id_idx on public.solicitudes(grupo_id);
