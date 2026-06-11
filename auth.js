/**
 * auth.js — Sistema de autenticación y autorización
 * La Chacra · Control de acceso con localStorage
 *
 * Roles: admin | operador | viewer
 * Permisos por usuario: tabs visibles, solo-lectura, sectores
 */

const AUTH = (() => {

  // ─── Constantes ───────────────────────────────────────────────────────────
  const USERS_KEY   = 'lachacra_users';
  const SESSION_KEY = 'lachacra_session';

  const ALL_TABS = ['resumen', 'galpon', 'carpa-grande', 'carpa-chica', 'patio', 'planta'];

  const DEFAULT_ROLES = {
    admin:    { tabs: [...ALL_TABS], readonly: false, label: 'Administrador' },
    operador: { tabs: ['resumen', 'galpon', 'carpa-grande', 'carpa-chica', 'patio'], readonly: false, label: 'Operador' },
    viewer:   { tabs: ['resumen', 'galpon', 'carpa-grande', 'carpa-chica', 'patio', 'planta'], readonly: true, label: 'Solo Lectura' }
  };

  // ─── Hash SHA-256 ─────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const enc  = new TextEncoder();
    const buf  = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function initDefaultAdmin() {
    const users = getUsers();
    if (users.length === 0) {
      const hash = await hashPassword('admin123');
      const defaultAdmin = {
        id:       crypto.randomUUID(),
        username: 'admin',
        password: hash,
        role:     'admin',
        name:     'Administrador',
        active:   true,
        permissions: {
          tabs:     [...ALL_TABS],
          readonly: false,
          sectors:  []
        }
      };
      saveUsers([defaultAdmin]);
    }
  }

  async function createUser({ username, password, name, role, customTabs, readonly, sectors }) {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
      throw new Error('El usuario ya existe');
    }
    const rolePerms = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
    const hash = await hashPassword(password);
    const user = {
      id:       crypto.randomUUID(),
      username: username.trim().toLowerCase(),
      password: hash,
      role,
      name:     name || username,
      active:   true,
      permissions: {
        tabs:     customTabs || rolePerms.tabs,
        readonly: readonly !== undefined ? readonly : rolePerms.readonly,
        sectors:  sectors || []
      }
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  async function updateUser(id, { username, password, name, role, customTabs, readonly, sectors, active }) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');

    const u = users[idx];
    if (username !== undefined) u.username = username.trim().toLowerCase();
    if (name     !== undefined) u.name = name;
    if (role     !== undefined) {
      u.role = role;
      // Al cambiar rol, aplicar permisos del rol salvo que se especifiquen custom
      if (customTabs === undefined && readonly === undefined) {
        const rp = DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
        u.permissions.tabs     = rp.tabs;
        u.permissions.readonly = rp.readonly;
      }
    }
    if (customTabs !== undefined) u.permissions.tabs     = customTabs;
    if (readonly   !== undefined) u.permissions.readonly = readonly;
    if (sectors    !== undefined) u.permissions.sectors  = sectors;
    if (active     !== undefined) u.active = active;
    if (password) {
      u.password = await hashPassword(password);
    }

    saveUsers(users);
    return u;
  }

  function deleteUser(id) {
    const users = getUsers().filter(u => u.id !== id);
    saveUsers(users);
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
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function requireAuth(redirectTo = 'login.html') {
    const s = getSession();
    if (!s) { window.location.href = redirectTo; return null; }
    return s;
  }

  function requireAdmin(redirectTo = 'layout.html') {
    const s = requireAuth();
    if (!s) return null;
    if (s.role !== 'admin') { window.location.href = redirectTo; return null; }
    return s;
  }

  // ─── Permisos ─────────────────────────────────────────────────────────────
  function canViewTab(tabId) {
    const s = getSession();
    if (!s) return false;
    return s.permissions.tabs.includes(tabId);
  }

  function isReadonly() {
    const s = getSession();
    return s ? s.permissions.readonly : true;
  }

  function isAdmin() {
    const s = getSession();
    return s ? s.role === 'admin' : false;
  }

  // ─── Helpers UI ───────────────────────────────────────────────────────────
  function getRoles()    { return DEFAULT_ROLES; }
  function getAllTabs()   { return ALL_TABS; }
  function getTabLabel(id) {
    const map = {
      resumen:      'Resumen',
      galpon:       'Galpón',
      'carpa-grande': 'Carpa Grande',
      'carpa-chica':  'Carpa Chica',
      patio:        'Patio de Acopio',
      planta:       'Vista Completa'
    };
    return map[id] || id;
  }

  // Inicializar admin por defecto al cargar
  initDefaultAdmin();

  return {
    // Usuarios
    getUsers, createUser, updateUser, deleteUser,
    // Sesión
    login, logout, getSession, requireAuth, requireAdmin,
    // Permisos
    canViewTab, isReadonly, isAdmin,
    // Helpers
    getRoles, getAllTabs, getTabLabel,
    hashPassword
  };
})();
