/**
 * auth.middleware.js
 *
 * Extrae el userId del request autenticado usando dos fuentes (en orden):
 *
 *   1. Header X-User-Id  — inyectado por el API Gateway después de validar el JWT.
 *      Es la ruta normal en producción/Docker.
 *
 *   2. Bearer JWT en Authorization — validado localmente con JWT_SECRET.
 *      Útil para pruebas directas al servicio sin el gateway.
 */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // ── 1. Header del API Gateway (producción) ────────────────────────────────
  const userIdFromGateway = req.headers['x-user-id'];
  if (userIdFromGateway) {
    req.userId = String(userIdFromGateway);
    return next();
  }

  // ── 2. JWT directo (desarrollo / tests) ───────────────────────────────────
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
      req.userId = String(payload.sub || payload.userId || payload.id);
      return next();
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  }

  return res.status(401).json({ error: 'No autenticado' });
}

module.exports = authMiddleware;
