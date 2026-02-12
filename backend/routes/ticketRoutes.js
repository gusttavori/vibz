const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getMyTickets, 
    validateTicket, 
    downloadTicketPDF,
    listLastTickets // Importando a função
} = require('../controllers/ticketController');

router.get('/my-tickets', authMiddleware, getMyTickets);
router.get('/:ticketId/download', authMiddleware, downloadTicketPDF);
router.post('/validate', authMiddleware, validateTicket);

// ROTA DE ESPIONAGEM: Acesse /api/tickets/debug/last no navegador
router.get('/debug/last', listLastTickets);

module.exports = router;