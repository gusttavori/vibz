const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    getAdminStats,
    getEventsList,
    updateEventStatus,
    updateHighlightStatus,
    getSystemSettings,
    updateSystemSettings,
    getAllEventsAdmin,
    deleteEventAdmin,
    listCoupons,
    createCoupon,
    deleteCoupon
} = require('../controllers/adminController');

router.post('/login', loginAdmin);

router.get('/stats', getAdminStats);
router.get('/events', getEventsList);
router.put('/events/:id', updateEventStatus);
router.put('/highlights/:id', updateHighlightStatus);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// --- NOVAS ROTAS DE GERENCIAMENTO DE EVENTOS ---
router.get('/all-events', getAllEventsAdmin);
router.delete('/events/:id', deleteEventAdmin);

router.get('/coupons', listCoupons);
router.post('/coupons', createCoupon);
router.delete('/coupons/:id', deleteCoupon);

module.exports = router;