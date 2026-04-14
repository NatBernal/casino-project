/**
 * game.service.js
 * Gestión del estado de partidas: lógica de negocio + operaciones Redis.
 *
 * Estados posibles de una Partida:
 *   ACTIVA            — partida en curso
 *   BLACKJACK_JUGADOR — blackjack natural del jugador (paga 3:2)
 *   BLACKJACK_DEALER  — blackjack natural del dealer
 *   JUGADOR_GANO      — jugador gana por puntos
 *   DEALER_GANO       — dealer gana por puntos
 *   EMPATE            — mismo puntaje (push)
 *   JUGADOR_SE_PASO   — jugador se pasó de 21
 *   DEALER_SE_PASO    — dealer se pasó de 21 (jugador gana)
 *   ABANDONADA        — jugador abandonó la partida
 */

const { v4: uuidv4 } = require('uuid');
const {
  crearMazo,
  mezclarMazo,
  calcularPuntos,
  esBust,
  esBlackjack,
} = require('./blackjack.service');

const REDIS_TTL_ACTIVA     = 60 * 60;            // 1 hora  — partidas activas
const REDIS_TTL_FINALIZADA = 60 * 60 * 24 * 7;   // 7 días  — partidas terminadas
const MAX_HISTORIAL        = 50;                  // últimas N partidas por usuario

// ── Creación ──────────────────────────────────────────────────────────────────

/**
 * Crea el objeto de una nueva partida con el reparto inicial.
 * No escribe en Redis — llama a guardarPartida() después.
 * @param {string} userId
 * @param {number} apuesta
 * @returns {object} partida
 */
function iniciarPartida(userId, apuesta) {
  const mazo = mezclarMazo(crearMazo());

  // Reparto alternado: J1, D1, J2, D2 (sacamos del final = "tope del mazo")
  const cartasJugador = [mazo.pop(), mazo.pop()];
  const cartasDealer  = [mazo.pop(), mazo.pop()]; // la segunda carta del dealer queda boca abajo

  const bj_jugador = esBlackjack(cartasJugador);
  const bj_dealer  = esBlackjack(cartasDealer);

  let estado       = 'ACTIVA';
  let finalizadoEn = null;

  if (bj_jugador || bj_dealer) {
    finalizadoEn = new Date().toISOString();
    if (bj_jugador && bj_dealer) estado = 'EMPATE';
    else if (bj_jugador)         estado = 'BLACKJACK_JUGADOR';
    else                         estado = 'BLACKJACK_DEALER';
  }

  return {
    id: uuidv4(),
    userId,
    estado,
    manoJugador: { cartas: cartasJugador },
    manoDealer:  { cartas: cartasDealer },
    mazo,        // mazo restante — NO se expone al cliente (para evitar card-counting)
    apuesta,
    creadoEn:    new Date().toISOString(),
    finalizadoEn,
  };
}

// ── Acciones del jugador ──────────────────────────────────────────────────────

/**
 * El jugador pide una carta más (hit).
 * @param {object} partida
 * @returns {object} partida actualizada
 */
function aplicarHit(partida) {
  if (partida.estado !== 'ACTIVA') {
    throw Object.assign(new Error('La partida no está activa'), { status: 409 });
  }

  const cartaRobada  = partida.mazo[partida.mazo.length - 1];
  const mazoRestante = partida.mazo.slice(0, -1);
  const nuevasCartas = [...partida.manoJugador.cartas, cartaRobada];

  const estado       = esBust(nuevasCartas) ? 'JUGADOR_SE_PASO' : 'ACTIVA';
  const finalizadoEn = estado !== 'ACTIVA' ? new Date().toISOString() : null;

  return {
    ...partida,
    estado,
    manoJugador: { cartas: nuevasCartas },
    mazo: mazoRestante,
    finalizadoEn,
  };
}

/**
 * El jugador se planta (stand). El dealer revela su carta oculta y
 * roba hasta alcanzar 17+ puntos. Se determina el ganador.
 * @param {object} partida
 * @returns {object} partida actualizada
 */
function aplicarStand(partida) {
  if (partida.estado !== 'ACTIVA') {
    throw Object.assign(new Error('La partida no está activa'), { status: 409 });
  }

  const cartasDealer = [...partida.manoDealer.cartas];
  const mazoActual   = [...partida.mazo];

  // El dealer roba hasta tener 17 o más puntos
  while (calcularPuntos(cartasDealer) < 17) {
    cartasDealer.push(mazoActual.pop());
  }

  const puntosJugador = calcularPuntos(partida.manoJugador.cartas);
  const puntosDealer  = calcularPuntos(cartasDealer);

  let estado;
  if (puntosDealer > 21)               estado = 'DEALER_SE_PASO';
  else if (puntosJugador > puntosDealer) estado = 'JUGADOR_GANO';
  else if (puntosDealer > puntosJugador) estado = 'DEALER_GANO';
  else                                   estado = 'EMPATE';

  return {
    ...partida,
    estado,
    manoDealer: { cartas: cartasDealer },
    mazo: mazoActual,
    finalizadoEn: new Date().toISOString(),
  };
}

