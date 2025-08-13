const User = require('../models/User');
const passport = require('passport');

class AuthController {
  // User registration
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }

      // Create new user
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        accountType: 'local',
        isVerified: true // Set to false if you implement email verification
      });

      await newUser.save();

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('Login after registration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Account created but login failed. Please try logging in manually.'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Account created successfully',
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            accountType: newUser.accountType
          },
          redirect: '/dashboard'
        });
      });

    } catch (error) {
      console.error('Registration error:', error);

      // Handle specific MongoDB errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  }

  // User login
  async login(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed. Please try again.'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Invalid email or password'
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
          });
        }

        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            accountType: user.accountType,
            avatar: user.avatar,
            stats: user.stats
          },
          redirect: '/dashboard'
        });
      });
    })(req, res, next);
  }

  // Google OAuth login
  googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  }

  // Google OAuth callback
  googleCallback(req, res, next) {
    passport.authenticate('google', {
      failureRedirect: '/login?error=google_auth_failed'
    }, (err, user, info) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect('/login?error=auth_error');
      }

      if (!user) {
        return res.redirect('/login?error=google_auth_failed');
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Google OAuth login error:', err);
          return res.redirect('/login?error=login_failed');
        }

        // Redirect to dashboard on success
        res.redirect('/dashboard');
      });
    })(req, res, next);
  }

  // User logout
  logout(req, res) {
    const userName = req.user?.name;
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({
            success: false,
            message: 'Logout failed'
          });
        }

        res.clearCookie('connect.sid'); // Clear session cookie
        
        console.log(`👋 User logged out: ${userName}`);
        
        // Return JSON for API calls, redirect for page requests
        if (req.path.startsWith('/api/')) {
          res.json({
            success: true,
            message: 'Logged out successfully',
            redirect: '/'
          });
        } else {
          res.redirect('/');
        }
      });
    });
  }

  // Get current user info
  getCurrentUser(req, res) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        accountType: req.user.accountType,
        avatar: req.user.avatar,
        stats: req.user.stats,
        preferences: req.user.preferences,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const { name, preferences } = req.body;

      const updateData = {};
      if (name && name.trim()) {
        updateData.name = name.trim();
      }
      if (preferences) {
        updateData.preferences = {
          ...req.user.preferences,
          ...preferences
        };
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          accountType: updatedUser.accountType,
          avatar: updatedUser.avatar,
          preferences: updatedUser.preferences
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Profile update failed'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id;

      // Check if user has a password (might be Google OAuth user)
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change password for Google OAuth accounts'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password (will be hashed by pre-save middleware)
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        message: 'Password change failed'
      });
    }
  }

  // Check authentication status
  checkAuth(req, res) {
    res.json({
      authenticated: !!req.user,
      user: req.user ? {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        accountType: req.user.accountType
      } : null
    });
  }

  // Request password reset (placeholder for future implementation)
  async requestPasswordReset(req, res) {
    // TODO: Implement password reset functionality
    res.status(501).json({
      success: false,
      message: 'Password reset functionality not yet implemented'
    });
  }

  // Verify email (placeholder for future implementation)
  async verifyEmail(req, res) {
    // TODO: Implement email verification
    res.status(501).json({
      success: false,
      message: 'Email verification functionality not yet implemented'
    });
  }
}

module.exports = new AuthController();