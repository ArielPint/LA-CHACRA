/**
 * auth.js — Sistema de autenticación y autorización
 * La Chacra · Usuarios almacenados en Supabase Auth + user_profiles
 *
 * Roles: admin | operador | viewer | editor
 * Credenciales gestionadas por Supabase (bcrypt interno)
 */

const AUTH = (() => {

  // ─── Config Supabase ──────────────────────────────────────────────────────
  const SUPA_URL   = 'https://vtrpxsgcbojqgdcsplim.supabase.co';
  const SUPA_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cnB4c2djYm9qcWdkY3NwbGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzQ2ODYsImV4cCI6MjA5NjkxMDY4Nn0.zvLAupmv7T8zXw8U9NOl8VmVtb-BNSfD4JWzaJBsLBA';
  const MANAGE_URL = `${SUPA_URL}/functions/v1/manage-users`;

  // ─── Claves localStorage / sessionStorage ─────────────────────────────────
  const SESSION_KEY        = 'lachacra_session';
  const LOGIN_ATTEMPTS_KEY = 'lachacra_login_attempts';
  const MAX_ATTEMPTS       = 5;
  const LOCKOUT_MS         = 5 * 60 * 1000;  // 5 minutos
  const SESSION_TTL        = 8 * 60 * 60 * 1000; // 8 horas

  // ─── Supabase client (lazy, usa sessionStorage) ──────────────────────────
  let _sb = null;

  async function _client() {
    if (_sb) return _sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    _sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return _sb;
  }

  // ─── Mapa de páginas y pestañas ───────────────────────────────────────────
  const PAGE_MAP = {
    dashboard: {
      label: 'Dashboard',
      tabs: {
        resumen:      'Resumen',
        curva:        'Curva S',
        modulos:      'Módulos',
        compras:      'Compras',
        productos:    'Productos',
        stock:        'Stock',
        despachos:    'Despachos',
        proyeccion:   'Proyección',
        'prod-diaria':'Prod. Diaria'
      }
    },
    produccion: {
      label: 'Producción',
      tabs: {
        resumen:  'Resumen',
        torres:   'Torres',
        partidas: 'Partidas',
        alertas:  'Alertas',
        detalle:  'Detalle'
      }
    },
    layout: {
      label: 'Layout',
      tabs: {
        resumen:        'Resumen',
        galpon:         'Galpón',
        'carpa-grande': 'Carpa Grande',
        'carpa-chica':  'Carpa Chica',
        patio:          'Patio de Acopio',
        planta:         'Vista Completa'
      }
    },
    despacho: {
      label: 'Despacho GD',
      tabs: {}
    },
    'registro-gd': {
      label: 'Registro GD',
      tabs: {}
    },
    solicitudes: {
      label: 'Solicitudes',
      tabs: {
        nueva:     'Nueva Solicitud',
        historial: 'Historial'
      }
    },
    planta: {
      label: 'Control Planta',
      tabs: {
        obra_gruesa:   'Obra Gruesa',
        sanitario:     'Sanitario',
        electrico:     'Eléctrico',
        terminaciones: 'Terminaciones',
        recepcion:     'Recepción'
      }
    },
    geovictoria: {
      label: 'Asistencia GeoVictoria',
      restricted: true,
      tabs: {}
    },
    financiero: {
      label: 'Financiero',
      restricted: true, // apagado por defecto: hay que habilitarlo a mano por usuario
      tabs: {
        dashboard:        'Dashboard',
        'ordenes-compra': 'Órdenes de Compra',
        facturas:         'Facturas',
        presupuestos:     'Presupuestos',
        forecast:         'Forecast',
        remuneraciones:   'Remuneraciones',
        ingresos:         'Ingreso del Proyecto',
        auditoria:        'Auditoría'
      }
    }
  };

  // Pestañas del Financiero que tienen edición propia (aparte de solo verlas).
  // Varias pestañas comparten un mismo flag de edición porque van de la mano
  // (ver financiero-app: permiso_financiero_<seccion> en user_profiles.permissions).
  const FINANCIERO_EDIT_GROUPS = [
    { key: 'oc',             label: 'Puede editar Órdenes de Compra y Facturas', tabs: ['ordenes-compra', 'facturas'] },
    { key: 'presupuestos',   label: 'Puede editar Presupuestos y Forecast',       tabs: ['presupuestos', 'forecast'] },
    { key: 'remuneraciones', label: 'Puede editar Remuneraciones',                tabs: ['remuneraciones'] },
    { key: 'ingresos',       label: 'Puede editar Ingreso del Proyecto',          tabs: ['ingresos'] }
  ];

  function defaultPagePerms() {
    const pages = {};
    for (const [pid, pdef] of Object.entries(PAGE_MAP)) {
      const access = !pdef.restricted;
      pages[pid] = { access, tabs: access ? Object.keys(pdef.tabs) : [] };
    }
    return pages;
  }

  const DEFAULT_ROLES = {
    admin:    { label: 'Administrador',  readonly: false, canEditLayout: true,  pages: () => defaultPagePerms() },
    editor:   { label: 'Editor Layout',  readonly: false, canEditLayout: true,  pages: () => defaultPagePerms() },
    operador: { label: 'Operador',       readonly: false, canEditLayout: false, pages: () => defaultPagePerms() },
    viewer:   { label: 'Solo Lectura',   readonly: true,  canEditLayout: false, pages: () => defaultPagePerms() },
    compras:  { label: 'Compras',          readonly: false, canEditLayout: false, pages: () => defaultPagePerms() }
  };

  // ─── Migración de permisos ────────────────────────────────────────────────
  function migratePermissions(perms) {
    if (perms && perms.pages && typeof perms.pages === 'object') {
      for (const [pid, pdef] of Object.entries(PAGE_MAP)) {
        if (!perms.pages[pid]) {
          const access = !pdef.restricted;
          perms.pages[pid] = { access, tabs: access ? Object.keys(pdef.tabs || {}) : [] };
        }
      }
      if (perms.pages.planta && Array.isArray(perms.pages.planta.tabs)) {
        const pt = perms.pages.planta.tabs;
        const ci = pt.indexOf('corte');
        if (ci >= 0) pt.splice(ci, 1);
        ['sanitario', 'electrico'].forEach(t => { if (!pt.includes(t)) pt.push(t); });
      }
      return perms;
    }
    const newPerms = { pages: defaultPagePerms(), readonly: perms ? !!perms.readonly : false };
    if (perms && Array.isArray(perms.tabs)) newPerms.pages.layout.tabs = perms.tabs;
    return newPerms;
  }

  // ─── Mapeo perfil DB → objeto usuario ─────────────────────────────────────
  function _profileToUser(p) {
    return {
      id:          p.id,
      username:    p.username,
      name:        p.name,
      email:       p.email || '',
      role:        p.role,
      active:      p.active,
      createdAt:   new Date(p.created_at).getTime(),
      updatedAt:   new Date(p.updated_at).getTime(),
      lastLogin:   p.last_login ? new Date(p.last_login).getTime() : null,
      permissions: migratePermissions(p.permissions || {}),
      plantaRol:   p.planta_rol || null
    };
  }

  // ─── Obtener access token de la sesión activa ─────────────────────────────
  async function _getAccessToken() {
    const sb = await _client();
    let { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
    // getSession() puede devolver el access_token cacheado sin refrescar si el
    // timer de autoRefresh no corrió (pestaña en segundo plano) — forzar
    // refresh cuando está vencido o por vencer evita 401 contra PostgREST.
    if (session.expires_at && session.expires_at * 1000 < Date.now() + 10000) {
      const { data, error } = await sb.auth.refreshSession();
      if (error || !data.session) throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
      session = data.session;
    }
    return session.access_token;
  }

  // ─── getUsers ─────────────────────────────────────────────────────────────
  async function getUsers() {
    const sb = await _client();
    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data.map(_profileToUser);
  }

  // ─── createUser (via Edge Function con service_role) ─────────────────────
  async function createUser({ username, password, name, email, role, customPages, readonly, canEditLayoutOverride, canEditProductsOverride, permisoStockOverride, financieroEditOverride, plantaRol, planta_marks }) {
    const roleDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
    const permissions = {
      pages: customPages || roleDef.pages(),
      readonly: readonly !== undefined ? readonly : roleDef.readonly
    };
    if (canEditLayoutOverride   !== undefined) permissions.canEditLayout    = canEditLayoutOverride;
    if (canEditProductsOverride !== undefined) permissions.canEditProducts = canEditProductsOverride;
    if (permisoStockOverride    !== undefined) permissions.permiso_stock    = permisoStockOverride;
    if (planta_marks            !== undefined) permissions.planta_marks     = planta_marks || null;
    if (financieroEditOverride  !== undefined) {
      for (const [k, v] of Object.entries(financieroEditOverride)) permissions[`permiso_financiero_${k}`] = v;
    }

    const token = await _getAccessToken();
    const resp = await fetch(MANAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPA_KEY
      },
      body: JSON.stringify({
        action: 'create',
        username: username.trim().toLowerCase(),
        password,
        name: name || username,
        email: email ? email.trim().toLowerCase() : '',
        role,
        permissions,
        planta_rol: plantaRol || null
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear usuario');
    }
    return _profileToUser(await resp.json());
  }

  // ─── updateUser ───────────────────────────────────────────────────────────
  async function updateUser(id, { username, password, name, email, role, customPages, readonly, active, canEditLayoutOverride, canEditProductsOverride, permisoStockOverride, financieroEditOverride, plantaRol, planta_marks }) {
    const sb = await _client();

    const { data: current, error: fetchErr } = await sb
      .from('user_profiles').select('*').eq('id', id).single();
    if (fetchErr || !current) throw new Error('Usuario no encontrado');

    const perms = { ...current.permissions };
    let newRole = current.role;

    if (role !== undefined) {
      newRole = role;
      if (customPages === undefined && readonly === undefined) {
        const rDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
        perms.pages    = rDef.pages();
        perms.readonly = rDef.readonly;
        delete perms.canEditLayout;
      }
    }
    if (customPages              !== undefined) perms.pages          = customPages;
    if (readonly                 !== undefined) perms.readonly        = readonly;
    if (canEditLayoutOverride    !== undefined) perms.canEditLayout    = canEditLayoutOverride;
    if (canEditProductsOverride  !== undefined) perms.canEditProducts = canEditProductsOverride;
    if (permisoStockOverride     !== undefined) perms.permiso_stock    = permisoStockOverride;
    if (planta_marks             !== undefined) perms.planta_marks     = planta_marks || null;
    if (financieroEditOverride   !== undefined) {
      for (const [k, v] of Object.entries(financieroEditOverride)) perms[`permiso_financiero_${k}`] = v;
    }

    const updates = { role: newRole, permissions: perms, updated_at: new Date().toISOString() };
    if (username  !== undefined) updates.username  = username.trim().toLowerCase();
    if (name      !== undefined) updates.name       = name;
    if (email     !== undefined) updates.email      = email ? email.trim().toLowerCase() : '';
    if (active    !== undefined) updates.active     = active;
    if (plantaRol !== undefined) updates.planta_rol = plantaRol || null;

    const { error: updateErr } = await sb.from('user_profiles').update(updates).eq('id', id);
    if (updateErr) throw updateErr;

    if (password) {
      const token = await _getAccessToken();
      const resp = await fetch(MANAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPA_KEY },
        body: JSON.stringify({ action: 'update_password', userId: id, password })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar contraseña');
      }
    }

    const { data: updated } = await sb.from('user_profiles').select('*').eq('id', id).single();
    return _profileToUser(updated);
  }

  // ─── deleteUser (via Edge Function) ──────────────────────────────────────
  async function deleteUser(id) {
    const token = await _getAccessToken();
    const resp = await fetch(MANAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPA_KEY },
      body: JSON.stringify({ action: 'delete', userId: id })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar usuario');
    }
  }

  // ─── GitHub stubs (API compat — ya no se usa GitHub para usuarios) ────────
  function setGithubToken() {}
  function getGithubToken()  { return ''; }
  function hasGithubToken()  { return true; }
  async function testGithubToken() { return true; }

  // ─── Registro de eventos de login (Supabase) ──────────────────────────────
  function recordLoginEvent(user) {
    fetch(`${SUPA_URL}/rest/v1/login_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ user_id: user.id, username: user.username, name: user.name })
    }).catch(() => {});
  }

  // ─── Rate limiting de login (client-side) ────────────────────────────────
  function _checkLoginRateLimit(username) {
    try {
      const raw = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
      const entry = raw[username] || { count: 0, firstAt: 0, lockedUntil: 0 };
      const now = Date.now();
      if (entry.lockedUntil && now < entry.lockedUntil) {
        const secs = Math.ceil((entry.lockedUntil - now) / 1000);
        throw new Error(`Demasiados intentos. Esperá ${secs} segundos.`);
      }
    } catch (e) {
      if (e.message.startsWith('Demasiados')) throw e;
    }
  }

  function _recordLoginAttempt(username, success) {
    try {
      const raw = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
      if (success) {
        delete raw[username];
      } else {
        const now = Date.now();
        const entry = raw[username] || { count: 0, firstAt: now, lockedUntil: 0 };
        entry.count++;
        if (entry.count >= MAX_ATTEMPTS) {
          entry.lockedUntil = now + LOCKOUT_MS;
          entry.count = 0;
        }
        raw[username] = entry;
      }
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(raw));
    } catch (_) {}
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async function login(username, password) {
    const user_lc = username.trim().toLowerCase();
    _checkLoginRateLimit(user_lc);

    const sb = await _client();
    const { data, error } = await sb.auth.signInWithPassword({
      email: `${user_lc}@lachacra.internal`,
      password
    });

    if (error || !data.user) {
      _recordLoginAttempt(user_lc, false);
      throw new Error('Usuario o contraseña incorrectos');
    }

    const { data: profile, error: pErr } = await sb
      .from('user_profiles').select('*').eq('id', data.user.id).single();

    if (pErr || !profile || !profile.active) {
      await sb.auth.signOut();
      _recordLoginAttempt(user_lc, false);
      throw new Error('Usuario o contraseña incorrectos');
    }

    _recordLoginAttempt(user_lc, true);

    const session = {
      id:          profile.id,
      username:    profile.username,
      name:        profile.name,
      role:        profile.role,
      permissions: migratePermissions(profile.permissions || {}),
      loginAt:     Date.now(),
      plantaRol:   profile.planta_rol || null
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Fire and forget
    sb.from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => {});

    recordLoginEvent(session);
    return session;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    if (_sb) _sb.auth.signOut().catch(() => {});
  }

  // ─── getSession (síncrono — lee de sessionStorage) ────────────────────────
  function getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s) return null;
      if (s.loginAt && (Date.now() - s.loginAt) > SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      s.permissions = migratePermissions(s.permissions);
      return s;
    } catch { return null; }
  }

  function requireAuth(redirectTo = 'login.html') {
    const s = getSession();
    if (!s) {
      const target = window.top !== window.self ? window.top : window;
      target.location.href = redirectTo;
      return null;
    }
    return s;
  }

  function requireAdmin(redirectTo = 'tecnopanel.html') {
    const s = requireAuth();
    if (!s) return null;
    if (s.role !== 'admin') { window.location.href = redirectTo; return null; }
    return s;
  }

  // ─── Permisos ─────────────────────────────────────────────────────────────
  function canAccessPage(pageId) {
    const s = getSession();
    if (!s) return false;
    if (s.role === 'admin') return true;
    const pg = s.permissions.pages && s.permissions.pages[pageId];
    return pg ? !!pg.access : false;
  }

  function canViewTab(pageId, tabId) {
    const s = getSession();
    if (!s) return false;
    const pg = s.permissions.pages && s.permissions.pages[pageId];
    if (!pg || !pg.access) return false;
    return Array.isArray(pg.tabs) ? pg.tabs.includes(tabId) : true;
  }

  function isReadonly() {
    const s = getSession();
    return s ? !!s.permissions.readonly : true;
  }

  function isAdmin() {
    const s = getSession();
    return s ? s.role === 'admin' : false;
  }

  function canEditLayout() {
    const s = getSession();
    if (!s) return false;
    const roleDef = DEFAULT_ROLES[s.role];
    if (s.permissions && s.permissions.canEditLayout !== undefined) return !!s.permissions.canEditLayout;
    return roleDef ? !!roleDef.canEditLayout : false;
  }

  function getPlantaRol() {
    const s = getSession();
    return s ? (s.plantaRol || null) : null;
  }

  function canAccessPlanta() {
    const s = getSession();
    if (!s) return false;
    if (s.role === 'admin') return true;
    return !!(s.plantaRol);
  }

  function canMarkInPlanta(tabId, markType) {
    const s = getSession();
    if (!s) return false;
    if (s.role === 'admin') return true;
    const prol = s.plantaRol;
    if (prol === 'gerente') return true;
    const marks = s.permissions && s.permissions.planta_marks;
    if (marks) return !!(marks[tabId] && marks[tabId].includes(markType));
    if (markType === 'produccion') {
      return (prol === 'supervisor_obra_gruesa' && ['sanitario', 'electrico'].includes(tabId)) ||
             (prol === 'supervisor_terminaciones' && tabId === 'terminaciones');
    }
    if (markType === 'calidad')   return prol === 'qc1' || prol === 'qc2';
    if (markType === 'cliente')   return prol === 'supervisor_recepcion';
    if (markType === 'entregado') return prol === 'supervisor_recepcion';
    return false;
  }

  function canEditProducts() {
    const s = getSession();
    if (!s) return false;
    if (s.role === 'admin') return true;
    if (s.permissions && s.permissions.canEditProducts !== undefined) return !!s.permissions.canEditProducts;
    return false;
  }

  // ─── Helpers UI ───────────────────────────────────────────────────────────
  function getPages()              { return PAGE_MAP; }
  function getRoles()              { return DEFAULT_ROLES; }
  function getDefaultPages(role)   { return (DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer).pages(); }
  function getPageLabel(pageId)    { return PAGE_MAP[pageId] ? PAGE_MAP[pageId].label : pageId; }
  function getTabLabel(pid, tid)   { return PAGE_MAP[pid]?.tabs[tid] || tid; }
  function getAllTabs()             { return Object.keys(PAGE_MAP.layout.tabs); }
  function getFinancieroEditGroups(){ return FINANCIERO_EDIT_GROUPS; }

  // ─── Estadísticas de login (Supabase) ────────────────────────────────────
  async function getLoginStats() {
    try {
      const sb = await _client();
      const { data } = await sb
        .from('login_events')
        .select('user_id,logged_at')
        .order('logged_at', { ascending: false });
      if (!data) return {};
      const stats = {};
      data.forEach(r => {
        if (!stats[r.user_id]) stats[r.user_id] = { count: 0, lastLogin: r.logged_at };
        stats[r.user_id].count++;
      });
      return stats;
    } catch { return {}; }
  }

  // ─── Exportar / Importar ──────────────────────────────────────────────────
  async function exportUsers() {
    return JSON.stringify(await getUsers(), null, 2);
  }

  async function importUsers() {
    throw new Error('Importación directa no disponible. Usá el panel Admin para crear usuarios.');
  }

  // ─── Cambio de contraseña propio (usuario logueado) ──────────────────────
  async function changeOwnPassword(newPassword) {
    const sb = await _client();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  // hashPassword mantenido por compat de API (no se usa para almacenamiento)
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    getUsers, createUser, updateUser, deleteUser,
    exportUsers, importUsers,
    setGithubToken, getGithubToken, hasGithubToken, testGithubToken,
    login, logout, getSession, requireAuth, requireAdmin, changeOwnPassword,
    canAccessPage, canViewTab, isReadonly, isAdmin, canEditLayout, canEditProducts,
    getPlantaRol, canAccessPlanta, canMarkInPlanta,
    getPages, getRoles, getDefaultPages, getPageLabel, getTabLabel, getAllTabs,
    getFinancieroEditGroups,
    hashPassword, getLoginStats,
    getAccessToken: _getAccessToken
  };

})();
