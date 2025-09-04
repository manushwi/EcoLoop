const express = require('express');
const router = express.Router();

// Import controllers and middleware
const uploadController = require('../controllers/uploadController');
const { upload, handleMulterError } = require('../config/multer');
const { isAuthenticated } = require('../middleware/auth');
const {
    validateAction,
    validateFeedback,
    validateObjectId,
    sanitizeInput,
} = require('../middleware/validation');

// Apply authentication and input sanitization to all upload routes
router.use(isAuthenticated);
router.use(sanitizeInput);

/**
 * POST /api/upload/image
 * Upload image for analysis
 */
router.post(
    '/image',
    upload.single('image'),
    handleMulterError,
    uploadController.uploadImage.bind(uploadController)
);

/**
 * GET /api/upload/:uploadId/result
 * Get AI analysis result for an uploaded image
 */
router.get(
    '/:uploadId/result',
    validateObjectId('uploadId'),
    uploadController.getAnalysisResult.bind(uploadController)
);

/**
 * POST /api/upload/:uploadId/action
 * Set user action: recycle / reuse / donate
 */
router.post(
    '/:uploadId/action',
    validateObjectId('uploadId'),
    validateAction,
    uploadController.setUserAction.bind(uploadController)
);

/**
 * GET /api/upload/:uploadId/:action/recommendations
 * Get specific action recommendations (Recycle, Reuse, Donate)
 */
router.get(
    '/:uploadId/:action/recommendations',
    validateObjectId('uploadId'),
    (req, res, next) => {
        const validActions = ['recycle', 'reuse', 'donate'];
        if (!validActions.includes(req.params.action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be recycle, reuse, or donate.',
            });
        }
        next();
    },
    uploadController.getActionRecommendations.bind(uploadController)
);

/**
 * GET /api/upload/history
 * Get user's upload history and analysis
 */
router.get(
    '/history',
    uploadController.getUploadHistory.bind(uploadController)
);

/**
 * GET /api/upload/stats
 * Get statistics (for dashboard)
 */
router.get('/stats', uploadController.getUploadStats.bind(uploadController));

/**
 * DELETE /api/upload/:uploadId
 * Delete an uploaded photo
 */
router.delete(
    '/:uploadId',
    validateObjectId('uploadId'),
    uploadController.deleteUpload
);

/**
 * POST /api/upload/:uploadId/feedback
 * Submit optional feedback about the AI result
 */
router.post(
    '/:uploadId/feedback',
    validateObjectId('uploadId'),
    validateFeedback,
    (req, res) => {
        // Placeholder: In a full implementation, save feedback to DB
        res.json({
            success: true,
            message: 'Thank you for your feedback!',
        });
    }
);

/**
 * GET /api/upload/health
 * Check if AI (ollama) service is alive
 */
router.get('/health', uploadController.checkServiceHealth);

/**
 * General error handler for upload routes
 */
router.use((err, req, res, next) => {
    console.error('Upload route error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 10MB.',
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unknown error occurred in upload route.',
    });
});

module.exports = router;
