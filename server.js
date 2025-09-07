const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config({ path: __dirname + '/.env' });

// Import configurations
const connectDB = require('./config/database');
require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/user');
const pageRoutes = require('./routes/pages');
const placesRoutes = require('./routes/places');

const app = express();
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 minutes
  max: 1000, // Limit each IP to 100 auth requests per windowMs (increased for dashboard)
  message: 'Too many authentication attempts, please try again later.',
});

// Middleware
app.use(compression());
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ecoloop-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoloop'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user available in all templates/responses
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/user', userRoutes);
app.use('/api/places', placesRoutes);
app.use('/', pageRoutes);

// Test Gemini service health
app.get('/api/test-gemini', async (req, res) => {
  try {
    const geminiService = require('./services/geminiService');
    const health = await geminiService.checkHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Gemini service test error:', error);
    res.status(500).json({
      success: false,
      message: 'Gemini service test failed',
      error: error.message
    });
  }
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum is 1 file per upload.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field. Please use the correct file input.'
    });
  }
  
  // MongoDB errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Email already exists. Please use a different email.'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again.' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/pages/404.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌍 Ecoloop server running on port ${PORT}`);
  console.log(`📱 Access the app at: http://localhost:${PORT}`);
  console.log(`🤖 OpenRouter Gemini AI service is ready for image analysis`);
  console.log(`🔑 Make sure to set OPENROUTER_API_KEY environment variable`);
});

"scripts"; {
  "start"; "nodemon server.js"
}
