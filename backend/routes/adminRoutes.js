const express = require('express');
const router = express.Router();
const { 
    loginAdmin, 
    getAdminStats, 
    getEventsList, 
    updateEventStatus, 
    updateHighlightStatus,
    getSystemSettings, 
    updateSystemSettings 
} = require('../controllers/adminController');

router.post('/login', loginAdmin);

router.get('/stats', getAdminStats);
router.get('/events', getEventsList);
router.put('/events/:id', updateEventStatus);
router.put('/highlights/:id', updateHighlightStatus);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

module.exports = router;