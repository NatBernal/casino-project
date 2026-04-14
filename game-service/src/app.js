const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const gameRoutes   = require('./routes/game.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check — usado por Docker y Eureka
app.get('/health',           (_req, res) => res.json({ status: 'UP', service: 'game-service' }));
app.get('/actuator/health',  (_req, res) => res.json({ status: 'UP', service: 'game-service' }));

// Rutas del juego
app.use('/game', gameRoutes);

// Manejador global de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;
