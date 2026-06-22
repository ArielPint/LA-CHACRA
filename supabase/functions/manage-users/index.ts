import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Verificar que el llamador es un usuario autenticado y admin
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: caller } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (caller?.role !== 'admin') return json({ error: 'Forbidden: se requiere rol admin' }, 403)

    const body = await req.json()
    const { action } = body

    // ── Crear usuario ───────────────────────────────────────────────────────
    if (action === 'create') {
      const { username, password, name, email, role, permissions, planta_rol } = body

      const { data: existing } = await supabaseAdmin
        .from('user_profiles').select('id').eq('username', username).single()
      if (existing) return json({ error: 'El usuario ya existe' }, 400)

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: `${username}@lachacra.internal`,
        password,
        email_confirm: true,
      })
      if (createErr) return json({ error: createErr.message }, 400)

      const { data: profile, error: insertErr } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id:         created.user.id,
          username,
          name:       name || username,
          email:      email || '',
          role:       role || 'viewer',
          active:     true,
          permissions: permissions || {},
          planta_rol: planta_rol || null,
        })
        .select()
        .single()

      if (insertErr) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id)
        return json({ error: insertErr.message }, 400)
      }

      return json(profile)
    }

    // ── Actualizar contraseña ───────────────────────────────────────────────
    if (action === 'update_password') {
      const { userId, password } = body
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ── Eliminar usuario ────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: `Acción desconocida: ${action}` }, 400)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return json({ error: msg }, 500)
  }
})
