const User = require('../models/User');
const PhotoUpload = require('../models/PhotoUpload');

class UserController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.getDashboardData = this.getDashboardData.bind(this);
    this.getAnalytics = this.getAnalytics.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.exportUserData = this.exportUserData.bind(this);
  }
  
  // Get user dashboard data
  async getDashboardData(req, res) {
    try {
      const userId = req.user._id;

      // Get user with current stats
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get recent uploads
      const recentUploads = await PhotoUpload.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('filename originalName aiAnalysis.itemCategory aiAnalysis.status userAction.chosen createdAt fileUrl');

      // Get analytics data
      const analytics = await PhotoUpload.getAnalytics(userId);
      const categoryStats = await PhotoUpload.getCategoryStats(userId);

      // Get upload trends (last 30 days)
      const trends = await this.getRecentTrends(userId);

      // Calculate achievements
      const achievements = this.calculateAchievements(user.stats, analytics);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            joinedAt: user.createdAt,
            lastLogin: user.lastLogin
          },
          stats: {
            ...user.stats,
            ...analytics
          },
          recentUploads,
          categories: categoryStats,
          trends,
          achievements,
          goals: this.getGoals(user.stats)
        }
      });

    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard data'
      });
    }
  }

  // Get detailed analytics
  async getAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const { period = '30days', category } = req.query;

      let startDate = new Date();
      switch (period) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Build match query
      const matchQuery = {
        user: userId,
        createdAt: { $gte: startDate }
      };

      if (category && category !== 'all') {
        matchQuery['aiAnalysis.itemCategory'] = category;
      }

      // Get time-based analytics
      const timeAnalytics = await PhotoUpload.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              ...(period === '7days' || period === '30days' ? 
                { day: { $dayOfMonth: '$createdAt' } } : {})
            },
            uploads: { $sum: 1 },
            recycled: {
              $sum: { $cond: [{ $eq: ['$userAction.chosen', 'recycle'] }, 1, 0] }
            },
            reused: {
              $sum: { $cond: [{ $eq: ['$userAction.chosen', 'reuse'] }, 1, 0] }
            },
            donated: {
              $sum: { $cond: [{ $eq: ['$userAction.chosen', 'donate'] }, 1, 0] }
            },
            carbonSaved: { $sum: '$aiAnalysis.environmental.carbonSaved' },
            wasteReduced: { $sum: '$aiAnalysis.environmental.wasteReduction' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Get category breakdown
      const categoryBreakdown = await PhotoUpload.getCategoryStats(userId);

      // Get action distribution
      const actionDistribution = await PhotoUpload.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$userAction.chosen',
            count: { $sum: 1 },
            carbonSaved: { $sum: '$aiAnalysis.environmental.carbonSaved' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          timeAnalytics,
          categoryBreakdown,
          actionDistribution: actionDistribution.filter(item => item._id !== null),
          summary: await PhotoUpload.getAnalytics(userId, startDate, new Date())
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics'
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user._id;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get additional profile stats
      const totalUploads = await PhotoUpload.countDocuments({ user: userId });
      const completedActions = await PhotoUpload.countDocuments({ 
        user: userId, 
        'userAction.chosen': { $ne: null } 
      });

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          accountType: user.accountType,
          preferences: user.preferences,
          stats: user.stats,
          joinedAt: user.createdAt,
          lastLogin: user.lastLogin,
          activityStats: {
            totalUploads,
            completedActions,
            completionRate: totalUploads > 0 ? Math.round((completedActions / totalUploads) * 100) : 0
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  }

  // Get leaderboard data
  async getLeaderboard(req, res) {
    try {
      const { metric = 'carbonSaved', period = '30days' } = req.query;
      
      let startDate = new Date();
      switch (period) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'alltime':
          startDate = new Date('2020-01-01');
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get top performers based on metric
      let sortField = 'stats.carbonFootprintSaved';
      switch (metric) {
        case 'uploads':
          sortField = 'stats.totalUploads';
          break;
        case 'recycled':
          sortField = 'stats.totalRecycled';
          break;
        case 'reused':
          sortField = 'stats.totalReused';
          break;
        case 'donated':
          sortField = 'stats.totalDonated';
          break;
        default:
          sortField = 'stats.carbonFootprintSaved';
      }

      const leaderboard = await User.aggregate([
        {
          $lookup: {
            from: 'photouploads',
            localField: '_id',
            foreignField: 'user',
            pipeline: [
              { $match: { createdAt: { $gte: startDate } } }
            ],
            as: 'recentUploads'
          }
        },
        {
          $addFields: {
            recentStats: {
              uploads: { $size: '$recentUploads' },
              carbonSaved: { $sum: '$recentUploads.aiAnalysis.environmental.carbonSaved' }
            }
          }
        },
        {
          $project: {
            name: 1,
            avatar: 1,
            stats: 1,
            recentStats: 1,
            initials: 1
          }
        },
        { $sort: { [sortField]: -1 } },
        { $limit: 10 }
      ]);

      // Get current user's rank
      const userRank = await User.countDocuments({
        [sortField]: { $gt: req.user.stats[sortField.split('.')[1]] }
      }) + 1;

      res.json({
        success: true,
        data: {
          leaderboard,
          userRank,
          metric,
          period
        }
      });

    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leaderboard'
      });
    }
  }

  // Get recent trends for dashboard
  async getRecentTrends(userId) {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const trends = await PhotoUpload.aggregate([
        {
          $match: {
            user: userId,
            createdAt: { $gte: fourteenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            uploads: { $sum: 1 },
            carbonSaved: { $sum: '$aiAnalysis.environmental.carbonSaved' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            uploads: 1,
            carbonSaved: { $round: ['$carbonSaved', 2] }
          }
        }
      ]);

      return trends;
    } catch (error) {
      console.error('Get recent trends error:', error);
      return [];
    }
  }

  // Calculate user achievements
  calculateAchievements(userStats, analytics) {
    const achievements = [];

    // Upload milestones
    if (userStats.totalUploads >= 1) {
      achievements.push({
        id: 'first_upload',
        title: 'Getting Started',
        description: 'Uploaded your first item for analysis',
        icon: '🌱',
        unlocked: true,
        unlockedAt: userStats.createdAt
      });
    }

    if (userStats.totalUploads >= 10) {
      achievements.push({
        id: 'ten_uploads',
        title: 'Active User',
        description: 'Uploaded 10 items for sustainability analysis',
        icon: '📸',
        unlocked: true
      });
    }

    if (userStats.totalUploads >= 50) {
      achievements.push({
        id: 'fifty_uploads',
        title: 'Sustainability Champion',
        description: 'Uploaded 50 items - making a real difference!',
        icon: '🏆',
        unlocked: true
      });
    }

    // Carbon savings
    if (userStats.carbonFootprintSaved >= 1) {
      achievements.push({
        id: 'carbon_saver',
        title: 'Carbon Saver',
        description: 'Saved 1kg of CO2 through sustainable actions',
        icon: '🌍',
        unlocked: true
      });
    }

    if (userStats.carbonFootprintSaved >= 10) {
      achievements.push({
        id: 'carbon_hero',
        title: 'Carbon Hero',
        description: 'Saved 10kg of CO2 - equivalent to planting a tree!',
        icon: '🌳',
        unlocked: true
      });
    }

    // Action diversity
    if (userStats.totalRecycled > 0 && userStats.totalReused > 0 && userStats.totalDonated > 0) {
      achievements.push({
        id: 'triple_threat',
        title: 'Triple Threat',
        description: 'Tried all three actions: recycle, reuse, and donate',
        icon: '♻️',
        unlocked: true
      });
    }

    return achievements;
  }

  // Get sustainability goals
  getGoals(userStats) {
    return [
      {
        id: 'monthly_uploads',
        title: 'Monthly Goal',
        description: 'Upload 20 items this month',
        progress: Math.min(userStats.totalUploads % 20, 20),
        target: 20,
        icon: '🎯'
      },
      {
        id: 'carbon_target',
        title: 'Carbon Impact',
        description: 'Save 5kg CO2 through sustainable actions',
        progress: Math.min(userStats.carbonFootprintSaved, 5),
        target: 5,
        icon: '🌱'
      },
      {
        id: 'action_diversity',
        title: 'Try Everything',
        description: 'Use each action type at least 3 times',
        progress: Math.min(userStats.totalRecycled, 3) + Math.min(userStats.totalReused, 3) + Math.min(userStats.totalDonated, 3),
        target: 9,
        icon: '🔄'
      }
    ];
  }

  // Export user data (GDPR compliance)
  async exportUserData(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId).select('-password');
      const uploads = await PhotoUpload.find({ user: userId });

      const exportData = {
        user: user.toObject(),
        uploads: uploads.map(upload => upload.toObject()),
        exportedAt: new Date(),
        exportVersion: '1.0'
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=ecoloop-data-export.json');
      res.json(exportData);

    } catch (error) {
      console.error('Export user data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export user data'
      });
    }
  }
}

module.exports = new UserController();