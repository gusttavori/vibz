const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); 

// Rotas de Leitura
router.get('/me', authMiddleware, userController.getLoggedInUserProfile);
router.get('/my-tickets', authMiddleware, userController.getMyTickets);
router.get('/:id/favorites', authMiddleware, userController.getFavoritedEvents);
router.get('/:userId', userController.getPublicUserProfile);

// Rotas de Escrita (Atualização)
router.put('/me', authMiddleware, upload.fields([{ name: 'profilePicture', maxCount: 1 }, { name: 'coverPicture', maxCount: 1 }]), userController.editUserProfile);

// 👇 ROTA CRÍTICA PARA O FAVORITO FUNCIONAR
router.post('/toggle-favorite', authMiddleware, userController.toggleFavorite);

module.exports = router;