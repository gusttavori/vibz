const express = require('express');
const router = express.Router();
const { 
    createCheckoutSession, 
    validateCoupon, 
    connectStripeAccount,
    createHighlightCheckoutSession // Adicionei a importação caso precise usar a rota de destaque depois
} = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotas de Checkout e Pagamento
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);

// 🛡️ Rota protegida: Exige login para validar o cupom (evita fraudes e garante o limite de 1 por usuário)
router.post('/validate-coupon', authMiddleware, validateCoupon);

// Rota de Onboarding do Organizador na Stripe
router.post('/connect-account', authMiddleware, connectStripeAccount);

// (Opcional) Se você for usar a rota de destaque de eventos, ela também deve ser protegida:
// router.post('/create-highlight-session', authMiddleware, createHighlightCheckoutSession);

module.exports = router;