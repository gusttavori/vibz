const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const geocodeAddressBackend = require('../utils/geocode'); 
const authMiddleware = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const injectGeocode = (req, res, next) => {
    req.geocodeAddress = geocodeAddressBackend;
    next();
};

// Rotas de Criação e Edição
router.post('/', authMiddleware, upload.single('image'), injectGeocode, eventController.createEvent);
router.put('/:id', authMiddleware, upload.single('image'), injectGeocode, eventController.updateEvent);

// Rota do Organizador
router.get('/organizer/my-events', authMiddleware, eventController.getMyEvents);

// Rota de Favoritos
router.post('/:id/favorite', authMiddleware, eventController.toggleFavorite);

// --- CORREÇÃO: ADICIONADA A ROTA DE PARTICIPANTES AQUI ---
router.get('/:id/participants', authMiddleware, eventController.getEventParticipants);

// Rotas Públicas de Listagem
router.get('/', eventController.getEvents);
router.get('/featured', eventController.getFeaturedEvents);
router.get('/search', eventController.searchEvents);
router.get('/cities', eventController.getEventCities);
router.get('/category/:categoryName', eventController.getEventsByCategory);
router.get('/:id', eventController.getEventById);

// Rotas Administrativas (Aprovação)
router.get('/pending', authMiddleware, eventController.getPendingEvents);
router.put('/approve/:id', authMiddleware, eventController.approveEvent);
router.delete('/reject/:id', authMiddleware, eventController.rejectEvent);
router.get('/highlights/pending', authMiddleware, eventController.getPendingHighlights);
router.put('/highlight/approve/:id', authMiddleware, eventController.approveHighlight);
router.put('/highlight/reject/:id', authMiddleware, eventController.rejectHighlight);

module.exports = router;