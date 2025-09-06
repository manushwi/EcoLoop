const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Bottleneck = require('bottleneck');

class GeminiService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        if (!this.apiKey) {
            throw new Error(
                'OPENROUTER_API_KEY environment variable is required'
            );
        }

        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'google/gemini-2.0-flash-exp:free';
        this.timeout = 120000; // 2 minutes timeout

        this.limiter = new Bottleneck({
    minTime: 150,        // 150ms gap → ~6-7 requests/sec
    maxConcurrent: 3,    // 3 requests at once
    reservoir: 100,      // optional: 100 requests available in total
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 60 * 1000 // refill every 60s
});
    }

    async requestWithRetry(requestFn, retries = 5, delay = 2000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await requestFn();
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.warn(
                        `⚠️ Rate limit hit, retrying in ${delay}ms...`
                    );
                    await new Promise((res) => setTimeout(res, delay));
                    delay *= 2; // exponential backoff
                } else {
                    throw err; // non-429 error, rethrow
                }
            }
        }
        throw new Error('Too many retries, still hitting rate limits.');
    }

    // Check if OpenRouter API is accessible
    async checkHealth() {
        try {
            // Simple test to check if API key is valid
            const response = await axios.post(
                this.baseUrl,
                {
                    model: 'google/gemini-pro:free',
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello, this is a health check.',
                        },
                    ],
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            return {
                isHealthy: true,
                message: 'OpenRouter API is accessible',
                model: this.model,
            };
        } catch (error) {
            console.error('❌ OpenRouter health check failed:', error.message);
            return {
                isHealthy: false,
                error: error.message,
            };
        }
    }

    // Convert image to base64
    async imageToBase64(imagePath) {
        try {
            const imageBuffer = await fs.promises.readFile(imagePath);
            const mimeType = this.getMimeType(imagePath);
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            throw new Error(`Failed to read image file: ${error.message}`);
        }
    }

    // Analyze image with OpenRouter Gemini AI
    async analyzeImage(imagePath, originalName = '') {
        const startTime = Date.now();

        try {
            // Check if file exists
            if (!fs.existsSync(imagePath)) {
                throw new Error('Image file not found');
            }

            // Convert image to base64
            const base64Image = await this.imageToBase64(imagePath);

            // Prepare the comprehensive prompt for sustainability analysis
            const prompt = `Identify the item in this image and provide an EXTREMELY DETAILED and COMPREHENSIVE sustainability analysis. Make your response as large and informative as possible.

IMPORTANT: You must respond with a valid JSON object in the following exact format. Do not include any text before or after the JSON. Make each section as detailed and extensive as possible:

{
  "itemName": "The name of the item in the image",
  "itemCategory": "plastic|metal|paper|glass|electronic|textile|organic|other",
  "description": "Very detailed and specific description of the item with all identifying features. Comprehensive description of the item, its materials, construction, size, condition, and all relevant details",
  "confidence": 0.95,
  "recycle": {
    "possible": true,
    "instructions": "Extremely detailed step-by-step recycling instructions with multiple methods, safety considerations, and comprehensive guidance",
    "preparation": "Comprehensive preparation steps including cleaning, disassembly, sorting, and any special requirements",
    "materials": ["detailed list of all materials and components"],
    "difficulty": "easy|medium|hard",
    "timeRequired": "Detailed time estimate with breakdown",
    "cost": "Cost analysis including any fees or savings",
    "safetyNotes": "Important safety considerations and precautions",
    "commonMistakes": "Common mistakes to avoid when recycling this item",
    "benefits": "Environmental and economic benefits of recycling this item"
  },
  "reuse": {
    "possible": true,
    "ideas": [
      {
        "title": "Creative and Specific Reuse Idea Title",
        "description": "Very detailed description of the reuse idea with specific applications and use cases",
        "difficulty": "easy|medium|hard",
        "timeRequired": "Detailed time estimate for implementation",
        "materialsNeeded": ["comprehensive list of all materials and tools needed"],
        "steps": ["Detailed step 1 with specific instructions", "Detailed step 2 with specific instructions", "Detailed step 3 with specific instructions", "Additional steps as needed"],
        "benefits": "Comprehensive explanation of benefits including environmental, economic, and practical advantages",
        "variations": "Alternative approaches or variations of this idea",
        "skillLevel": "Required skill level and experience",
        "toolsRequired": "Specific tools and equipment needed"
      },
      {
        "title": "Second Creative Reuse Idea",
        "description": "Another detailed reuse idea with different approach",
        "difficulty": "easy|medium|hard",
        "timeRequired": "Time estimate",
        "materialsNeeded": ["materials list"],
        "steps": ["step 1", "step 2", "step 3"],
        "benefits": "Benefits of this approach",
        "variations": "Alternative approaches",
        "skillLevel": "Required skills",
        "toolsRequired": "Tools needed"
      },
      {
        "title": "Third Creative Reuse Idea",
        "description": "Third detailed reuse idea",
        "difficulty": "easy|medium|hard",
        "timeRequired": "Time estimate",
        "materialsNeeded": ["materials list"],
        "steps": ["step 1", "step 2", "step 3"],
        "benefits": "Benefits of this approach",
        "variations": "Alternative approaches",
        "skillLevel": "Required skills",
        "toolsRequired": "Tools needed"
      }
    ],
    "tips": "Comprehensive tips and best practices for reusing this type of item",
    "creativeInspiration": "Additional creative inspiration and ideas",
    "upcyclingPotential": "Assessment of upcycling potential and opportunities"
  },
  "donate": {
    "possible": true,
    "organizations": [
      {
        "name": "Specific Organization Name",
        "description": "Detailed description of what they accept and their mission",
        "website": "Website URL",
        "acceptanceCriteria": "Detailed criteria for item condition and acceptance",
        "preparation": "Specific preparation requirements for this organization",
        "impact": "Social and environmental impact of donating to this organization",
        "specializations": "What makes this organization unique or specialized"
      },
      {
        "name": "Second Organization",
        "description": "Detailed description",
        "website": "Website URL",
        "acceptanceCriteria": "Detailed criteria",
        "preparation": "Preparation requirements",
        "impact": "Impact description",
        "specializations": "Specializations"
      },
      {
        "name": "Third Organization",
        "description": "Detailed description",
        "website": "Website URL",
        "acceptanceCriteria": "Detailed criteria",
        "preparation": "Preparation requirements",
        "impact": "Impact description",
        "specializations": "Specializations"
      }
    ],
    "preparation": "Comprehensive preparation guide for donation including cleaning, documentation, and packaging",
    "taxBenefits": "Detailed tax deduction benefits and documentation requirements",
    "impact": "Comprehensive explanation of environmental and social impact of donating",
    "timing": "Best times to donate and seasonal considerations",
    "documentation": "Required documentation and record-keeping"
  },
  "environmental": {
    "carbonFootprint": 2.5,
    "carbonSaved": 1.8,
    "wasteReduction": 0.5,
    "energySaved": 3.2,
    "waterSaved": 15.0,
    "impactDescription": "Very detailed explanation of environmental impact including specific metrics and long-term effects",
    "decompositionTime": "How long it takes to decompose if not properly disposed",
    "pollutionPotential": "Potential environmental harm if not disposed properly",
    "resourceConservation": "Resources saved through proper disposal",
    "globalImpact": "Global environmental impact and significance"
  },
  "alternatives": [
    {
      "title": "Comprehensive Alternative Disposal Method",
      "description": "Detailed description of the alternative method with specific applications",
      "pros": ["detailed advantage 1", "detailed advantage 2", "detailed advantage 3"],
      "cons": ["detailed disadvantage 1", "detailed disadvantage 2"],
      "requirements": "Specific requirements and considerations",
      "costAnalysis": "Cost comparison and analysis",
      "environmentalImpact": "Environmental impact of this alternative"
    },
    {
      "title": "Second Alternative Method",
      "description": "Detailed description",
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["disadvantage 1", "disadvantage 2"],
      "requirements": "Requirements",
      "costAnalysis": "Cost analysis",
      "environmentalImpact": "Environmental impact"
    }
  ],
  "tips": [
    "Comprehensive tip 1 with detailed explanation",
    "Comprehensive tip 2 with detailed explanation",
    "Comprehensive tip 3 with detailed explanation",
    "Comprehensive tip 4 with detailed explanation",
    "Comprehensive tip 5 with detailed explanation"
  ],
  "warnings": [
    "Important warning 1 with detailed explanation",
    "Important warning 2 with detailed explanation"
  ],
  "funFacts": [
    "Interesting fact 1 about this item or its disposal",
    "Interesting fact 2 about sustainability",
    "Interesting fact 3 about environmental impact"
  ]
}

Make sure to provide extremely detailed, comprehensive, and helpful information in every section. The response should be as large and informative as possible.

Image filename: ${originalName}`;

            // Prepare request data for OpenRouter
            const requestData = {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 8000,
                temperature: 0.1,
            };

            // Make request to OpenRouter
            const response = await this.requestWithRetry(() =>
                this.limiter.schedule(() =>
                    axios.post(this.baseUrl, requestData, {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: this.timeout,
                    })
                )
            );

            const aiResponse =
                response.data.choices?.[0]?.message?.content || '';
            const processingTime = Date.now() - startTime;

            // Parse the AI response
            const analysis = this.parseAIResponse(aiResponse);
            analysis.processingTime = processingTime;
            analysis.confidence = this.calculateConfidence(aiResponse);

            console.log(
                `🤖 OpenRouter Gemini AI Analysis completed in ${processingTime}ms`
            );
            return analysis;
        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(
                '❌ OpenRouter Gemini AI Analysis failed:',
                error.message
            );

            return {
                status: 'failed',
                error: error.message,
                processingTime,
                confidence: 0,
                description: 'Failed to analyze image',
                itemCategory: 'other',
                recommendations: this.getDefaultRecommendations(),
                environmental: this.getDefaultEnvironmentalData(),
            };
        }
    }

    // Get MIME type from file extension
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    // Parse AI response into structured data
    parseAIResponse(aiResponse) {
        try {
            // First, try to parse as JSON
            let jsonData;
            try {
                // Clean the response to extract JSON
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (jsonError) {
                console.warn('Failed to parse JSON response, falling back to text parsing:', jsonError.message);
                return this.parseTextResponse(aiResponse);
            }

            // Convert JSON response to our expected format
            const analysis = {
                status: 'completed',
                itemName: jsonData.itemName || 'Unknown Item',
                description: jsonData.description || '',
                itemCategory: jsonData.itemCategory || 'other',
                confidence: jsonData.confidence || 0.8,
                recommendations: {
                    recycle: {
                        possible: jsonData.recycle?.possible || false,
                        instructions: jsonData.recycle?.instructions || '',
                        preparation: jsonData.recycle?.preparation || '',
                        materials: jsonData.recycle?.materials || [],
                        difficulty: jsonData.recycle?.difficulty || 'medium',
                        timeRequired: jsonData.recycle?.timeRequired || '',
                        cost: jsonData.recycle?.cost || '',
                        safetyNotes: jsonData.recycle?.safetyNotes || '',
                        commonMistakes: jsonData.recycle?.commonMistakes || '',
                        benefits: jsonData.recycle?.benefits || ''
                    },
                    reuse: {
                        possible: jsonData.reuse?.possible || false,
                        ideas: jsonData.reuse?.ideas || [],
                        tips: jsonData.reuse?.tips || '',
                        creativeInspiration: jsonData.reuse?.creativeInspiration || '',
                        upcyclingPotential: jsonData.reuse?.upcyclingPotential || ''
                    },
                    donate: {
                        possible: jsonData.donate?.possible || false,
                        organizations: jsonData.donate?.organizations || [],
                        preparation: jsonData.donate?.preparation || '',
                        taxBenefits: jsonData.donate?.taxBenefits || '',
                        impact: jsonData.donate?.impact || '',
                        timing: jsonData.donate?.timing || '',
                        documentation: jsonData.donate?.documentation || ''
                    }
                },
                environmental: {
                    carbonFootprint: jsonData.environmental?.carbonFootprint || 0,
                    carbonSaved: jsonData.environmental?.carbonSaved || 0,
                    wasteReduction: jsonData.environmental?.wasteReduction || 0,
                    energySaved: jsonData.environmental?.energySaved || 0,
                    waterSaved: jsonData.environmental?.waterSaved || 0,
                    impactDescription: jsonData.environmental?.impactDescription || '',
                    decompositionTime: jsonData.environmental?.decompositionTime || '',
                    pollutionPotential: jsonData.environmental?.pollutionPotential || '',
                    resourceConservation: jsonData.environmental?.resourceConservation || '',
                    globalImpact: jsonData.environmental?.globalImpact || ''
                },
                alternatives: jsonData.alternatives || [],
                tips: jsonData.tips || [],
                warnings: jsonData.warnings || [],
                funFacts: jsonData.funFacts || []
            };

            return analysis;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return this.getDefaultAnalysis();
        }
    }

    // Fallback method for text-based responses
    parseTextResponse(aiResponse) {
        const analysis = {
            status: 'completed',
            itemName: 'Unknown Item',
                description: '',
                itemCategory: 'other',
                confidence: 0.8,
                recommendations: {
                    recycle: {
                        possible: false,
                        instructions: '',
                    preparation: '',
                    materials: [],
                        locations: [],
                    difficulty: 'medium',
                    timeRequired: '',
                    cost: ''
                },
                reuse: { 
                    possible: false, 
                    ideas: [],
                    tips: ''
                },
                donate: { 
                    possible: false, 
                    organizations: [],
                    preparation: '',
                    taxBenefits: '',
                    impact: ''
                }
                },
                environmental: {
                    carbonFootprint: 0,
                    carbonSaved: 0,
                    wasteReduction: 0,
                    energySaved: 0,
                waterSaved: 0,
                impactDescription: ''
                },
            alternatives: [],
            tips: []
            };

            // Extract description (first paragraph usually contains item description)
            const lines = aiResponse.split('\n').filter((line) => line.trim());
            if (lines.length > 0) {
                analysis.description = lines[0].replace(/^\d+\.\s*/, '').trim();
            }

            // Determine item category based on keywords
        analysis.itemCategory = this.extractCategory(aiResponse.toLowerCase());

            // Extract recycling information
        const recyclingInfo = this.extractSection(aiResponse, ['recycl', 'recyl']);
            if (recyclingInfo) {
                analysis.recommendations.recycle = {
                possible: recyclingInfo.includes('yes') || 
                        recyclingInfo.includes('can be recycled') ||
                        recyclingInfo.includes('recyclable'),
                    instructions: recyclingInfo,
                preparation: '',
                materials: [],
                    locations: this.extractLocations(recyclingInfo),
                difficulty: 'medium',
                timeRequired: '',
                cost: ''
                };
            }

            // Extract reuse information
        const reuseInfo = this.extractSection(aiResponse, ['reus', 'repurpos']);
            if (reuseInfo) {
                analysis.recommendations.reuse = {
                possible: reuseInfo.length > 50,
                    ideas: this.extractReuseIdeas(reuseInfo),
                tips: ''
                };
            }

            // Extract donation information
        const donationInfo = this.extractSection(aiResponse, ['donat', 'give away', 'charity']);
            if (donationInfo) {
                analysis.recommendations.donate = {
                possible: donationInfo.includes('yes') || 
                        donationInfo.includes('suitable') ||
                        donationInfo.includes('can be donated'),
                organizations: this.extractDonationOrganizations(donationInfo),
                preparation: '',
                taxBenefits: '',
                impact: ''
                };
            }

            // Extract environmental data
            analysis.environmental = this.extractEnvironmentalData(aiResponse);

            return analysis;
    }

    // Extract category from AI response
    extractCategory(text) {
        const categories = {
            plastic: ['plastic', 'bottle', 'container', 'bag', 'wrap'],
            metal: ['metal', 'aluminum', 'steel', 'iron', 'can', 'tin'],
            paper: ['paper', 'cardboard', 'book', 'magazine', 'newspaper'],
            glass: ['glass', 'bottle', 'jar', 'window'],
            electronic: [
                'electronic',
                'computer',
                'phone',
                'battery',
                'cable',
                'device',
            ],
            textile: [
                'fabric',
                'cloth',
                'clothing',
                'shirt',
                'pants',
                'textile',
            ],
            organic: ['food', 'organic', 'fruit', 'vegetable', 'compost'],
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some((keyword) => text.includes(keyword))) {
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
            if (keywords.some((keyword) => lowerLine.includes(keyword))) {
                capturing = true;
                section += line + '\n';
                continue;
            }

            // Stop capturing if we hit another main section
            if (
                capturing &&
                (lowerLine.includes('1.') ||
                    lowerLine.includes('2.') ||
                    lowerLine.includes('3.') ||
                    lowerLine.includes('recycl') ||
                    lowerLine.includes('reus') ||
                    lowerLine.includes('donat'))
            ) {
                if (!keywords.some((keyword) => lowerLine.includes(keyword))) {
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
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            if (
                line.includes('•') ||
                line.includes('-') ||
                line.match(/^\d+\./)
            ) {
                const idea = line.replace(/^[•\-\d\.\s]+/, '').trim();
                if (idea.length > 10) {
                    ideas.push({
                        title: idea.split('.')[0] || idea.substring(0, 50),
                        description: idea,
                        difficulty: this.assessDifficulty(idea),
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
            {
                name: 'Goodwill',
                description:
                    'Accepts clothing, household items, and electronics',
            },
            {
                name: 'Salvation Army',
                description: 'Accepts furniture, clothing, and household goods',
            },
            {
                name: 'Local Food Banks',
                description: 'For non-perishable food items',
            },
            {
                name: 'Libraries',
                description: 'For books and educational materials',
            },
            {
                name: 'Animal Shelters',
                description: 'For towels, blankets, and pet supplies',
            },
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
            energySaved: 2.0,
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
        const hardKeywords = [
            'cut',
            'modify',
            'build',
            'construct',
            'paint',
            'drill',
        ];

        const lowerIdea = idea.toLowerCase();

        if (hardKeywords.some((keyword) => lowerIdea.includes(keyword))) {
            return 'hard';
        } else if (
            easyKeywords.some((keyword) => lowerIdea.includes(keyword))
        ) {
            return 'easy';
        }
        return 'medium';
    }

    // Extract locations (placeholder - in real app, integrate with maps API)
    extractLocations(text) {
        return [
            {
                name: 'Local Recycling Center',
                address: "Check your city's website",
                distance: 5,
            },
            {
                name: 'Nearby Collection Point',
                address: 'Community centers or schools',
                distance: 2,
            },
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
                preparation: 'Clean and dry the item before recycling',
                materials: ['Check local guidelines'],
                locations: this.extractLocations(''),
                difficulty: 'easy',
                timeRequired: '5-10 minutes',
                cost: 'Usually free'
            },
            reuse: {
                possible: true,
                ideas: [
                    {
                        title: 'Creative Storage',
                        description: 'Use as storage container for small items',
                        difficulty: 'easy',
                        timeRequired: 'Immediate',
                        materialsNeeded: [],
                        steps: ['Clean the item', 'Find a use for it'],
                        benefits: 'Reduces waste and saves money'
                    },
                    {
                        title: 'DIY Project',
                        description: 'Transform into a useful household item',
                        difficulty: 'medium',
                        timeRequired: '1-2 hours',
                        materialsNeeded: ['Basic tools'],
                        steps: ['Plan the project', 'Gather materials', 'Execute the transformation'],
                        benefits: 'Creates something unique and useful'
                    },
                ],
                tips: 'Think creatively about how the item could serve a new purpose'
            },
            donate: {
                possible: true,
                organizations: this.extractDonationOrganizations(''),
                preparation: 'Clean and ensure the item is in good condition',
                taxBenefits: 'May be eligible for tax deduction',
                impact: 'Helps others and reduces waste'
            },
        };
    }

    // Default environmental data
    getDefaultEnvironmentalData() {
        return {
            carbonFootprint: 0.5,
            carbonSaved: 0.3,
            wasteReduction: 1.0,
            energySaved: 2.0,
            waterSaved: 5.0,
            impactDescription: 'Proper disposal helps reduce environmental impact'
        };
    }

    // Default analysis for errors
    getDefaultAnalysis() {
        return {
            status: 'completed',
            itemName: 'Unknown Item',
            description: 'Unable to fully analyze the image, but here are general sustainability recommendations.',
            itemCategory: 'other',
            confidence: 0.3,
            recommendations: this.getDefaultRecommendations(),
            environmental: this.getDefaultEnvironmentalData(),
            alternatives: [],
            tips: ['Check with local recycling centers', 'Consider creative reuse ideas', 'Look for donation opportunities'],
            processingTime: 0,
        };
    }

    // Test the service
    async testService() {
        console.log('🧪 Testing OpenRouter Gemini service...');

        const health = await this.checkHealth();
        if (!health.isHealthy) {
            console.error('❌ OpenRouter Gemini service is not healthy');
            return false;
        }

        console.log('✅ OpenRouter Gemini service is healthy');
        console.log(`📋 Model: ${health.model}`);

        return true;
    }
}

module.exports = new GeminiService();
