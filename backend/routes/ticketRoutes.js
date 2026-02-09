const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getMyTickets, 
    validateTicket, 
    downloadTicketPDF 
} = require('../controllers/ticketController');

router.get('/my-tickets', authMiddleware, getMyTickets);
router.get('/:ticketId/download', authMiddleware, downloadTicketPDF);
router.post('/validate', authMiddleware, validateTicket);

module.exports = router;