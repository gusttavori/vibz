const express = require('express');
const router = express.Router();
const { refundTicket, processEventPayout } = require('../controllers/financeController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Cliente solicita o reembolso (Precisa estar logado)
router.post('/refund', authMiddleware, refundTicket);

// Admin do Vibz aciona o repasse do evento (Somente administradores)
router.post('/payout', authMiddleware, adminMiddleware, processEventPayout);

module.exports = router;