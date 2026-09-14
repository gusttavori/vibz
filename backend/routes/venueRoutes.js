const express = require('express');
const router = express.Router();
const { importInstagramFeed, getActiveFeeds, deleteFeed } = require('../controllers/venueController');

// ⚠️ Verifique o caminho exato do seu middleware de autenticação (ex: '../middleware/auth' ou '../middlewares/auth')
const verifyAuth = require('../middleware/authMiddleware'); 

// Rota pública para listar os feeds na Home
router.get('/', getActiveFeeds);

// Rotas protegidas (apenas admin)
router.post('/import', verifyAuth, importInstagramFeed);
router.delete('/:id', verifyAuth, deleteFeed);

module.exports = router;