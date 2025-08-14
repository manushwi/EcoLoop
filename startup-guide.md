# EcoLoop Authentication Startup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in your project root with the following content:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecoloop

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Google OAuth Configuration (Optional for basic auth)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Server Configuration
PORT=3000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Ollama Configuration (for AI analysis)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=minicpm-v
```

### 3. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows (if using MongoDB Community Server)
# MongoDB should start automatically as a service

# On macOS (if using Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

### 4. Start the Server
```bash
npm run dev
```

### 5. Test the Application
Open your browser and navigate to:
- `http://localhost:3000` - Home page
- `http://localhost:3000/signup` - Registration page
- `http://localhost:3000/login` - Login page

## 🔐 Authentication Features

### Local Authentication
- ✅ User registration with email/password
- ✅ User login with email/password
- ✅ Password validation (8+ chars, uppercase, lowercase, number)
- ✅ Session management
- ✅ Protected routes

### Google OAuth (Optional)
- ✅ Google sign-in integration
- ✅ Automatic account linking
- ✅ Profile picture and name from Google

## 🧪 Testing

### Run Authentication Tests
```bash
node test-auth.js
```

This will test:
- Authentication status endpoint
- User registration
- User login
- Google OAuth redirect

### Manual Testing
1. **Registration**: Go to `/signup` and create a new account
2. **Login**: Go to `/login` and sign in with your credentials
3. **Dashboard**: After successful login, you'll be redirected to `/dashboard`
4. **Logout**: Use the logout functionality in the dashboard

## 🐛 Troubleshooting

### Common Issues

1. **"MongoDB connection failed"**
   - Ensure MongoDB is running
   - Check your `MONGODB_URI` in `.env`

2. **"Google OAuth not configured"**
   - This is normal if you haven't set up Google OAuth
   - Local authentication will still work
   - See `GOOGLE_OAUTH_SETUP.md` for OAuth setup

3. **"Port already in use"**
   - Change the `PORT` in your `.env` file
   - Or stop other services using port 3000

4. **"Validation failed"**
   - Ensure passwords meet requirements (8+ chars, uppercase, lowercase, number)
   - Check that names only contain allowed characters

### Database Issues
- If you get schema validation errors, you may need to clear your MongoDB database
- The application will automatically create the necessary collections

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Use strong, unique session secrets in production
- Enable HTTPS in production
- Regularly update dependencies

## 📱 Next Steps

1. **Test the basic authentication flow**
2. **Set up Google OAuth** (see `GOOGLE_OAUTH_SETUP.md`)
3. **Customize the UI** in the `public/css/` and `public/js/` folders
4. **Add more features** like password reset, email verification, etc.

## 🆘 Need Help?

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check that all dependencies are installed

The authentication system is now fully connected and ready to use! 🎉
