# OpenRouter Gemini AI Setup Guide for EcoLoop

## Overview
EcoLoop now uses OpenRouter's Gemini AI for image analysis instead of direct Google Gemini API. This provides better compatibility, multiple model options, and enhanced features.

## Prerequisites
1. OpenRouter account
2. API key from OpenRouter
3. Node.js 16+ installed

## Setup Steps

### 1. Get OpenRouter API Key
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for a free account
3. Navigate to "API Keys" section
4. Click "Create API Key"
5. Copy the generated API key

### 2. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecoloop

# Session Secret
SESSION_SECRET=your-session-secret-here

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenRouter AI API Key (REQUIRED)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Test OpenRouter Service
Start the server and test the OpenRouter service:
```bash
npm start
```

Then visit: `http://localhost:3000/api/test-gemini`

You should see:
```json
{
  "success": true,
  "data": {
    "isHealthy": true,
    "message": "OpenRouter API is accessible",
    "model": "google/gemini-2.0-flash-exp:free"
  }
}
```

## Features

### Image Analysis
- **Model**: Google Gemini 2.0 Flash (via OpenRouter)
- **Capabilities**: 
  - Advanced item identification
  - Material classification
  - Comprehensive sustainability recommendations
  - Carbon footprint estimation
  - Detailed recycling, reuse, and donation guidance

### Analysis Results Include:
1. **Recycling**: Detailed recycling process, materials analysis, preparation steps
2. **Reusing**: Multiple creative reuse ideas with implementation steps
3. **Donating**: Donation guidance, organization suggestions, preparation tips
4. **Environmental Impact**: Carbon footprint and savings calculations
5. **Item Category**: plastic, metal, paper, glass, electronic, textile, organic, other

### API Endpoints
- `POST /api/upload/image` - Upload and analyze image
- `GET /api/upload/:id/result` - Get analysis results
- `GET /api/test-gemini` - Test OpenRouter service health

## Usage

### Upload Page
1. Visit `/upload` page
2. Click "Upload Image" or "Take Photo"
3. Select an image file
4. Click "Analyze & Upload"
5. Wait for OpenRouter Gemini AI analysis
6. View comprehensive sustainability recommendations

### Analysis Process
1. Image uploaded to server
2. OpenRouter Gemini AI analyzes the image
3. Results parsed and structured
4. Detailed recommendations generated
5. User can choose: Recycle, Reuse, or Donate

## Advantages of OpenRouter

### Multiple Model Support
- Access to various AI models including Gemini, Claude, GPT-4
- Easy model switching without code changes
- Cost optimization through model selection

### Enhanced Features
- Better rate limits and reliability
- Advanced prompt engineering
- Comprehensive response parsing
- Better error handling

### Cost Benefits
- Free tier available
- Pay-per-use pricing
- No upfront costs
- Usage monitoring

## Troubleshooting

### Common Issues

#### 1. "OPENROUTER_API_KEY environment variable is required"
- Make sure you've created a `.env` file
- Ensure `OPENROUTER_API_KEY` is set correctly
- Restart the server after adding the key

#### 2. "OpenRouter service test failed"
- Check your internet connection
- Verify the API key is valid
- Ensure you have OpenRouter account access

#### 3. "Analysis failed"
- Check image format (JPEG, PNG, WebP, GIF)
- Ensure image size < 10MB
- Verify OpenRouter API quota hasn't been exceeded

### Error Messages
- `401 Unauthorized`: Invalid API key
- `429 Too Many Requests`: API quota exceeded
- `413 Payload Too Large`: Image file too large
- `400 Bad Request`: Invalid image format

## API Limits
- **Free Tier**: 100 requests per day
- **Paid Tier**: Higher limits available
- **Image Size**: Max 10MB per upload
- **Supported Formats**: JPEG, PNG, WebP, GIF

## Cost Considerations
- OpenRouter has usage-based pricing
- Free tier available for testing
- Monitor usage in OpenRouter dashboard
- Cost-effective compared to direct API access

## Migration from Direct Gemini API
If migrating from direct Google Gemini API:
1. The new OpenRouter service replaces direct Gemini integration
2. All existing functionality preserved
3. Better reliability and features
4. Multiple model options available

## Support
For issues with:
- **OpenRouter API**: Check [OpenRouter Documentation](https://openrouter.ai/docs)
- **EcoLoop Integration**: Check server logs and API responses
- **Environment Setup**: Verify `.env` file configuration

## Model Information
- **Current Model**: `google/gemini-2.0-flash-exp:free`
- **Capabilities**: Image analysis, text generation, sustainability recommendations
- **Response Format**: Structured JSON with detailed analysis
- **Token Limit**: 4000 tokens per request
