/**
 * audit.service.js
 * Cliente HTTP para el audit-service de Mileth.
 *
 * Contrato esperado:
 *   POST /audit/log  { userId, tipo, servicio, datos, timestamp }
 *
 * Nunca lanza excepciones — la auditoría es best-effort y no debe
 * interrumpir el flujo del juego.
 */

const axios = require('axios');

const client = axios.create({
  baseURL: process.env.AUDIT_SERVICE_URL || 'http://localhost:8084',
  timeout: 3000,
});

/**
 * Registra un evento de auditoría de forma asíncrona y silenciosa.
 * @param {string} userId
 * @param {string} tipo   — ej: 'GAME_START', 'GAME_HIT', 'GAME_END'
 * @param {object} datos  — payload adicional del evento
 */
async function log(userId, tipo, datos = {}) {
  try {
    await client.post('/audit/log', {
      userId,
      tipo,
      servicio: 'game-service',
      datos,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[AuditService] No se pudo registrar evento tipo=${tipo}:`, err.message);
  }
}

module.exports = { log };
