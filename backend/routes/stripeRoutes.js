const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createOnboardingLink, checkStripeStatus, createLoginLink } = require('../controllers/stripeController');

router.post('/onboarding', authMiddleware, createOnboardingLink);
router.get('/status', authMiddleware, checkStripeStatus);
router.post('/login-link', authMiddleware, createLoginLink);

module.exports = router;