/**
 * auth.js — Sistema de autenticación y autorización
 * La Chacra · Usuarios almacenados en GitHub (users.json)
 *
 * Roles: admin | operador | viewer
 * Permisos por página y pestaña
 */

const AUTH = (() => {

  // ─── Config GitHub ────────────────────────────────────────────────────────
  const REPO_OWNER = 'ArielPint';
  const REPO_NAME  = 'LA-CHACRA';
  const USERS_FILE = 'users.json';
  const RAW_URL    = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${USERS_FILE}`;
  const API_URL    = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${USERS_FILE}`;

  // ─── Config Supabase ──────────────────────────────────────────────────────
  const SUPA_URL  = 'https://vtrpxsgcbojqgdcsplim.supabase.co';
  const SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cnB4c2djYm9qcWdkY3NwbGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzQ2ODYsImV4cCI6MjA5NjkxMDY4Nn0.zvLAupmv7T8zXw8U9NOl8VmVtb-BNSfD4JWzaJBsLBA';

  // ─── Claves localStorage ──────────────────────────────────────────────────
  const SESSION_KEY = 'lachacra_session';
  const CACHE_KEY   = 'lachacra_users_cache';
  const TOKEN_KEY   = 'lachacra_gh_token';
  const CACHE_TTL   = 2 * 60 * 1000; // 2 minutos

  // In-memory cache (válida durante la sesión del tab)
  let _mem = null;
  let _memTs = 0;

  // ─── Mapa de páginas y pestañas ───────────────────────────────────────────
  const PAGE_MAP = {
    dashboard: {
      label: 'Dashboard',
      tabs: {
        resumen:   'Resumen',
        curva:     'Curva S',
        modulos:   'Módulos',
        compras:   'Compras',
        productos: 'Productos',
        stock:     'Stock',
        despachos:    'Despachos',
        'prod-diaria': 'Prod. Diaria'
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
        corte:         'Corte',
        obra_gruesa:   'Obra Gruesa',
        terminaciones: 'Terminaciones',
        recepcion:     'Recepción'
      }
    },
    geovictoria: {
      label: 'Asistencia GeoVictoria',
      restricted: true,   // acceso desactivado por defecto; debe habilitarse explícitamente
      tabs: {}
    }
  };

  function defaultPagePerms() {
    const pages = {};
    for (const [pid, pdef] of Object.entries(PAGE_MAP)) {
      // Páginas restringidas (restricted: true) se desactivan por defecto
      const access = !pdef.restricted;
      pages[pid] = { access, tabs: access ? Object.keys(pdef.tabs) : [] };
    }
    return pages;
  }

  const DEFAULT_ROLES = {
    admin:    { label: 'Administrador',  readonly: false, canEditLayout: true,  pages: () => defaultPagePerms() },
    editor:   { label: 'Editor Layout',  readonly: false, canEditLayout: true,  pages: () => defaultPagePerms() },
    operador: { label: 'Operador',       readonly: false, canEditLayout: false, pages: () => defaultPagePerms() },
    viewer:   { label: 'Solo Lectura',   readonly: true,  canEditLayout: false, pages: () => defaultPagePerms() }
  };

  // ─── Hash SHA-256 ─────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Migración de permisos ────────────────────────────────────────────────
  function migratePermissions(perms) {
    if (perms && perms.pages && typeof perms.pages === 'object') {
      // Forward-migrate: añadir páginas nuevas del PAGE_MAP que aún no existen en perms
      for (const [pid, pdef] of Object.entries(PAGE_MAP)) {
        if (!perms.pages[pid]) {
          // Páginas restringidas (restricted: true) se agregan con acceso desactivado
          const access = !pdef.restricted;
          perms.pages[pid] = { access, tabs: access ? Object.keys(pdef.tabs || {}) : [] };
        }
      }
      return perms;
    }
    const newPerms = { pages: defaultPagePerms(), readonly: perms ? !!perms.readonly : false };
    if (perms && Array.isArray(perms.tabs)) newPerms.pages.layout.tabs = perms.tabs;
    return newPerms;
  }

  function _normalize(users) {
    return users.map(u => ({ ...u, permissions: migratePermissions(u.permissions) }));
  }

  // ─── Fallback por defecto ─────────────────────────────────────────────────
  function _defaultAdmin() {
    return [{
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      role: 'admin', name: 'Administrador', active: true,
      createdAt: 1749600000000, updatedAt: 1749600000000,
      permissions: { pages: defaultPagePerms(), readonly: false }
    }];
  }

  // ─── Obtener usuarios (remoto → cache → fallback) ─────────────────────────
  // Decodifica la respuesta base64 de la GitHub API con soporte UTF-8
  function _decodeGithubContent(b64) {
    const binary = atob(b64.replace(/\n/g, ''));
    const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function getUsers({ force = false } = {}) {
    const now = Date.now();
    // 1. In-memory (más rápido, mismo tab)
    if (!force && _mem && (now - _memTs) < CACHE_TTL) return _mem;
    // 2. Remoto
    try {
      let users;
      if (force) {
        // Login/forzado → GitHub API (siempre fresca, sin caché CDN de Fastly)
        // Esto evita que cambios de permisos recientes no se vean al hacer login
        const token = localStorage.getItem(TOKEN_KEY);
        const headers = { Accept: 'application/vnd.github+json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const resp = await fetch(API_URL, { headers });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        users = _normalize(JSON.parse(_decodeGithubContent(data.content)));
      } else {
        // Uso normal → raw URL (más rápido, sin autenticación)
        const resp = await fetch(RAW_URL + '?_=' + now);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        users = _normalize(await resp.json());
      }
      // Mergear lastLogin del cache local si es más reciente que lo que tiene GitHub
      // (ocurre cuando el write a GitHub falló por falta de token)
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (Array.isArray(cached.users)) {
          const localLastLogin = {};
          cached.users.forEach(u => { if (u.lastLogin) localLastLogin[u.id] = u.lastLogin; });
          users.forEach(u => {
            if (localLastLogin[u.id] && (!u.lastLogin || localLastLogin[u.id] > u.lastLogin)) {
              u.lastLogin = localLastLogin[u.id];
            }
          });
        }
      } catch (_) {}
      _mem = users;
      _memTs = now;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ users, ts: now }));
      return users;
    } catch (_e) {
      // 3. Cache localStorage
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (Array.isArray(c.users) && c.users.length > 0) {
          _mem = _normalize(c.users);
          _memTs = c.ts || 0;
          return _mem;
        }
      } catch (_) {}
      // 4. Fallback admin por defecto
      _mem = _defaultAdmin();
      _memTs = now;
      return _mem;
    }
  }

  // ─── Guardar usuarios (GitHub API + cache) ────────────────────────────────
  async function saveUsers(users) {
    // Actualizar caches inmediatamente
    _mem = users;
    _memTs = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ users, ts: _memTs }));
    // Escribir en GitHub
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('Token de GitHub no configurado. Ve a Admin → Configuración.');
    // Obtener SHA actual del archivo
    const headResp = await fetch(API_URL, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
    });
    const sha = headResp.ok ? (await headResp.json()).sha : undefined;
    // Codificar contenido en base64 (soporta Unicode)
    const json = JSON.stringify(users, null, 2);
    const bytes = new TextEncoder().encode(json);
    const bin = Array.from(bytes, b => String.fromCodePoint(b)).join('');
    const content = btoa(bin);
    const putResp = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: 'Update users [skip ci]',
        content,
        ...(sha ? { sha } : {})
      })
    });
    if (!putResp.ok) {
      const err = await putResp.json().catch(() => ({}));
      throw new Error(err.message || 'GitHub API error ' + putResp.status);
    }
  }

  // ─── CRUD de usuarios ─────────────────────────────────────────────────────
  async function createUser({ username, password, name, email, role, customPages, readonly, canEditLayoutOverride, canEditProductsOverride, plantaRol }) {
    const users = await getUsers();
    if (users.find(u => u.username === username.trim().toLowerCase())) {
      throw new Error('El usuario ya existe');
    }
    const roleDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
    const perms = {
      pages: customPages || roleDef.pages(),
      readonly: readonly !== undefined ? readonly : roleDef.readonly
    };
    if (canEditLayoutOverride    !== undefined) perms.canEditLayout    = canEditLayoutOverride;
    if (canEditProductsOverride !== undefined) perms.canEditProducts = canEditProductsOverride;
    const user = {
      id: crypto.randomUUID(),
      username: username.trim().toLowerCase(),
      password: await hashPassword(password),
      plainPassword: password,
      email: email ? email.trim().toLowerCase() : '',
      role, name: name || username, active: true,
      createdAt: Date.now(), updatedAt: Date.now(),
      permissions: perms,
      plantaRol: plantaRol || null
    };
    users.push(user);
    await saveUsers(users);
    return user;
  }

  async function updateUser(id, { username, password, name, email, role, customPages, readonly, active, canEditLayoutOverride, canEditProductsOverride, plantaRol }) {
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');
    const u = users[idx];
    if (username  !== undefined) u.username = username.trim().toLowerCase();
    if (name      !== undefined) u.name = name;
    if (email     !== undefined) u.email = email ? email.trim().toLowerCase() : '';
    if (role      !== undefined) {
      u.role = role;
      if (customPages === undefined && readonly === undefined) {
        const rDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
        u.permissions.pages    = rDef.pages();
        u.permissions.readonly = rDef.readonly;
        // Resetear canEditLayout al default del rol
        delete u.permissions.canEditLayout;
      }
    }
    if (customPages              !== undefined) u.permissions.pages          = customPages;
    if (readonly                 !== undefined) u.permissions.readonly        = readonly;
    if (canEditLayoutOverride    !== undefined) u.permissions.canEditLayout    = canEditLayoutOverride;
    if (canEditProductsOverride !== undefined) u.permissions.canEditProducts = canEditProductsOverride;
    if (active                   !== undefined) u.active = active;
    if (password)                { u.password = await hashPassword(password); u.plainPassword = password; }
    if (plantaRol !== undefined) u.plantaRol = plantaRol || null;
    u.updatedAt = Date.now();
    await saveUsers(users);
    return u;
  }

  async function deleteUser(id) {
    const users = await getUsers();
    await saveUsers(users.filter(u => u.id !== id));
  }

  // ─── Token GitHub ──────────────────────────────────────────────────────────
  function setGithubToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  }
  function getGithubToken()  { return localStorage.getItem(TOKEN_KEY) || ''; }
  function hasGithubToken()  { return !!getGithubToken(); }

  async function testGithubToken(token) {
    const resp = await fetch(API_URL, {
      headers: { Authorization: 'Bearer ' + token.trim(), Accept: 'application/vnd.github+json' }
    });
    if (resp.status === 401) throw new Error('Token inválido');
    if (resp.status === 403) throw new Error('Sin permisos de escritura');
    if (resp.status === 404) throw new Error('Repositorio no encontrado');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    // Verificar que tiene permisos de escritura
    if (!data.permissions || !data.permissions.push) {
      // Puede ser que permissions no esté en la respuesta de contents, intentar write
    }
    return true;
  }

  // ─── Registro de eventos de login (Supabase) ─────────────────────────────
  function recordLoginEvent(user) {
    // keepalive: true → el fetch sobrevive la navegación de página
    fetch(`${SUPA_URL}/rest/v1/login_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id:    user.id,
        username:   user.username,
        name:       user.name,
        user_agent: navigator.userAgent
      })
    }).catch(() => {}); // silencioso — no bloquea el login
  }

  // ─── Sesión ───────────────────────────────────────────────────────────────
  async function login(username, password) {
    // Forzar fetch fresco en login (ignorar cache de mem)
    const users = await getUsers({ force: true });
    const user  = users.find(u => u.username === username.trim().toLowerCase());
    if (!user || !user.active) throw new Error('Usuario o contraseña incorrectos');
    const hash = await hashPassword(password);
    if (hash !== user.password) throw new Error('Usuario o contraseña incorrectos');
    const session = {
      id: user.id, username: user.username, name: user.name,
      role: user.role, permissions: user.permissions, loginAt: Date.now(),
      plantaRol: user.plantaRol || null
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Actualizar lastLogin en GitHub (silencioso, no bloquea el login)
    user.lastLogin = session.loginAt;
    saveUsers(users).catch(() => {});
    // Registrar evento en Supabase (funciona desde cualquier dispositivo)
    recordLoginEvent(user);
    return session;
  }

  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  function getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s) return null;
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
    if (s.role === 'admin') return true; // admin siempre tiene acceso a todas las páginas
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
    // Verificar permiso explícito en permisos del usuario o por rol
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

  function canEditProducts() {
    const s = getSession();
    if (!s) return false;
    if (s.role === 'admin') return true;
    // Permiso explícito por usuario (canEditProducts: true/false en permissions)
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

  // ─── Estadísticas de login (Supabase) ────────────────────────────────────
  // Devuelve { [user_id]: { count, lastLogin } } para todos los usuarios
  async function getLoginStats() {
    try {
      const resp = await fetch(
        `${SUPA_URL}/rest/v1/login_events?select=user_id,logged_at&order=logged_at.desc`,
        { headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY } }
      );
      if (!resp.ok) return {};
      const rows = await resp.json();
      const stats = {};
      rows.forEach(r => {
        if (!stats[r.user_id]) {
          stats[r.user_id] = { count: 0, lastLogin: r.logged_at };
        }
        stats[r.user_id].count++;
      });
      return stats;
    } catch (_) { return {}; }
  }

  // ─── Exportar / Importar ──────────────────────────────────────────────────
  async function exportUsers() { return JSON.stringify(await getUsers()); }

  async function importUsers(jsonString) {
    const arr = JSON.parse(jsonString);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Formato inválido');
    arr.forEach(u => {
      if (!u.id || !u.username || !u.password) throw new Error('Estructura incorrecta');
    });
    await saveUsers(arr);
    return arr.length;
  }

  return {
    getUsers, createUser, updateUser, deleteUser,
    exportUsers, importUsers,
    setGithubToken, getGithubToken, hasGithubToken, testGithubToken,
    login, logout, getSession, requireAuth, requireAdmin,
    canAccessPage, canViewTab, isReadonly, isAdmin, canEditLayout, canEditProducts,
    getPlantaRol, canAccessPlanta,
    getPages, getRoles, getDefaultPages, getPageLabel, getTabLabel, getAllTabs,
    hashPassword, getLoginStats
  };

})();
