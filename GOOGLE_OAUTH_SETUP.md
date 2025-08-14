# Google OAuth Setup Guide

To enable Google authentication in your EcoLoop application, follow these steps:

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Choose "Web application" as the application type
7. Add these authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
8. Copy the Client ID and Client Secret

## 2. Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecoloop

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Google OAuth Configuration
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

## 3. Install Dependencies

Make sure you have the required packages installed:

```bash
npm install passport passport-google-oauth20 passport-local express-session connect-mongo
```

## 4. Test the Setup

1. Start your server: `npm run dev`
2. Navigate to `/signup` or `/login`
3. Click the "Continue with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you'll be redirected back to your dashboard

## 5. Troubleshooting

### Common Issues:

1. **"Google OAuth not configured" warning**: Make sure your `.env` file has the correct Google credentials
2. **Redirect URI mismatch**: Ensure the redirect URI in Google Console matches exactly with your callback URL
3. **CORS errors**: Check that your `CLIENT_URL` environment variable is set correctly
4. **Session errors**: Verify your `SESSION_SECRET` is set and MongoDB is running

### Security Notes:

- Never commit your `.env` file to version control
- Use strong, unique session secrets in production
- Enable HTTPS in production for secure cookie transmission
- Regularly rotate your Google OAuth credentials

## 6. Production Considerations

- Update redirect URIs to use your production domain
- Set `NODE_ENV=production` for enhanced security
- Use a strong, randomly generated `SESSION_SECRET`
- Ensure your MongoDB instance is secure and accessible
- Consider using environment-specific configuration files
