const axios = require('axios');
const fs = require('fs');
const path = require('path');

class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'minicpm-v';
    this.timeout = 120000; // 2 minutes timeout
  }

  // Check if Ollama server is running
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return {
        isHealthy: true,
        models: response.data.models || []
      };
    } catch (error) {
      console.error('❌ Ollama health check failed:', error.message);
      return {
        isHealthy: false,
        error: error.message
      };
    }
  }

  // Convert image to base64
  async imageToBase64(imagePath) {
    try {
      const imageBuffer = await fs.promises.readFile(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to read image file: ${error.message}`);
    }
  }

  // Analyze image with AI
  async analyzeImage(imagePath, originalName = '') {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Convert image to base64
      const base64Image = await this.imageToBase64(imagePath);

      // Prepare the prompt for sustainability analysis
      const prompt = `Analyze this image for sustainability purposes. Identify the main item(s) in the image and provide detailed recommendations for:

1. RECYCLING: Can this item be recycled? Where and how?
2. REUSING: Creative ways to reuse this item instead of throwing it away
3. DONATING: Is this item suitable for donation? Where?

Also estimate:
- Carbon footprint if thrown away (in kg CO2)
- Environmental impact
- Item category (plastic, metal, paper, glass, electronic, textile, organic, other)

Please respond in a structured format with clear sections for each recommendation type.

Image filename: ${originalName}`;

      // Make request to Ollama
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1, // Lower temperature for more consistent results
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.response;
      const processingTime = Date.now() - startTime;

      // Parse the AI response
      const analysis = this.parseAIResponse(aiResponse);
      analysis.processingTime = processingTime;
      analysis.confidence = this.calculateConfidence(aiResponse);

      console.log(`🤖 AI Analysis completed in ${processingTime}ms`);
      return analysis;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ AI Analysis failed:', error.message);
      
      return {
        status: 'failed',
        error: error.message,
        processingTime,
        confidence: 0,
        description: 'Failed to analyze image',
        itemCategory: 'other',
        recommendations: this.getDefaultRecommendations(),
        environmental: this.getDefaultEnvironmentalData()
      };
    }
  }

  // Parse AI response into structured data
  parseAIResponse(aiResponse) {
    try {
      const analysis = {
        status: 'completed',
        description: '',
        itemCategory: 'other',
        confidence: 0.8,
        recommendations: {
          recycle: { possible: false, instructions: '', locations: [] },
          reuse: { possible: false, ideas: [] },
          donate: { possible: false, organizations: [] }
        },
        environmental: {
          carbonFootprint: 0,
          carbonSaved: 0,
          wasteReduction: 0,
          energySaved: 0
        }
      };

      // Extract description (first paragraph usually contains item description)
      const lines = aiResponse.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        analysis.description = lines[0].replace(/^\d+\.\s*/, '').trim();
      }

      // Determine item category based on keywords
      analysis.itemCategory = this.extractCategory(aiResponse.toLowerCase());

      // Extract recycling information
      const recyclingInfo = this.extractSection(aiResponse, ['recycl', 'recyl']);
      if (recyclingInfo) {
        analysis.recommendations.recycle = {
          possible: recyclingInfo.includes('yes') || recyclingInfo.includes('can be recycled'),
          instructions: recyclingInfo,
          locations: this.extractLocations(recyclingInfo)
        };
      }

      // Extract reuse information
      const reuseInfo = this.extractSection(aiResponse, ['reus', 'repurpos']);
      if (reuseInfo) {
        analysis.recommendations.reuse = {
          possible: reuseInfo.length > 50, // If substantial content, assume reuse is possible
          ideas: this.extractReuseIdeas(reuseInfo)
        };
      }

      // Extract donation information
      const donationInfo = this.extractSection(aiResponse, ['donat', 'give away', 'charity']);
      if (donationInfo) {
        analysis.recommendations.donate = {
          possible: donationInfo.includes('yes') || donationInfo.includes('suitable') || donationInfo.includes('can be donated'),
          organizations: this.extractDonationOrganizations(donationInfo)
        };
      }

      // Extract environmental data
      analysis.environmental = this.extractEnvironmentalData(aiResponse);

      return analysis;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getDefaultAnalysis();
    }
  }

  // Extract category from AI response
  extractCategory(text) {
    const categories = {
      plastic: ['plastic', 'bottle', 'container', 'bag', 'wrap'],
      metal: ['metal', 'aluminum', 'steel', 'iron', 'can', 'tin'],
      paper: ['paper', 'cardboard', 'book', 'magazine', 'newspaper'],
      glass: ['glass', 'bottle', 'jar', 'window'],
      electronic: ['electronic', 'computer', 'phone', 'battery', 'cable', 'device'],
      textile: ['fabric', 'cloth', 'clothing', 'shirt', 'pants', 'textile'],
      organic: ['food', 'organic', 'fruit', 'vegetable', 'compost']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }

  // Extract specific sections from AI response
  extractSection(text, keywords) {
    const lines = text.split('\n');
    let section = '';
    let capturing = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Start capturing if line contains any of the keywords
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        capturing = true;
        section += line + '\n';
        continue;
      }

      // Stop capturing if we hit another main section
      if (capturing && (lowerLine.includes('1.') || lowerLine.includes('2.') || lowerLine.includes('3.') || 
                       lowerLine.includes('recycl') || lowerLine.includes('reus') || lowerLine.includes('donat'))) {
        if (!keywords.some(keyword => lowerLine.includes(keyword))) {
          break;
        }
      }

      if (capturing) {
        section += line + '\n';
      }
    }

    return section.trim();
  }

  // Extract reuse ideas
  extractReuseIdeas(text) {
    const ideas = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
        const idea = line.replace(/^[•\-\d\.\s]+/, '').trim();
        if (idea.length > 10) {
          ideas.push({
            title: idea.split('.')[0] || idea.substring(0, 50),
            description: idea,
            difficulty: this.assessDifficulty(idea)
          });
        }
      }
    }

    return ideas.slice(0, 5); // Limit to 5 ideas
  }

  // Extract donation organizations
  extractDonationOrganizations(text) {
    const organizations = [];
    const commonOrgs = [
      { name: 'Goodwill', description: 'Accepts clothing, household items, and electronics' },
      { name: 'Salvation Army', description: 'Accepts furniture, clothing, and household goods' },
      { name: 'Local Food Banks', description: 'For non-perishable food items' },
      { name: 'Libraries', description: 'For books and educational materials' },
      { name: 'Animal Shelters', description: 'For towels, blankets, and pet supplies' }
    ];

    // Return relevant organizations based on context
    return commonOrgs.slice(0, 3);
  }

  // Extract environmental data
  extractEnvironmentalData(text) {
    const environmental = {
      carbonFootprint: 0.5, // Default values
      carbonSaved: 0.3,
      wasteReduction: 1.0,
      energySaved: 2.0
    };

    // Try to extract actual numbers from text
    const co2Match = text.match(/(\d+(?:\.\d+)?)\s*kg\s*co2/i);
    if (co2Match) {
      environmental.carbonFootprint = parseFloat(co2Match[1]);
      environmental.carbonSaved = environmental.carbonFootprint * 0.6; // Assume 60% savings
    }

    return environmental;
  }

  // Assess difficulty of reuse ideas
  assessDifficulty(idea) {
    const easyKeywords = ['use as', 'place', 'store', 'hold'];
    const hardKeywords = ['cut', 'modify', 'build', 'construct', 'paint', 'drill'];
    
    const lowerIdea = idea.toLowerCase();
    
    if (hardKeywords.some(keyword => lowerIdea.includes(keyword))) {
      return 'hard';
    } else if (easyKeywords.some(keyword => lowerIdea.includes(keyword))) {
      return 'easy';
    }
    return 'medium';
  }

  // Extract locations (placeholder - in real app, integrate with maps API)
  extractLocations(text) {
    return [
      { name: 'Local Recycling Center', address: 'Check your city\'s website', distance: 5 },
      { name: 'Nearby Collection Point', address: 'Community centers or schools', distance: 2 }
    ];
  }

  // Calculate confidence based on response quality
  calculateConfidence(response) {
    let confidence = 0.5; // Base confidence
    
    if (response.length > 100) confidence += 0.2;
    if (response.includes('recycl')) confidence += 0.1;
    if (response.includes('reus')) confidence += 0.1;
    if (response.includes('donat')) confidence += 0.1;
    if (response.match(/\d+/)) confidence += 0.1; // Contains numbers
    
    return Math.min(confidence, 1.0);
  }

  // Default recommendations for fallback
  getDefaultRecommendations() {
    return {
      recycle: {
        possible: true,
        instructions: 'Check with your local recycling center for specific guidelines.',
        locations: this.extractLocations('')
      },
      reuse: {
        possible: true,
        ideas: [
          {
            title: 'Creative Storage',
            description: 'Use as storage container for small items',
            difficulty: 'easy'
          },
          {
            title: 'DIY Project',
            description: 'Transform into a useful household item',
            difficulty: 'medium'
          }
        ]
      },
      donate: {
        possible: true,
        organizations: this.extractDonationOrganizations('')
      }
    };
  }

  // Default environmental data
  getDefaultEnvironmentalData() {
    return {
      carbonFootprint: 0.5,
      carbonSaved: 0.3,
      wasteReduction: 1.0,
      energySaved: 2.0
    };
  }

  // Default analysis for errors
  getDefaultAnalysis() {
    return {
      status: 'completed',
      description: 'Unable to fully analyze the image, but here are general sustainability recommendations.',
      itemCategory: 'other',
      confidence: 0.3,
      recommendations: this.getDefaultRecommendations(),
      environmental: this.getDefaultEnvironmentalData(),
      processingTime: 0
    };
  }

  // Test the service
  async testService() {
    console.log('🧪 Testing Ollama service...');
    
    const health = await this.checkHealth();
    if (!health.isHealthy) {
      console.error('❌ Ollama service is not healthy');
      return false;
    }

    console.log('✅ Ollama service is healthy');
    console.log(`📋 Available models: ${health.models.map(m => m.name).join(', ')}`);
    
    return true;
  }
}

module.exports = new OllamaService();