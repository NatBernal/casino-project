const Redis = require('ioredis');

let client = null;

async function connectRedis() {
  client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });

  client.on('connect', () => console.log('[Redis] Conectado'));
  client.on('error', (err) => console.error('[Redis] Error:', err.message));

  await client.ping();
  return client;
}

function getRedis() {
  if (!client) throw new Error('Redis no inicializado — llama connectRedis() primero');
  return client;
}

module.exports = { connectRedis, getRedis };
