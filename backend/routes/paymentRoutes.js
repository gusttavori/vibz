const express = require('express');
const router = express.Router();
const { createCheckoutSession, validateCoupon } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/validate-coupon', validateCoupon);

module.exports = router;