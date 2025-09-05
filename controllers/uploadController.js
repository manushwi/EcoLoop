const PhotoUpload = require('../models/PhotoUpload');
const User = require('../models/User');
const geminiService = require('../services/geminiService');
const { getFileInfo, deleteFile } = require('../config/multer');
const path = require('path');
let ollamaService;
try {
    // Optional local fallback; proceed without if not present
    // eslint-disable-next-line global-require, import/no-unresolved
    ollamaService = require('../services/ollamaService');
} catch (_) {
    ollamaService = null;
}

class UploadController {
    // Handle image upload
    async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided',
                });
            }

            const userId = req.user._id;
            const fileInfo = getFileInfo(req.file);

            console.log('File info:', fileInfo);
            // Create photo upload record
            const photoUpload = new PhotoUpload({
                user: userId,
                filename: fileInfo.filename,
                originalName: fileInfo.originalName,
                filePath: fileInfo.filePath,
                fileSize: fileInfo.fileSize,
                mimetype: fileInfo.mimeType,
                aiAnalysis: {
                    status: 'pending',
                },
                metadata: {
                    uploadSource: 'web',
                    deviceType: req.get('User-Agent'),
                    ipAddress: req.ip,
                    location: {
                        type: 'Point',
                        coordinates: [0, 0], // ✅ default valid GeoJSON
                    },
                },
            });

            await photoUpload.save();

            // Start AI analysis asynchronously (don't wait for it)
            this.analyzeImage(
                photoUpload._id,
                path.join(__dirname, '..', 'uploads', fileInfo.filename),
                fileInfo.originalName
            ).catch((error) => {
                console.error('Background AI analysis error:', error);
            });

            res.status(201).json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    uploadId: photoUpload._id,
                    filename: photoUpload.filename,
                    originalName: photoUpload.originalName,
                    fileUrl: photoUpload.fileUrl,
                    analysisStatus: 'pending',
                },
            });
        } catch (error) {
            console.error('Upload error:', error);

            // Delete uploaded file if database save failed
            if (req.file) {
                deleteFile(req.file.path).catch(console.error);
            }

            res.status(500).json({
                success: false,
                message: 'Upload failed. Please try again.',
            });
        }
    }

    // Background AI analysis processing
    // Background AI analysis processing
    async analyzeImage(uploadId, imagePath, originalName) {
        try {
            console.log(`🤖 Starting AI analysis for upload ${uploadId}`);

            // Update status to processing
            await PhotoUpload.findByIdAndUpdate(uploadId, {
                'aiAnalysis.status': 'processing',
            });

            // Perform AI analysis
            let analysisResult;
            try {
                analysisResult = await geminiService.analyzeImage(
                    imagePath,
                    originalName
                );
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.error(
                        '⚠️ Rate limited by OpenRouter Gemini. Retrying in 5s...'
                    );
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    try {
                        analysisResult = await geminiService.analyzeImage(
                            imagePath,
                            originalName
                        );
                    } catch (retryError) {
                        console.error(
                            '❌ Retry also failed:',
                            retryError.message
                        );
                        if (ollamaService && typeof ollamaService.analyzeImage === 'function') {
                            console.warn(
                                '➡️ Falling back to local ollamaService for analysis'
                            );
                            try {
                                analysisResult = await ollamaService.analyzeImage(
                                    imagePath,
                                    originalName
                                );
                            } catch (fallbackError) {
                                console.error(
                                    '❌ Ollama fallback failed:',
                                    fallbackError.message
                                );
                                throw fallbackError;
                            }
                        } else {
                            throw retryError;
                        }
                    }
                } else {
                    console.error('❌ AI Analysis failed:', error.message);
                    // Try fallback when generic failure occurs
                    if (ollamaService && typeof ollamaService.analyzeImage === 'function') {
                        try {
                            console.warn(
                                '➡️ Attempting ollamaService fallback after failure'
                            );
                            analysisResult = await ollamaService.analyzeImage(
                                imagePath,
                                originalName
                            );
                        } catch (fallbackError) {
                            console.error(
                                '❌ Ollama fallback failed:',
                                fallbackError.message
                            );
                            throw error; // propagate original error
                        }
                    } else {
                        throw error;
                    }
                }
            }

            // Update the database with results
            await PhotoUpload.findByIdAndUpdate(uploadId, {
                $set: {
                    'aiAnalysis.status': analysisResult.status,
                    'aiAnalysis.description': analysisResult.description,
                    'aiAnalysis.itemCategory': analysisResult.itemCategory,
                    'aiAnalysis.confidence': analysisResult.confidence,
                    'aiAnalysis.recommendations':
                        analysisResult.recommendations,
                    'aiAnalysis.environmental': analysisResult.environmental,
                    'aiAnalysis.processingTime': analysisResult.processingTime,
                    'aiAnalysis.error': analysisResult.error,
                },
            });

            console.log(
                `✅ AI analysis finished for upload ${uploadId} with status: ${analysisResult.status}`
            );
        } catch (error) {
            console.error(
                `❌ AI analysis failed for upload ${uploadId}:`,
                error
            );

            // Update status to failed
            await PhotoUpload.findByIdAndUpdate(uploadId, {
                $set: {
                    'aiAnalysis.status': 'failed',
                    'aiAnalysis.error': error.message,
                },
            });
        }
    }

    // Get analysis results
    async getAnalysisResult(req, res) {
        try {
            const { uploadId } = req.params;
            const userId = req.user._id;

            const photoUpload = await PhotoUpload.findOne({
                _id: uploadId,
                user: userId,
            });

            if (!photoUpload) {
                return res.status(404).json({
                    success: false,
                    message: 'Upload not found',
                });
            }

            // Increment view count
            await photoUpload.incrementViewCount();

            res.json({
                success: true,
                data: {
                    uploadId: photoUpload._id,
                    filename: photoUpload.filename,
                    originalName: photoUpload.originalName,
                    fileUrl: photoUpload.fileUrl,
                    uploadedAt: photoUpload.createdAt,
                    analysis: photoUpload.aiAnalysis,
                    userAction: photoUpload.userAction,
                    viewCount: photoUpload.viewCount,
                },
            });
        } catch (error) {
            console.error('Get analysis result error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve analysis result',
            });
        }
    }

    // Set user action (recycle/reuse/donate)
    async setUserAction(req, res) {
        try {
            const { uploadId } = req.params;
            const { action, feedback } = req.body;
            const userId = req.user._id;

            const photoUpload = await PhotoUpload.findOne({
                _id: uploadId,
                user: userId,
            });

            if (!photoUpload) {
                return res.status(404).json({
                    success: false,
                    message: 'Upload not found',
                });
            }

            // Validate action
            const validActions = ['recycle', 'reuse', 'donate'];
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid action. Must be recycle, reuse, or donate.',
                });
            }

            // Set user action
            await photoUpload.setUserAction(action, feedback);

            res.json({
                success: true,
                message: `Action "${action}" recorded successfully`,
                data: {
                    action: photoUpload.userAction.chosen,
                    completedAt: photoUpload.userAction.completedAt,
                    carbonSaved:
                        photoUpload.aiAnalysis.environmental?.carbonSaved || 0,
                },
            });
        } catch (error) {
            console.error('Set user action error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record action',
            });
        }
    }

    // Get upload history for user
    async getUploadHistory(req, res) {
        try {
            const userId = req.user._id;
            const { page = 1, limit = 10 } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const uploads = await PhotoUpload.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('-metadata.ipAddress'); // Don't expose IP addresses

            const total = await PhotoUpload.countDocuments({ user: userId });

            res.json({
                success: true,
                data: {
                    uploads,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                        hasNextPage: page * limit < total,
                        hasPrevPage: page > 1,
                    },
                },
            });
        } catch (error) {
            console.error('Get upload history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve upload history',
            });
        }
    }

    // Delete uploaded image
    async deleteUpload(req, res) {
        try {
            const { uploadId } = req.params;
            const userId = req.user._id;

            const photoUpload = await PhotoUpload.findOne({
                _id: uploadId,
                user: userId,
            });

            if (!photoUpload) {
                return res.status(404).json({
                    success: false,
                    message: 'Upload not found',
                });
            }

            // Delete file from filesystem
            const filePath = path.join(
                __dirname,
                '..',
                'uploads',
                photoUpload.filename
            );
            await deleteFile(filePath);

            // Delete record from database
            await PhotoUpload.findByIdAndDelete(uploadId);

            // Update user stats
            const user = await User.findById(userId);
            if (user && user.stats.totalUploads > 0) {
                user.stats.totalUploads -= 1;

                // Adjust other stats based on user action
                if (photoUpload.userAction.chosen) {
                    const action = photoUpload.userAction.chosen;
                    const carbonSaved =
                        photoUpload.aiAnalysis.environmental?.carbonSaved || 0;

                    user.stats.carbonFootprintSaved -= carbonSaved;

                    switch (action) {
                        case 'recycle':
                            user.stats.totalRecycled -= 1;
                            break;
                        case 'reuse':
                            user.stats.totalReused -= 1;
                            break;
                        case 'donate':
                            user.stats.totalDonated -= 1;
                            break;
                    }
                }

                await user.save();
            }

            res.json({
                success: true,
                message: 'Upload deleted successfully',
            });
        } catch (error) {
            console.error('Delete upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete upload',
            });
        }
    }

    // Get specific recommendations for an action
    async getActionRecommendations(req, res) {
        try {
            const { uploadId, action } = req.params;
            const userId = req.user._id;

            const photoUpload = await PhotoUpload.findOne({
                _id: uploadId,
                user: userId,
            });

            if (!photoUpload) {
                return res.status(404).json({
                    success: false,
                    message: 'Upload not found',
                });
            }

            const validActions = ['recycle', 'reuse', 'donate'];
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid action. Must be recycle, reuse, or donate.',
                });
            }

            const recommendations =
                photoUpload.aiAnalysis.recommendations[action];
            const environmental = photoUpload.aiAnalysis.environmental;

            res.json({
                success: true,
                data: {
                    uploadId: photoUpload._id,
                    action,
                    itemCategory: photoUpload.aiAnalysis.itemCategory,
                    description: photoUpload.aiAnalysis.description,
                    recommendations,
                    environmental,
                    tips: this.getActionTips(
                        action,
                        photoUpload.aiAnalysis.itemCategory
                    ),
                },
            });
        } catch (error) {
            console.error('Get action recommendations error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve recommendations',
            });
        }
    }

    // Get tips based on action and item category
    getActionTips(action, category) {
        const tips = {
            recycle: {
                general: [
                    'Clean the item before recycling to avoid contamination',
                    'Check your local recycling guidelines for specific requirements',
                    'Remove any non-recyclable components (labels, caps, etc.)',
                ],
                plastic: [
                    'Look for recycling symbols and numbers on plastic items',
                    'Rinse containers to remove food residue',
                    "Remove caps and lids if they're different materials",
                ],
                paper: [
                    'Keep paper dry and clean for better recycling',
                    'Remove any plastic windows from envelopes',
                    'Staples are okay, but remove large metal bindings',
                ],
                glass: [
                    'Remove lids and caps from glass containers',
                    "Don't mix different types of glass",
                    'Be careful with broken glass - wrap safely',
                ],
            },
            reuse: {
                general: [
                    'Get creative - think outside the box for new uses',
                    "Consider donating if you can't reuse it yourself",
                    'Share ideas with friends and community',
                ],
                plastic: [
                    'Perfect for storage containers and organizers',
                    'Use large containers as planters for gardens',
                    'Cut into useful shapes for DIY projects',
                ],
                textile: [
                    'Turn old clothes into cleaning rags',
                    'Use fabric for craft projects and quilting',
                    'Repurpose as pet bedding or toys',
                ],
            },
            donate: {
                general: [
                    'Ensure items are clean and in good condition',
                    'Check with organizations about their specific needs',
                    'Get a receipt for tax deduction purposes',
                ],
                textile: [
                    'Clothing should be washed and wearable',
                    'Consider seasonal donation drives',
                    'Professional clothes are often needed for job programs',
                ],
                electronic: [
                    'Wipe personal data before donating electronics',
                    'Include chargers and accessories when possible',
                    'Schools and nonprofits often need older computers',
                ],
            },
        };

        return {
            general: tips[action].general,
            specific: tips[action][category] || tips[action].general,
        };
    }

    // Get upload statistics
    async getUploadStats(req, res) {
        try {
            const userId = req.user._id;

            const stats = await PhotoUpload.getAnalytics(userId);
            const categoryStats = await PhotoUpload.getCategoryStats(userId);

            res.json({
                success: true,
                data: {
                    summary: stats,
                    categories: categoryStats,
                    trends: await this.getUploadTrends(userId),
                },
            });
        } catch (error) {
            console.error('Get upload stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve statistics',
            });
        }
    }

    // Get upload trends over time
    async getUploadTrends(userId) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const trends = await PhotoUpload.aggregate([
                {
                    $match: {
                        user: userId,
                        createdAt: { $gte: thirtyDaysAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                        },
                        count: { $sum: 1 },
                        carbonSaved: {
                            $sum: '$aiAnalysis.environmental.carbonSaved',
                        },
                    },
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                },
                {
                    $project: {
                        date: {
                            $dateFromParts: {
                                year: '$_id.year',
                                month: '$_id.month',
                                day: '$_id.day',
                            },
                        },
                        count: 1,
                        carbonSaved: { $round: ['$carbonSaved', 2] },
                    },
                },
            ]);

            return trends;
        } catch (error) {
            console.error('Get upload trends error:', error);
            return [];
        }
    }

    // Check Gemini service health
    async checkServiceHealth(req, res) {
        try {
            const health = await geminiService.checkHealth();

            res.json({
                success: true,
                data: health,
            });
        } catch (error) {
            console.error('Service health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check service health',
                data: { isHealthy: false },
            });
        }
    }
}

module.exports = new UploadController();
