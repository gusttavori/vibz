const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');

const { 
    registerUser, 
    loginUser, 
    googleLogin, 
    forgotPassword, 
    resetPassword,
    validateResetCode,
    getMe 
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/validate-code', validateResetCode);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;