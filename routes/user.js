const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');

// Apply authentication and sanitization to all routes
router.use(isAuthenticated);
router.use(sanitizeInput);

/**
 * GET /api/user/dashboard
 * Get user dashboard data
 */
router.get('/dashboard', userController.getDashboardData);

/**
 * GET /api/user/analytics
 * Get detailed analytics
 */
router.get('/analytics', userController.getAnalytics);

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/profile', userController.getProfile);

/**
 * GET /api/user/leaderboard
 * Get leaderboard data
 */
router.get('/leaderboard', userController.getLeaderboard);

/**
 * GET /api/user/export
 * Export user data (GDPR compliance)
 */
router.get('/export', userController.exportUserData);

module.exports = router;
