// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If it's an API request, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      redirect: '/login'
    });
  }
  
  // For page requests, redirect to login
  res.redirect('/login');
};

// Middleware to check if user is NOT authenticated (for login/signup pages)
const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  
  // If user is already logged in, redirect to dashboard
  if (req.path.startsWith('/api/')) {
    return res.status(200).json({
      success: true,
      message: 'Already authenticated',
      redirect: '/dashboard'
    });
  }
  
  res.redirect('/dashboard');
};

// Middleware to ensure user owns a resource
const isOwner = (resourceField = 'user') => {
  return (req, res, next) => {
    // This middleware should be used after authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if the resource belongs to the current user
    if (req[resourceField] && req[resourceField].toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
    
    next();
  };
};

// Middleware to attach user info to requests
const attachUser = (req, res, next) => {
  if (req.user) {
    // Make user data available in templates and API responses
    res.locals.user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      accountType: req.user.accountType,
      stats: req.user.stats,
      initials: req.user.initials
    };
  }
  next();
};

// Middleware for admin access (if you add admin functionality later)
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
};

// Middleware to handle authentication errors
const handleAuthError = (err, req, res, next) => {
  console.error('Authentication error:', err);
  
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Authentication error'
    });
  }
  
  if (typeof req.flash === 'function') {
    req.flash('error', 'Authentication failed. Please try again.');
  }
  res.redirect('/login');
};

// Middleware to check session validity
const validateSession = (req, res, next) => {
  if (req.user) {
    // Check if session is still valid (not expired, user still exists, etc.)
    const sessionAge = Date.now() - new Date(req.user.lastLogin).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (sessionAge > maxAge) {
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
      });
      
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          redirect: '/login'
        });
      }
      
      return res.redirect('/login');
    }
  }
  
  next();
};

// Middleware to log authentication events
const logAuthEvent = (event) => {
  return (req, res, next) => {
    const userInfo = req.user ? {
      id: req.user._id,
      email: req.user.email
    } : 'Anonymous';
    
    console.log(`🔐 Auth Event: ${event} - User: ${JSON.stringify(userInfo)} - IP: ${req.ip} - UA: ${req.get('User-Agent')}`);
    next();
  };
};

// Rate limiting for auth-sensitive routes
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.'
    });
  }
});

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  isOwner,
  attachUser,
  isAdmin,
  handleAuthError,
  validateSession,
  logAuthEvent,
  authRateLimit
};