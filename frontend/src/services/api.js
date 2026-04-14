// ─── Base config ────────────────────────────────────────
const AUTH_URL   = import.meta.env.VITE_AUTH_URL   || 'http://localhost:8081'
const WALLET_URL = import.meta.env.VITE_WALLET_URL || 'http://localhost:8082'
const GAME_URL   = import.meta.env.VITE_GAME_URL   || 'http://localhost:8083'
const ADMIN_URL  = import.meta.env.VITE_ADMIN_URL  || 'http://localhost:8085'

async function request(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try { const body = await res.json(); msg = body.message || body.detail || msg } catch {}
    throw new Error(msg)
  }
  // Some endpoints return empty body (204, logout, etc.)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ─── Auth Service ────────────────────────────────────────
export const authService = {
  register: (email, password, role = 'USER') =>
    request(`${AUTH_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    }),

  login: (email, password) =>
    request(`${AUTH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  // Dev-only: get MFA code without email
  getMfaCode: (tempCode) =>
    request(`${AUTH_URL}/auth/mfa/code/${tempCode}`),

  verifyMfa: async (tempCode, mfaCode) => {
    const res = await fetch(`${AUTH_URL}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempCode, mfaCode }),
    })
    if (!res.ok) {
      let msg = `Error ${res.status}`
      try { const b = await res.json(); msg = b.message || msg } catch {}
      throw new Error(msg)
    }
    // JWT lives in Authorization response header
    const authHeader = res.headers.get('Authorization') || res.headers.get('authorization')
    // Also try to get user from body
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    return { token: authHeader, body }
  },

  logout: (token) =>
    request(`${AUTH_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: token },
    }),
}

// ─── Wallet Service ──────────────────────────────────────
export const walletService = {
  getBalance: (userId, token) =>
    request(`${WALLET_URL}/wallet/${userId}`, {
      headers: { Authorization: token },
    }),

  deposit: (userId, montoUsd, token) =>
    request(`${WALLET_URL}/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ usuario_id: userId, monto_usd: montoUsd }),
    }),

  withdraw: (userId, montoCreditos, cuentaDestino, token) =>
    request(`${WALLET_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ usuario_id: userId, monto_creditos: montoCreditos, cuenta_destino: cuentaDestino }),
    }),

  execWithdraw: (solicitudId, token) =>
    request(`${WALLET_URL}/wallet/withdraw/${solicitudId}/exec`, {
      method: 'PUT',
      headers: { Authorization: token },
    }),

  getTransactions: (userId, token) =>
    request(`${WALLET_URL}/wallet/transactions/${userId}`, {
      headers: { Authorization: token },
    }),
}

// ─── Game Service ────────────────────────────────────────
export const gameService = {
  start: (apuesta, token) =>
    request(`${GAME_URL}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ apuesta }),
    }),

  hit: (partidaId, token) =>
    request(`${GAME_URL}/game/${partidaId}/hit`, {
      method: 'POST',
      headers: { Authorization: token },
    }),

  stand: (partidaId, token) =>
    request(`${GAME_URL}/game/${partidaId}/stand`, {
      method: 'POST',
      headers: { Authorization: token },
    }),

  abandon: (partidaId, token) =>
    request(`${GAME_URL}/game/${partidaId}/abandon`, {
      method: 'POST',
      headers: { Authorization: token },
    }),

  state: (partidaId, token) =>
    request(`${GAME_URL}/game/${partidaId}/state`, {
      headers: { Authorization: token },
    }),

  history: (userId, token) =>
    request(`${GAME_URL}/game/history/${userId}`, {
      headers: { Authorization: token },
    }),
}

// ─── Admin Service ───────────────────────────────────────
export const adminService = {
  getUsers: (estado, token) => {
    const url = estado
      ? `${ADMIN_URL}/admin/users?estado=${estado}`
      : `${ADMIN_URL}/admin/users`
    return request(url, { headers: { Authorization: token } })
  },

  getUser: (userId, token) =>
    request(`${ADMIN_URL}/admin/users/${userId}`, {
      headers: { Authorization: token },
    }),

  suspendUser: (userId, adminId, token) =>
    request(`${ADMIN_URL}/admin/users/${userId}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ admin_id: adminId }),
    }),

  activateUser: (userId, adminId, token) =>
    request(`${ADMIN_URL}/admin/users/${userId}/activate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ admin_id: adminId }),
    }),

  generateReport: (adminId, tipo, inicio, fin, token) =>
    request(`${ADMIN_URL}/admin/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ admin_id: adminId, tipo, periodo_inicio: inicio, periodo_fin: fin }),
    }),

  getReports: (adminId, token) =>
    request(`${ADMIN_URL}/admin/reports?admin_id=${adminId}`, {
      headers: { Authorization: token },
    }),
}