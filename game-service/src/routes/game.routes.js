const { Router } = require('express');
const controller = require('../controllers/game.controller');
const auth       = require('../middleware/auth.middleware');

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// IMPORTANTE: /history/:userId debe ir ANTES que /:partidaId/* para evitar conflictos
router.get('/history/:userId',       controller.getHistory);

router.post('/start',                controller.startGame);
router.post('/:partidaId/hit',       controller.hitGame);
router.post('/:partidaId/stand',     controller.standGame);
router.get('/:partidaId/state',      controller.getGameState);
router.post('/:partidaId/abandon',   controller.abandonGame);

module.exports = router;
