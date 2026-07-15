-- Permite al dueño de una solicitud marcarla como usada (al enviar el correo)
-- y eliminarla mientras no se haya usado; admin conserva control total.
create policy solicitudes_update_owner on public.solicitudes
  for update to authenticated
  using (usuario_id = (auth.uid())::text)
  with check (usuario_id = (auth.uid())::text);

create policy solicitudes_delete on public.solicitudes
  for delete to authenticated
  using (is_admin() or (usuario_id = (auth.uid())::text and estado <> 'usada'));
