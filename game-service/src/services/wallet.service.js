/**
 * wallet.service.js
 * Cliente HTTP para el wallet-service de Natalia.
 *
 * Contrato esperado:
 *   POST /wallet/withdraw  { userId, monto, tipo, descripcion }
 *     → 200 OK  |  4xx si saldo insuficiente
 *   POST /wallet/deposit   { userId, monto, tipo, descripcion }
 *     → 200 OK
 *
 * Si Natalia cambia los endpoints, solo hay que modificar este archivo.
 */

const axios = require('axios');

const client = axios.create({
  baseURL: process.env.WALLET_SERVICE_URL || 'http://localhost:8082',
  timeout: 5000,
});

/**
 * Cobra la apuesta al wallet del jugador antes de iniciar la partida.
 * Lanza un error si el saldo es insuficiente o si el servicio no responde.
 * @param {string} userId
 * @param {number} monto
 */
async function cobrarApuesta(userId, monto) {
  const { data } = await client.post('/wallet/withdraw', {
    userId,
    monto,
    tipo: 'APUESTA',
    descripcion: 'Apuesta de Blackjack',
  });
  return data;
}

/**
 * Acredita las ganancias al wallet del jugador al finalizar la partida.
 * Esta función NO lanza excepciones — registra el error en consola para
 * revisión manual si la llamada falla (el juego ya terminó).
 * @param {string} userId
 * @param {number} monto  — incluye la devolución de la apuesta original
 * @param {string} partidaId
 */
async function acreditarGanancia(userId, monto, partidaId) {
  try {
    const { data } = await client.post('/wallet/deposit', {
      userId,
      monto,
      tipo: 'GANANCIA',
      descripcion: `Ganancia Blackjack — partida ${partidaId}`,
    });
    return data;
  } catch (err) {
    console.error(
      `[WalletService] FALLO al acreditar ganancia — userId=${userId} monto=${monto} partidaId=${partidaId}:`,
      err.message,
    );
    // No re-lanzamos: la partida ya finalizó, esto requeriría reconciliación manual.
  }
}

module.exports = { cobrarApuesta, acreditarGanancia };
