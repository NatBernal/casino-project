const gameService   = require('../services/game.service');
const walletService = require('../services/wallet.service');
const auditService  = require('../services/audit.service');
const { getRedis }  = require('../config/redis');

// ── POST /game/start ──────────────────────────────────────────────────────────
async function startGame(req, res, next) {
  try {
    const userId  = req.userId;
    const apuesta = Number(req.body?.apuesta);

    if (!apuesta || apuesta <= 0 || !Number.isFinite(apuesta)) {
      return res.status(400).json({ error: 'El campo "apuesta" debe ser un número mayor a 0' });
    }

    // 1. Cobrar apuesta al wallet
    try {
      await walletService.cobrarApuesta(userId, apuesta);
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      return res.status(402).json({ error: `Sin fondos o error en wallet: ${detail}` });
    }

    // 2. Crear partida
    const partida = gameService.iniciarPartida(userId, apuesta);
    const redis   = getRedis();
    await gameService.guardarPartida(redis, partida);

    // 3. Si hay blackjack natural en el reparto inicial, finalizar de inmediato
    if (partida.estado !== 'ACTIVA') {
      await _finalizarPartida(redis, partida);
    }

    auditService.log(userId, 'GAME_START', { partidaId: partida.id, apuesta });

    return res.status(201).json(gameService.estadoPublico(partida));
  } catch (err) {
    next(err);
  }
}

// ── POST /game/:partidaId/hit ─────────────────────────────────────────────────
async function hitGame(req, res, next) {
  try {
    const redis   = getRedis();
    const partida = await _cargarPartidaDelUsuario(redis, req.params.partidaId, req.userId, res);
    if (!partida) return;

    if (partida.estado !== 'ACTIVA') {
      return res.status(409).json({ error: 'La partida no está activa' });
    }

    const actualizada = gameService.aplicarHit(partida);
    await gameService.guardarPartida(redis, actualizada);

    if (actualizada.estado !== 'ACTIVA') {
      await _finalizarPartida(redis, actualizada);
      auditService.log(req.userId, 'GAME_BUST', { partidaId: actualizada.id });
    } else {
      auditService.log(req.userId, 'GAME_HIT', { partidaId: actualizada.id });
    }

    return res.json(gameService.estadoPublico(actualizada));
  } catch (err) {
    next(err);
  }
}

// ── POST /game/:partidaId/stand ───────────────────────────────────────────────
async function standGame(req, res, next) {
  try {
    const redis   = getRedis();
    const partida = await _cargarPartidaDelUsuario(redis, req.params.partidaId, req.userId, res);
    if (!partida) return;

    if (partida.estado !== 'ACTIVA') {
      return res.status(409).json({ error: 'La partida no está activa' });
    }

    const actualizada = gameService.aplicarStand(partida);
    await gameService.guardarPartida(redis, actualizada);
    await _finalizarPartida(redis, actualizada);

    auditService.log(req.userId, 'GAME_STAND', {
      partidaId: actualizada.id,
      estado:    actualizada.estado,
      pago:      gameService.calcularPago(actualizada),
    });

    return res.json(gameService.estadoPublico(actualizada));
  } catch (err) {
    next(err);
  }
}

// ── GET /game/:partidaId/state ────────────────────────────────────────────────
async function getGameState(req, res, next) {
  try {
    const redis   = getRedis();
    const partida = await _cargarPartidaDelUsuario(redis, req.params.partidaId, req.userId, res);
    if (!partida) return;

    return res.json(gameService.estadoPublico(partida));
  } catch (err) {
    next(err);
  }
}

// ── POST /game/:partidaId/abandon ─────────────────────────────────────────────
async function abandonGame(req, res, next) {
  try {
    const redis   = getRedis();
    const partida = await _cargarPartidaDelUsuario(redis, req.params.partidaId, req.userId, res);
    if (!partida) return;

    if (partida.estado !== 'ACTIVA') {
      return res.status(409).json({ error: 'La partida no está activa' });
    }

    const actualizada = gameService.aplicarAbandon(partida);
    await gameService.guardarPartida(redis, actualizada);
    await gameService.agregarAlHistorial(redis, req.userId, actualizada);

    auditService.log(req.userId, 'GAME_ABANDON', { partidaId: actualizada.id });

    return res.json(gameService.estadoPublico(actualizada));
  } catch (err) {
    next(err);
  }
}

// ── GET /game/history/:userId ─────────────────────────────────────────────────
async function getHistory(req, res, next) {
  try {
    const { userId: targetUserId } = req.params;

    // Cada usuario solo puede ver su propio historial
    if (req.userId !== targetUserId) {
      return res.status(403).json({ error: 'No autorizado para ver este historial' });
    }

    const redis    = getRedis();
    const partidas = await gameService.obtenerHistorial(redis, targetUserId);

    return res.json({ userId: targetUserId, partidas });
  } catch (err) {
    next(err);
  }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Carga una partida de Redis y verifica que pertenezca al usuario autenticado.
 * Si no la encuentra o no es del usuario, escribe la respuesta de error y devuelve null.
 */
async function _cargarPartidaDelUsuario(redis, partidaId, userId, res) {
  const partida = await gameService.obtenerPartida(redis, partidaId);
  if (!partida) {
    res.status(404).json({ error: 'Partida no encontrada' });
    return null;
  }
  if (partida.userId !== userId) {
    res.status(403).json({ error: 'No autorizado para acceder a esta partida' });
    return null;
  }
  return partida;
}

/**
 * Al finalizar una partida:
 *   1. Guarda el estado final con TTL largo.
 *   2. Agrega al historial del usuario.
 *   3. Acredita el pago en el wallet (si corresponde).
 */
async function _finalizarPartida(redis, partida) {
  await gameService.guardarPartida(redis, partida);
  await gameService.agregarAlHistorial(redis, partida.userId, partida);

  const pago = gameService.calcularPago(partida);
  if (pago > 0) {
    await walletService.acreditarGanancia(partida.userId, pago, partida.id);
  }
}

module.exports = { startGame, hitGame, standGame, getGameState, abandonGame, getHistory };
