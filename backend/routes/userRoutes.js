const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); 

router.get('/me', authMiddleware, userController.getLoggedInUserProfile);
router.get('/my-tickets', authMiddleware, userController.getMyTickets);
router.put('/me', authMiddleware, upload.fields([{ name: 'profilePicture', maxCount: 1 }, { name: 'coverPicture', maxCount: 1 }]), userController.editUserProfile);
router.get('/:id/favorites', authMiddleware, userController.getFavoritedEvents);
router.get('/:userId', userController.getPublicUserProfile);

// ROTA IMPORTANTE ADICIONADA:
router.post('/toggle-favorite', authMiddleware, userController.toggleFavorite);

module.exports = router;