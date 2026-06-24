/**
 * geovictoria.js — Módulo de integración con la API de GeoVictoria
 * La Chacra · v1.0
 *
 * Documentación API: https://wiki.geovictoria.com/wp-content/uploads/2020/11/Conjunto-de-Endpoints-GV3-unificado.pdf
 *
 * AUTENTICACIÓN:
 *   - Métodos Token:  POST /api/v1/Login → Bearer token (caduca en 5h)
 *   - Métodos OAuth:  Clave Api + Secreto directamente en el body
 *
 * CONFIGURACIÓN:
 *   Las credenciales se obtienen en GeoVictoria:
 *   Configuraciones Empresa → Acceso API → Clave Api / Secreto
 *
 *   Guardar en el Admin de La Chacra:
 *     localStorage.setItem('gv_apikey',  'TU_CLAVE_API');
 *     localStorage.setItem('gv_secret',  'TU_SECRETO');
 *     localStorage.setItem('gv_env',     'produccion'); // o 'prueba'
 */

const GeoVictoria = (() => {

  // ─── Claves de config ──────────────────────────────────────────────────────
  const KEY_APIKEY = 'gv_apikey';
  const KEY_SECRET = 'gv_secret';
  const KEY_ENV    = 'gv_env';
  const KEY_TOKEN  = 'gv_token';
  const KEY_TOKEN_TS = 'gv_token_ts';
  const TOKEN_TTL  = 4.5 * 60 * 60 * 1000; // 4.5 horas (expira en 5h)

  // ─── Getters de config ─────────────────────────────────────────────────────
  function getApiKey()  { return localStorage.getItem(KEY_APIKEY) || ''; }
  function getSecret()  { return localStorage.getItem(KEY_SECRET) || ''; }
  function getEnv()     { return localStorage.getItem(KEY_ENV) || 'produccion'; }

  function setCredentials({ apiKey, secret, env }) {
    if (apiKey) localStorage.setItem(KEY_APIKEY, apiKey.trim());
    if (secret) localStorage.setItem(KEY_SECRET, secret.trim());
    if (env)    localStorage.setItem(KEY_ENV,    env.trim());
    // Limpiar token cacheado al cambiar credenciales
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_TOKEN_TS);
  }

  function isConfigured() {
    return !!(getApiKey() && getSecret());
  }

  // ─── URL base ──────────────────────────────────────────────────────────────
  // GeoVictoria usa dos subdominios:
  //   customerapi.geovictoria.com  →  métodos autenticados por Token
  //   apiv3.geovictoria.com        →  métodos autenticados por OAuth
  //
  // Si el usuario tiene un ambiente personalizado (staging, demo, etc.),
  // puede definir GV_CUSTOM_HOST en localStorage para sobrescribir el dominio.
  // Ej: localStorage.setItem('gv_custom_host', 'customerapi.miambiente.geovictoria.com')
  function baseUrl(subdomain = 'customerapi') {
    const custom = localStorage.getItem('gv_custom_host');
    if (custom && custom.trim()) {
      // El custom host ya incluye el subdominio completo; solo cambiamos customerapi↔apiv3
      return 'https://' + custom.trim().replace(/^https?:\/\//, '').replace(/^(customerapi|apiv3)\./, subdomain + '.');
    }
    const env = getEnv();
    if (env === 'produccion' || !env) {
      return `https://${subdomain}.geovictoria.com`;
    }
    // Entorno personalizado: usa la URL base que GeoVictoria le asignó
    return `https://${subdomain}.${env}.geovictoria.com`;
  }

  // ─── Proxy Supabase (resuelve CORS) ───────────────────────────────────────
  // Todas las llamadas a GeoVictoria pasan por esta Edge Function server-side,
  // evitando el bloqueo CORS que ocurre en llamadas directas desde el navegador.
  const PROXY_URL = 'https://vtrpxsgcbojqgdcsplim.supabase.co/functions/v1/gv-proxy';

  // ─── Helper fetch JSON ─────────────────────────────────────────────────────
  async function post(url, body, headers = {}) {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: url, body, headers })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`GeoVictoria API error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      return text; // algunos endpoints devuelven strings simples ("OK", "true")
    }
  }

  // ─── Autenticación Token ───────────────────────────────────────────────────
  // POST /api/v1/Login — devuelve { token: "..." }
  // El token se cachea en localStorage y se reutiliza hasta que expira (5h).
  async function getToken(force = false) {
    if (!isConfigured()) throw new Error('GeoVictoria: credenciales no configuradas.');

    const now = Date.now();
    const cached = localStorage.getItem(KEY_TOKEN);
    const cachedTs = parseInt(localStorage.getItem(KEY_TOKEN_TS) || '0', 10);

    if (!force && cached && (now - cachedTs) < TOKEN_TTL) {
      return cached;
    }

    const data = await post(
      `${baseUrl('customerapi')}/api/v1/Login`,
      { User: getApiKey(), Password: getSecret() }
    );

    const token = data.token || data.Token;
    if (!token) throw new Error('GeoVictoria: Login no devolvió token.');

    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_TOKEN_TS, String(now));
    return token;
  }

  // Headers para métodos Token
  async function tokenHeaders() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  // Body base para métodos OAuth (Clave Api + Secreto)
  function oauthBody(extra = {}) {
    return { ApiKey: getApiKey(), Secret: getSecret(), ...extra };
  }

  // Wrapper para endpoints apiv3: intenta varios esquemas de autenticación.
  async function apiv3Post(path, extra = {}) {
    const url = `${baseUrl('apiv3')}${path}`;
    const isAuthError = msg => msg.includes('401') || msg.includes('404') || msg.includes('400');

    // Intento 1: Bearer token
    try {
      const headers = await tokenHeaders();
      return await post(url, extra, headers);
    } catch (e) {
      if (!isAuthError(e.message || '')) throw e;
    }
    // Intento 2: OAuth body con ApiKey + Secret
    try {
      return await post(url, { ApiKey: getApiKey(), Secret: getSecret(), ...extra });
    } catch (e) {
      if (!isAuthError(e.message || '')) throw e;
    }
    // Intento 3: OAuth body con User + Password (igual que endpoint Login)
    try {
      return await post(url, { User: getApiKey(), Password: getSecret(), ...extra });
    } catch (e) {
      if (!isAuthError(e.message || '')) throw e;
    }
    // Intento 4: OAuth body con ApiKey + ApiSecret
    return post(url, { ApiKey: getApiKey(), ApiSecret: getSecret(), ...extra });
  }

  // ─── LIBRO DE ASISTENCIA ───────────────────────────────────────────────────
  // POST /api/v1/AttendanceBook
  // Devuelve asistencia diaria por trabajador: marcajes, turno, horas, permisos, ausencias.
  //
  // @param {string[]} userIds   - RUTs u otros identificadores de colaboradores
  // @param {Date}     startDate
  // @param {Date}     endDate
  async function getAttendanceBook({ userIds, startDate, endDate }) {
    const fmt = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    };
    const headers = await tokenHeaders();
    const body = { StartDate: fmt(startDate), EndDate: fmt(endDate) };
    if (userIds && userIds.length > 0) body.UserIds = userIds.join(',');
    return post(`${baseUrl('customerapi')}/api/v1/AttendanceBook`, body, headers);
  }

  // ─── MARCAJES PENDIENTES ───────────────────────────────────────────────────
  // POST /api/v1/Punch/UpdateTimeOffCreationDateCheckpoint
  // Resetea el cursor de ListPending a una fecha dada.
  // @param {Date} date — fecha desde la que se quiere empezar a leer
  async function resetPunchCheckpoint(date) {
    const d = date || new Date(new Date().setHours(0, 0, 0, 0)); // medianoche hoy por defecto
    const p = n => String(n).padStart(2, '0');
    const fmt = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const headers = await tokenHeaders();
    return post(
      `${baseUrl('customerapi')}/api/v1/Punch/UpdateTimeOffCreationDateCheckpoint`,
      { CheckpointDate: fmt },
      headers
    );
  }

  // POST /api/v1/Punch/ListPending
  // Lista hasta 1.000 marcajes nuevos desde el último checkpoint.
  // Campos: Type (Ingreso/Salida), Date, Origin, UploadDate, UserIdentifier
  // resetCheckpoint: si es true, primero resetea el cursor a medianoche de hoy
  async function getRecentPunches({ resetCheckpoint = false } = {}) {
    if (resetCheckpoint) {
      await resetPunchCheckpoint();
    }
    const headers = await tokenHeaders();
    return post(
      `${baseUrl('customerapi')}/api/v1/Punch/ListPending`,
      {},
      headers
    );
  }

  // POST /api/Punch/ListPendingCheckPoint
  // Marcajes desde una fecha dada para colaboradores específicos.
  // Incluye GPS, temperatura, biométrico, etc.
  //
  // @param {string[]} userIdentifiers
  // @param {Date}     since
  async function getPunchesByUser({ userIdentifiers, since }) {
    const fmt = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    };
    return apiv3Post('/api/Punch/ListPendingCheckPoint', {
      CheckpointDate: fmt(since),
      Range: userIdentifiers.join(',')
    });
  }

  // ─── TRABAJADORES ──────────────────────────────────────────────────────────
  // POST /api/User/List
  // Lista todos los colaboradores activos/inactivos con nombre, grupo, cargo, etc.
  async function getWorkers() {
    return apiv3Post('/api/User/List');
  }

  // ─── TURNOS ────────────────────────────────────────────────────────────────
  // POST /api/Shift/List
  // Lista todos los turnos configurados en la empresa.
  async function getShifts() {
    return apiv3Post('/api/Shift/List');
  }

  // ─── GRUPOS / CUADRILLAS ───────────────────────────────────────────────────
  // POST /api/Group/ListGroup
  // Lista grupos con nombre, GPS, centro de costos y supervisores.
  async function getGroups() {
    return apiv3Post('/api/Group/ListGroup');
  }

  // ─── PERMISOS ──────────────────────────────────────────────────────────────
  // POST /api/v1/TimeOff/Get
  // @param {string[]} userIds
  // @param {Date}     startDate
  // @param {Date}     endDate
  async function getTimeOffs({ userIds, startDate, endDate }) {
    const fmt = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    };
    const headers = await tokenHeaders();
    return post(
      `${baseUrl('customerapi')}/api/v1/TimeOff/Get`,
      Object.assign({ StartDate: fmt(startDate), EndDate: fmt(endDate) }, userIds && userIds.length ? { UserIds: userIds } : {}),
      headers
    );
  }

  // ─── ACTIVIDADES / PROYECTOS ───────────────────────────────────────────────
  // POST /api/Activity/GetActivities
  // Retorna actividades registradas por trabajador en un rango de fechas.
  // Incluye GPS de inicio/fin, horas trabajadas, proyecto y tarea.
  //
  // @param {number[]} identifiers - IDs de colaboradores (sin puntos ni guiones)
  // @param {Date}     from
  // @param {Date}     to
  async function getActivities({ identifiers, from, to }) {
    const fmt = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    };
    return apiv3Post('/api/Activity/GetActivities', {
      Range: identifiers.join(','),
      from: fmt(from),
      to: fmt(to),
      includeAll: '0'
    });
  }

  // ─── CARGOS ────────────────────────────────────────────────────────────────
  // POST /api/Position/List
  async function getPositions() {
    return apiv3Post('/api/Position/List');
  }

  // ─── REMUNERACIONES (resumen) ─────────────────────────────────────────────
  // POST /api/v1/AttendanceBook (con IncludeAll)
  // Consolidado de horas trabajadas, no trabajadas, extras y ausencias.
  async function getRemunerationsConsolidated({ userIds, startDate, endDate, includeAll = 0 }) {
    const fmt = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    };
    const headers = await tokenHeaders();
    return post(
      `${baseUrl('customerapi')}/api/v1/Consolidated`,
      Object.assign({ IncludeAll: includeAll, StartDate: fmt(startDate), EndDate: fmt(endDate) }, userIds && userIds.length ? { UserIds: userIds.join(',') } : {}),
      headers
    );
  }

  // ─── HELPER: asistencia de hoy ────────────────────────────────────────────
  // Obtiene el libro de asistencia del día de hoy para todos los userIds dados.
  async function getTodayAttendance(userIds) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    return getAttendanceBook({ userIds, startDate: start, endDate: end });
  }

  // ─── HELPER: quiénes están en el predio ahora ─────────────────────────────
  // Filtra los marcajes recientes para identificar quién está actualmente dentro.
  // Lógica: el último marcaje de cada persona es "Ingreso" → está adentro.
  async function getWorkersOnSite() {
    const punches = await getRecentPunches();
    if (!Array.isArray(punches)) return [];

    // Agrupar por trabajador, tomar el último marcaje
    const byWorker = {};
    punches.forEach(p => {
      const id = p.UserIdentifier;
      const parseDate = s => { if(!s) return 0; const d=new Date(s); if(!isNaN(d)) return +d; const m=String(s).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/); return m?+new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]):0; };
      if (!byWorker[id] || parseDate(p.Date) > parseDate(byWorker[id].Date)) {
        byWorker[id] = p;
      }
    });

    // Devolver solo los que tienen como último marcaje "Ingreso"
    return Object.values(byWorker).filter(p => p.Type === 'Ingreso');
  }

  // ─── VERIFICAR CONEXIÓN ────────────────────────────────────────────────────
  async function testConnection() {
    try {
      const token = await getToken(true); // fuerza nuevo token
      return { ok: true, token: token.slice(0, 20) + '...' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ─── API PÚBLICA ───────────────────────────────────────────────────────────
  return {
    // Config
    setCredentials,
    isConfigured,
    getApiKey,
    getEnv,
    testConnection,

    // Datos principales
    getWorkers,
    getGroups,
    getShifts,
    getPositions,

    // Asistencia
    getAttendanceBook,
    getTodayAttendance,
    getWorkersOnSite,
    getRecentPunches,
    resetPunchCheckpoint,
    getPunchesByUser,

    // Permisos
    getTimeOffs,

    // Actividades
    getActivities,

    // Remuneraciones
    getRemunerationsConsolidated
  };

})();
