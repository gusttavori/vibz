const express = require('express');
const router = express.Router();
const { createCheckoutSession, validateCoupon, connectStripeAccount } = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/validate-coupon', validateCoupon);
router.post('/connect-account', authMiddleware, connectStripeAccount);

module.exports = router;