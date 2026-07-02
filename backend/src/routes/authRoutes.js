const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { registerValidator, loginValidator, forgotPasswordValidator } = require('../utils/validators');

const router = express.Router();

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, authController.forgotPassword);

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, upload.single('avatar'), authController.updateProfile);

module.exports = router;
