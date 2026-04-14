/**
 * blackjack.service.js
 * Lógica pura del juego — sin efectos secundarios, sin Redis, sin HTTP.
 */

const PALOS = ['♠', '♥', '♦', '♣'];
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Crea un mazo de 52 cartas sin mezclar.
 * @returns {Array<{palo: string, valor: string, puntos: number}>}
 */
function crearMazo() {
  const cartas = [];
  for (const palo of PALOS) {
    for (const valor of VALORES) {
      let puntos;
      if (valor === 'A') puntos = 11;
      else if (['J', 'Q', 'K'].includes(valor)) puntos = 10;
      else puntos = parseInt(valor, 10);
      cartas.push({ palo, valor, puntos });
    }
  }
  return cartas;
}

/**
 * Mezcla un mazo usando el algoritmo Fisher-Yates.
 * @param {Array} cartas
 * @returns {Array} nuevo array mezclado
 */
function mezclarMazo(cartas) {
  const mazo = [...cartas];
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

/**
 * Calcula los puntos de una mano, ajustando ases de 11→1 para evitar bust.
 * @param {Array<{puntos: number, valor: string}>} cartas
 * @returns {number}
 */
function calcularPuntos(cartas) {
  let total = 0;
  let ases = 0;
  for (const carta of cartas) {
    total += carta.puntos;
    if (carta.valor === 'A') ases++;
  }
  while (total > 21 && ases > 0) {
    total -= 10; // As: 11 → 1
    ases--;
  }
  return total;
}

/**
 * @param {Array} cartas
 * @returns {boolean}
 */
function esBust(cartas) {
  return calcularPuntos(cartas) > 21;
}

/**
 * Blackjack natural: exactamente 2 cartas que suman 21.
 * @param {Array} cartas
 * @returns {boolean}
 */
function esBlackjack(cartas) {
  return cartas.length === 2 && calcularPuntos(cartas) === 21;
}

module.exports = { crearMazo, mezclarMazo, calcularPuntos, esBust, esBlackjack };
