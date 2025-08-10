const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const { 
  validateSignup, 
  validateLogin, 
  validateProfileUpdate, 
  validatePasswordChange,
  sanitizeInput 
} = require('../middleware/validation');
const { 
  isAuthenticated, 
  isNotAuthenticated, 
  logAuthEvent 
} = require('../middleware/auth');

// Apply sanitization to all routes
router.use(sanitizeInput);

// POST /api/auth/signup - User registration
router.post('/signup', 
  isNotAuthenticated,
  validateSignup,
  logAuthEvent('signup_attempt'),
  authController.register
);

// POST /api/auth/login - User login
router.post('/login', 
  isNotAuthenticated,
  validateLogin,
  logAuthEvent('login_attempt'),
  authController.login
);

// GET /api/auth/google - Google OAuth login
router.get('/google', 
  isNotAuthenticated,
  logAuthEvent('google_auth_attempt'),
  authController.googleAuth
);

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', 
  logAuthEvent('google_callback'),
  authController.googleCallback
);

// POST /api/auth/logout - User logout
router.post('/logout', 
  isAuthenticated,
  logAuthEvent('logout'),
  authController.logout
);

// GET /api/auth/me - Get current user info
router.get('/me', 
  isAuthenticated,
  authController.getCurrentUser
);

// PUT /api/auth/profile - Update user profile
router.put('/profile', 
  isAuthenticated,
  validateProfileUpdate,
  logAuthEvent('profile_update'),
  authController.updateProfile
);

// PUT /api/auth/password - Change password
router.put('/password', 
  isAuthenticated,
  validatePasswordChange,
  logAuthEvent('password_change'),
  authController.changePassword
);

// GET /api/auth/status - Check authentication status
router.get('/status', authController.checkAuth);

// POST /api/auth/forgot-password - Request password reset (future implementation)
router.post('/forgot-password', 
  logAuthEvent('password_reset_request'),
  authController.requestPasswordReset
);

// GET /api/auth/verify-email/:token - Verify email (future implementation)
router.get('/verify-email/:token', 
  logAuthEvent('email_verification'),
  authController.verifyEmail
);

module.exports = router;