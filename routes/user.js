const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');

// Apply auth and sanitization
router.use(isAuthenticated);
router.use(sanitizeInput);

/**
 * GET /api/user/me
 * Get current logged-in user profile
 */
router.get('/me', userController.getUserProfile);

/**
 * GET /api/user/history
 * Get history of uploaded photos + AI suggestions
 */
router.get('/history', userController.getUserUploadHistory);

/**
 * GET /api/user/stats
 * Get user stats (category count, carbon footprint, etc.)
 */
router.get('/stats', userController.getUserStats);

/**
 * PUT /api/user/profile
 * Update user's profile info (name, etc.)
 */
router.put('/profile', userController.updateUserProfile);

/**
 * DELETE /api/user/account
 * Delete user account and related uploads
 */
router.delete('/account', userController.deleteUserAccount);

module.exports = router;
