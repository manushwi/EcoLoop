const mongoose = require('mongoose');

const photoUploadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    filename: {
        type: String,
        required: true
    },

    originalName: {
        type: String,
        required: true
    },

    filePath: {
        type: String,
        required: true
    },

    fileSize: {
        type: Number,
        required: true 
    },

    mimetype: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    },

    aiAnalysis: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        description: {
            type: String,
            default: null
        },
        itemCategory: {
            type: String,
            enum: ['plastic', 'metal', 'paper', 'glass', 'electronic', 'textile', 'organic', 'other'],
            default: null
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },
        recommendations: {
            recycle: {
                possible: {
                    type: Boolean,
                    default: false
                },
                instructions: {
                    type: String,
                    default: null
                },
                locations: [{
                    name: String,
                    address: String,
                    distance: Number // in km
                }]
            },
            reuse: {
                possible: {
                    type: Boolean,
                    default: false
                },
                ideas: [{
                    title: String,
                    description: String,
                    difficulty: {
                        type: String,
                        enum: ['easy', 'medium', 'hard']
                    }
                }]
            },
            donate: {
                possible: {
                    type: Boolean,
                    default: false
                },
                organizations: [{
                    name: String,
                    description: String,
                    contact: String,
                    website: String
                }]
            }
        },
        environmental: {
            carbonFootprint: {
                type: Number,
                default: 0 // kg CO2 if thrown away
            },
            carbonSaved: {
                type: Number,
                default: 0 // kg CO2 saved if recycled/reused/donated
            },
            wasteReduction: {
                type: Number,
                default: 0 // kg of waste reduced
            },
            energySaved: {
                type: Number,
                default: 0 // kWh saved
            }
        },
        processingTime: {
            type: Number,
            default: null // milliseconds
        },
        error: {
            type: String,
            default: null
        }
    },

    userAction: {
        chosen: {
            type: String,
            enum: ['recycle', 'reuse', 'donate', null],
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        feedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
                default: null
            },
            comment: {
                type: String,
                default: null
            }
        }
    },

    viewCount: {
        type: Number,
        default: 0
    },
    sharedCount: {
        type: Number,
        default: 0
    },
  // Metadata
    metadata: {
        uploadSource: {
            type: String,
            enum: ['web', 'mobile', 'api'],
            default: 'web'
        },
        deviceType: {
            type: String,
            default: null
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: null
            }
        },
        ipAddress: {
            type: String,
            default: null
        }
    },
    
},
{
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

photoUploadSchema.index({ user: 1, createdAt: -1 });
photoUploadSchema.index({ 'aiAnalysis.status': 1 });
photoUploadSchema.index({ 'aiAnalysis.itemCategory': 1 });
photoUploadSchema.index({ 'userAction.chosen': 1 });
photoUploadSchema.index({ createdAt: -1 });

photoUploadSchema.index({ 'metadata.location': '2dsphere' });

photoUploadSchema.virtual('fileUrl').get(function() {
    return `/uploads/${this.filename}`;
});

photoUploadSchema.virtual('processingDuration').get(function() {
    if (this.aiAnalysis.processingTime) {
        return `${(this.aiAnalysis.processingTime / 1000).toFixed(2)}s`;
    }
    return null;
});

photoUploadSchema.virtual('carbonImpact').get(function() {
    if (this.aiAnalysis.environmental) {
        const saved = this.aiAnalysis.environmental.carbonSaved;
        const footprint = this.aiAnalysis.environmental.carbonFootprint;
        return {
            saved,
            footprint,
            reduction: saved > 0 ? ((saved / footprint) * 100).toFixed(1) : 0
        };
    }
    return null;
});

photoUploadSchema.methods.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
};

photoUploadSchema.methods.setUserAction = async function(action, feedback = null) {
    this.userAction.chosen = action;
    this.userAction.completedAt = new Date();
    if (feedback) {
        this.userAction.feedback = feedback;
    }
    
    // Update user stats
    const User = require('./User');
    const user = await User.findById(this.user);
    if (user) {
        await user.updateStats(action, this.aiAnalysis.environmental?.carbonSaved || 0);
    }
    
    return this.save();
};

photoUploadSchema.statics.getAnalytics = async function(userId, startDate, endDate) {
    const match = { user: userId };
    if (startDate && endDate) {
        match.createdAt = { $gte: startDate, $lte: endDate };
    }
    
    const analytics = await this.aggregate([
        { $match: match },
        {
        $group: {
            _id: null,
            totalUploads: { $sum: 1 },
            totalRecycled: { 
                $sum: { $cond: [{ $eq: ['$userAction.chosen', 'recycle'] }, 1, 0] }
            },
            totalReused: { 
                $sum: { $cond: [{ $eq: ['$userAction.chosen', 'reuse'] }, 1, 0] }
            },
            totalDonated: { 
                $sum: { $cond: [{ $eq: ['$userAction.chosen', 'donate'] }, 1, 0] }
            },
            totalCarbonSaved: { 
                $sum: '$aiAnalysis.environmental.carbonSaved'
            },
            totalWasteReduced: { 
                $sum: '$aiAnalysis.environmental.wasteReduction'
            },
            averageProcessingTime: { 
                $avg: '$aiAnalysis.processingTime'
            },
            categoryBreakdown: {
                $push: '$aiAnalysis.itemCategory'
            }
        }
        }
    ]);
    
    return analytics[0] || {
        totalUploads: 0,
        totalRecycled: 0,
        totalReused: 0,
        totalDonated: 0,
        totalCarbonSaved: 0,
        totalWasteReduced: 0,
        averageProcessingTime: 0,
        categoryBreakdown: []
    };
};

photoUploadSchema.statics.getCategoryStats = async function(userId) {
    return await this.aggregate([
        { $match: { user: userId, 'aiAnalysis.itemCategory': { $ne: null } } },
        {
            $group: {
                _id: '$aiAnalysis.itemCategory',
                count: { $sum: 1 },
                avgCarbonSaved: { $avg: '$aiAnalysis.environmental.carbonSaved' },
                actions: {
                    $push: '$userAction.chosen'
                }
            }
        },

        {
            $project: {
                category: '$_id',
                count: 1,
                avgCarbonSaved: { $round: ['$avgCarbonSaved', 2] },
                recycled: {
                    $size: {
                        $filter: {
                            input: '$actions',
                            cond: { $eq: ['$this', 'recycle'] }
                        }
                    }
                },
                reused: {
                    $size: {
                        $filter: {
                            input: '$actions',
                            cond: { $eq: ['$this', 'reuse'] }
                        }
                    }
                },
                donated: {
                    $size: {
                        $filter: {
                            input: '$actions',
                            cond: { $eq: ['$this', 'donate'] }
                        }
                    }
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

photoUploadSchema.pre('save', function(next) {
    if (this.isNew && this.filename && !this.filePath) {
        this.filePath = `/uploads/${this.filename}`;
    }
    next();
});

photoUploadSchema.post('save', async function(doc) {
    if (doc.isNew) {
        const User = require('./User');
        await User.findByIdAndUpdate(doc.user, {
            $inc: { 'stats.totalUploads': 1 }
        });
    }
});

module.exports = mongoose.model('PhotoUpload', photoUploadSchema);