/**
 * El jugador abandona la partida (pierde la apuesta).
 * @param {object} partida
 * @returns {object} partida actualizada
 */
function aplicarAbandon(partida) {
  if (partida.estado !== 'ACTIVA') {
    throw Object.assign(new Error('La partida no está activa'), { status: 409 });
  }
  return {
    ...partida,
    estado: 'ABANDONADA',
    finalizadoEn: new Date().toISOString(),
  };
}

// ── Cálculo de pagos ──────────────────────────────────────────────────────────

/**
 * Calcula cuánto hay que acreditar al wallet del jugador al finalizar la partida.
 * Incluye la devolución de la apuesta original en caso de victoria o empate.
 *
 *   BLACKJACK_JUGADOR → apuesta × 2.5  (paga 3:2)
 *   JUGADOR_GANO / DEALER_SE_PASO → apuesta × 2  (paga 1:1)
 *   EMPATE → apuesta × 1  (devuelve la apuesta)
 *   Resto → 0  (pierde)
 *
 * @param {object} partida
 * @returns {number}
 */
function calcularPago(partida) {
  switch (partida.estado) {
    case 'BLACKJACK_JUGADOR':
      return Math.floor(partida.apuesta * 2.5);
    case 'JUGADOR_GANO':
    case 'DEALER_SE_PASO':
      return partida.apuesta * 2;
    case 'EMPATE':
      return partida.apuesta;
    default:
      return 0;
  }
}

// ── Estado público (oculta la carta boca abajo del dealer) ───────────────────

/**
 * Transforma el estado interno en la respuesta segura para el cliente.
 * Mientras la partida está ACTIVA, la segunda carta del dealer permanece oculta.
 * El mazo restante NUNCA se expone.
 * @param {object} partida
 * @returns {object}
 */
function estadoPublico(partida) {
  const esActiva = partida.estado === 'ACTIVA';

  const cartasDealer = esActiva
    ? [partida.manoDealer.cartas[0], { oculta: true }]
    : partida.manoDealer.cartas;

  const puntosDealer = esActiva
    ? partida.manoDealer.cartas[0].puntos  // solo la carta visible
    : calcularPuntos(partida.manoDealer.cartas);

  return {
    id:          partida.id,
    estado:      partida.estado,
    manoJugador: {
      cartas: partida.manoJugador.cartas,
      puntos: calcularPuntos(partida.manoJugador.cartas),
    },
    manoDealer: {
      cartas: cartasDealer,
      puntos: puntosDealer,
    },
    apuesta:     partida.apuesta,
    pago:        esActiva ? null : calcularPago(partida),
    creadoEn:    partida.creadoEn,
    finalizadoEn: partida.finalizadoEn,
  };
}

// ── Operaciones Redis ─────────────────────────────────────────────────────────

async function guardarPartida(redis, partida) {
  const ttl = partida.estado === 'ACTIVA' ? REDIS_TTL_ACTIVA : REDIS_TTL_FINALIZADA;
  await redis.setex(`game:${partida.id}`, ttl, JSON.stringify(partida));
}

async function obtenerPartida(redis, partidaId) {
  const data = await redis.get(`game:${partidaId}`);
  return data ? JSON.parse(data) : null;
}

async function agregarAlHistorial(redis, userId, partida) {
  const key = `game:history:${userId}`;
  const resumen = {
    id:            partida.id,
    estado:        partida.estado,
    apuesta:       partida.apuesta,
    pago:          calcularPago(partida),
    puntosJugador: calcularPuntos(partida.manoJugador.cartas),
    puntosDealer:  calcularPuntos(partida.manoDealer.cartas),
    creadoEn:      partida.creadoEn,
    finalizadoEn:  partida.finalizadoEn,
  };
  await redis.lpush(key, JSON.stringify(resumen));
  await redis.ltrim(key, 0, MAX_HISTORIAL - 1);
  await redis.expire(key, 60 * 60 * 24 * 30); // 30 días
}

async function obtenerHistorial(redis, userId) {
  const items = await redis.lrange(`game:history:${userId}`, 0, -1);
  return items.map((item) => JSON.parse(item));
}

module.exports = {
  iniciarPartida,
  aplicarHit,
  aplicarStand,
  aplicarAbandon,
  calcularPago,
  estadoPublico,
  guardarPartida,
  obtenerPartida,
  agregarAlHistorial,
  obtenerHistorial,
};
