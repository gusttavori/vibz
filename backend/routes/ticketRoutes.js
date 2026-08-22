const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getMyTickets, 
    validateTicket, 
    downloadTicketPDF,
    listLastTickets,
    exportEventTicketsExcel,
    cancelTicket // <-- Importação da nova função adicionada
} = require('../controllers/ticketController');

router.get('/my-tickets', authMiddleware, getMyTickets);
router.get('/:ticketId/download', authMiddleware, downloadTicketPDF);
router.post('/validate', authMiddleware, validateTicket);
router.post('/:ticketId/cancel', authMiddleware, cancelTicket);
router.get('/:eventId/export-excel', authMiddleware, exportEventTicketsExcel);
router.get('/debug/last', listLastTickets);

module.exports = router;