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
  //   customerapi.{env}.geovictoria.com  →  métodos autenticados por Token
  //   apiv3.{env}.geovictoria.com        →  métodos autenticados por OAuth (Api Key + Secret)
  function baseUrl(subdomain = 'customerapi') {
    const env = getEnv();
    // Para el ambiente de producción la URL es simplemente geovictoria.com
    if (env === 'produccion') {
      return `https://${subdomain}.geovictoria.com`;
    }
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
    return { Authorization: token };
  }

  // Body base para métodos OAuth (Clave Api + Secreto)
  function oauthBody(extra = {}) {
    return { ApiKey: getApiKey(), Secret: getSecret(), ...extra };
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
    return post(
      `${baseUrl('customerapi')}/api/v1/AttendanceBook`,
      {
        StartDate: fmt(startDate),
        EndDate:   fmt(endDate),
        UserIds:   userIds.join(',')
      },
      headers
    );
  }

  // ─── MARCAJES PENDIENTES ───────────────────────────────────────────────────
  // POST /api/v1/Punch/ListPending
  // Lista hasta 1.000 marcajes nuevos desde el último checkpoint.
  // Campos: Type (Ingreso/Salida), Date, Origin, UploadDate, UserIdentifier
  async function getRecentPunches() {
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
    return post(
      `${baseUrl('apiv3')}/api/Punch/ListPendingCheckPoint`,
      oauthBody({
        CheckpointDate: fmt(since),
        Range: userIdentifiers.join(',')
      })
    );
  }

  // ─── TRABAJADORES ──────────────────────────────────────────────────────────
  // POST /api/User/List
  // Lista todos los colaboradores activos/inactivos con nombre, grupo, cargo, etc.
  async function getWorkers() {
    return post(
      `${baseUrl('apiv3')}/api/User/List`,
      oauthBody()
    );
  }

  // ─── TURNOS ────────────────────────────────────────────────────────────────
  // POST /api/Shift/List
  // Lista todos los turnos configurados en la empresa.
  async function getShifts() {
    return post(
      `${baseUrl('apiv3')}/api/Shift/List`,
      oauthBody()
    );
  }

  // ─── GRUPOS / CUADRILLAS ───────────────────────────────────────────────────
  // POST /api/Group/ListGroup
  // Lista grupos con nombre, GPS, centro de costos y supervisores.
  async function getGroups() {
    return post(
      `${baseUrl('apiv3')}/api/Group/ListGroup`,
      oauthBody()
    );
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
      { StartDate: fmt(startDate), EndDate: fmt(endDate), UserIds: userIds },
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
    return post(
      `${baseUrl('apiv3')}/api/Activity/GetActivities`,
      oauthBody({
        Range: identifiers.join(','),
        from: fmt(from),
        to: fmt(to),
        includeAll: '0'
      })
    );
  }

  // ─── CARGOS ────────────────────────────────────────────────────────────────
  // POST /api/Position/List
  async function getPositions() {
    return post(
      `${baseUrl('apiv3')}/api/Position/List`,
      oauthBody()
    );
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
      {
        IncludeAll: includeAll,
        StartDate:  fmt(startDate),
        EndDate:    fmt(endDate),
        UserIds:    userIds.join(',')
      },
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
      if (!byWorker[id] || new Date(p.Date) > new Date(byWorker[id].Date)) {
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
    getPunchesByUser,

    // Permisos
    getTimeOffs,

    // Actividades
    getActivities,

    // Remuneraciones
    getRemunerationsConsolidated
  };

})();
