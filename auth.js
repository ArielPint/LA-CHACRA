/**
 * auth.js — Sistema de autenticación y autorización
 * La Chacra · Control de acceso con localStorage
 *
 * Roles: admin | operador | viewer
 * Permisos por página y pestaña
 */

const AUTH = (() => {

  // ─── Constantes ───────────────────────────────────────────────────────────
  const USERS_KEY   = 'lachacra_users';
  const SESSION_KEY = 'lachacra_session';

  // Mapa de todas las páginas y sus pestañas
  const PAGE_MAP = {
    dashboard: {
      label: 'Dashboard',
      tabs: {
        resumen:    'Resumen',
        curva:      'Curva S',
        modulos:    'Módulos',
        compras:    'Compras',
        productos:  'Productos',
        stock:      'Stock',
        despachos:  'Despachos'
      }
    },
    produccion: {
      label: 'Producción',
      tabs: {
        resumen:   'Resumen',
        torres:    'Torres',
        partidas:  'Partidas',
        alertas:   'Alertas',
        detalle:   'Detalle'
      }
    },
    layout: {
      label: 'Layout',
      tabs: {
        resumen:         'Resumen',
        galpon:          'Galpón',
        'carpa-grande':  'Carpa Grande',
        'carpa-chica':   'Carpa Chica',
        patio:           'Patio de Acopio',
        planta:          'Vista Completa'
      }
    }
  };

  // Permisos por defecto para cada rol (acceso completo)
  function defaultPagePerms() {
    const pages = {};
    for (const [pageId, pageDef] of Object.entries(PAGE_MAP)) {
      pages[pageId] = {
        access: true,
        tabs: Object.keys(pageDef.tabs)
      };
    }
    return pages;
  }

  const DEFAULT_ROLES = {
    admin: {
      label:    'Administrador',
      readonly: false,
      pages:    () => defaultPagePerms()
    },
    operador: {
      label:    'Operador',
      readonly: false,
      pages:    () => defaultPagePerms()
    },
    viewer: {
      label:    'Solo Lectura',
      readonly: true,
      pages:    () => defaultPagePerms()
    }
  };

  // ─── Hash SHA-256 ─────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Migración formato antiguo → nuevo ────────────────────────────────────
  function migratePermissions(perms) {
    // Si ya tiene el formato nuevo (pages object), devolver tal cual
    if (perms && perms.pages && typeof perms.pages === 'object') return perms;
    // Formato antiguo: { tabs: [...], readonly: bool }
    const newPerms = {
      pages:    defaultPagePerms(),
      readonly: perms ? !!perms.readonly : false
    };
    // Si tenía tabs de layout, aplicarlas
    if (perms && Array.isArray(perms.tabs)) {
      newPerms.pages.layout.tabs = perms.tabs;
    }
    return newPerms;
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────
  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      // Migrar permisos al formato nuevo si es necesario
      return users.map(u => ({ ...u, permissions: migratePermissions(u.permissions) }));
    } catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function initDefaultAdmin() {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (raw.length === 0) {
      const hash = await hashPassword('admin123');
      const role = DEFAULT_ROLES.admin;
      const defaultAdmin = {
        id:       crypto.randomUUID(),
        username: 'admin',
        password: hash,
        role:     'admin',
        name:     'Administrador',
        active:   true,
        permissions: {
          pages:    role.pages(),
          readonly: false
        }
      };
      saveUsers([defaultAdmin]);
    }
  }

  async function createUser({ username, password, name, role, customPages, readonly }) {
    const users = getUsers();
    if (users.find(u => u.username === username.trim().toLowerCase())) {
      throw new Error('El usuario ya existe');
    }
    const roleDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
    const hash = await hashPassword(password);
    const user = {
      id:        crypto.randomUUID(),
      username:  username.trim().toLowerCase(),
      password:  hash,
      role,
      name:      name || username,
      active:    true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      permissions: {
        pages:    customPages || roleDef.pages(),
        readonly: readonly !== undefined ? readonly : roleDef.readonly
      }
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  async function updateUser(id, { username, password, name, role, customPages, readonly, active }) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');

    const u = users[idx];
    if (username !== undefined) u.username = username.trim().toLowerCase();
    if (name     !== undefined) u.name     = name;
    if (role     !== undefined) {
      u.role = role;
      if (customPages === undefined && readonly === undefined) {
        const rDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
        u.permissions.pages    = rDef.pages();
        u.permissions.readonly = rDef.readonly;
      }
    }
    if (customPages !== undefined) u.permissions.pages    = customPages;
    if (readonly    !== undefined) u.permissions.readonly = readonly;
    if (active      !== undefined) u.active = active;
    if (password)                  u.password = await hashPassword(password);
    u.updatedAt = Date.now();

    saveUsers(users);
    return u;
  }

  function deleteUser(id) {
    saveUsers(getUsers().filter(u => u.id !== id));
  }

  // ─── Sesión ───────────────────────────────────────────────────────────────
  async function login(username, password) {
    const users = getUsers();
    const user  = users.find(u => u.username === username.trim().toLowerCase());
    if (!user || !user.active) throw new Error('Usuario o contraseña incorrectos');
    const hash = await hashPassword(password);
    if (hash !== user.password) throw new Error('Usuario o contraseña incorrectos');
    const session = {
      id:          user.id,
      username:    user.username,
      name:        user.name,
      role:        user.role,
      permissions: user.permissions,
      loginAt:     Date.now()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s) return null;
      // Migrar sesión al nuevo formato si es necesario
      s.permissions = migratePermissions(s.permissions);
      return s;
    } catch { return null; }
  }

  function requireAuth(redirectTo = 'login.html') {
    const s = getSession();
    if (!s) {
      // Funciona tanto en página normal como en iframe
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

  // ─── Helpers UI ───────────────────────────────────────────────────────────
  function getPages()          { return PAGE_MAP; }
  function getRoles()          { return DEFAULT_ROLES; }
  function getDefaultPages(role) {
    const rDef = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
    return rDef.pages();
  }
  function getPageLabel(pageId) {
    return PAGE_MAP[pageId] ? PAGE_MAP[pageId].label : pageId;
  }
  function getTabLabel(pageId, tabId) {
    if (PAGE_MAP[pageId] && PAGE_MAP[pageId].tabs[tabId]) return PAGE_MAP[pageId].tabs[tabId];
    return tabId;
  }
  // Para backward compat con layout.html antiguo
  function getAllTabs() { return Object.keys(PAGE_MAP.layout.tabs); }

  // Inicializar admin por defecto
  initDefaultAdmin();

  return {
    getUsers, createUser, updateUser, deleteUser,
    login, logout, getSession, requireAuth, requireAdmin,
    canAccessPage, canViewTab, isReadonly, isAdmin,
    getPages, getRoles, getDefaultPages, getPageLabel, getTabLabel, getAllTabs,
    hashPassword
  };
})();
