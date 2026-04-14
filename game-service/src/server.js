require('dotenv').config();

const app              = require('./app');
const { connectRedis } = require('./config/redis');
const { registerEureka } = require('./config/eureka');

const PORT = parseInt(process.env.PORT) || 8083;

async function start() {
  // 1. Conectar a Redis (obligatorio)
  await connectRedis();

  // 2. Levantar servidor HTTP
  app.listen(PORT, () => {
    console.log(`[Server] game-service escuchando en el puerto ${PORT}`);
  });

  // 3. Registrar en Eureka (opcional — el servicio funciona sin él en desarrollo)
  registerEureka().catch((err) => {
    console.warn('[Eureka] Registro fallido (el servicio continúa sin Eureka):', err.message);
  });
}

start().catch((err) => {
  console.error('[Server] Error fatal al iniciar el servicio:', err);
  process.exit(1);
});
