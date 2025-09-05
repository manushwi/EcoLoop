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
            const prompt = `Identify the item in this image and give me a comprehensive, full-page explanation about how it can be managed in sustainable ways. 

Your response must include three separate sections:  

1. *Recycle* – Explain in detail how the item can be recycled, including the materials it is made of, preparation steps before recycling, and the recycling process step-by-step. Mention if specialized recycling centers are needed.  

2. *Reuse* – Provide multiple creative and practical ways the item can be reused at home, school, or workplace. Explain each idea in full detail with steps on how to implement them.  

3. *Donate* – Suggest how and where the item can be donated, what organizations might accept it, and why donation is valuable. Provide practical guidance for preparing the item before donating.  

Also estimate:
- Carbon footprint if thrown away (in kg CO2)
- Environmental impact
- Item category (plastic, metal, paper, glass, electronic, textile, organic, other)

Make sure the final response is long, thorough, and at least one full page of explanation, with detailed steps, clear formatting, and easy-to-follow instructions.

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
                max_tokens: 4000,
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
            const analysis = {
                status: 'completed',
                description: '',
                itemCategory: 'other',
                confidence: 0.8,
                recommendations: {
                    recycle: {
                        possible: false,
                        instructions: '',
                        locations: [],
                    },
                    reuse: { possible: false, ideas: [] },
                    donate: { possible: false, organizations: [] },
                },
                environmental: {
                    carbonFootprint: 0,
                    carbonSaved: 0,
                    wasteReduction: 0,
                    energySaved: 0,
                },
            };

            // Extract description (first paragraph usually contains item description)
            const lines = aiResponse.split('\n').filter((line) => line.trim());
            if (lines.length > 0) {
                analysis.description = lines[0].replace(/^\d+\.\s*/, '').trim();
            }

            // Determine item category based on keywords
            analysis.itemCategory = this.extractCategory(
                aiResponse.toLowerCase()
            );

            // Extract recycling information
            const recyclingInfo = this.extractSection(aiResponse, [
                'recycl',
                'recyl',
            ]);
            if (recyclingInfo) {
                analysis.recommendations.recycle = {
                    possible:
                        recyclingInfo.includes('yes') ||
                        recyclingInfo.includes('can be recycled') ||
                        recyclingInfo.includes('recyclable'),
                    instructions: recyclingInfo,
                    locations: this.extractLocations(recyclingInfo),
                };
            }

            // Extract reuse information
            const reuseInfo = this.extractSection(aiResponse, [
                'reus',
                'repurpos',
            ]);
            if (reuseInfo) {
                analysis.recommendations.reuse = {
                    possible: reuseInfo.length > 50, // If substantial content, assume reuse is possible
                    ideas: this.extractReuseIdeas(reuseInfo),
                };
            }

            // Extract donation information
            const donationInfo = this.extractSection(aiResponse, [
                'donat',
                'give away',
                'charity',
            ]);
            if (donationInfo) {
                analysis.recommendations.donate = {
                    possible:
                        donationInfo.includes('yes') ||
                        donationInfo.includes('suitable') ||
                        donationInfo.includes('can be donated'),
                    organizations:
                        this.extractDonationOrganizations(donationInfo),
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
                instructions:
                    'Check with your local recycling center for specific guidelines.',
                locations: this.extractLocations(''),
            },
            reuse: {
                possible: true,
                ideas: [
                    {
                        title: 'Creative Storage',
                        description: 'Use as storage container for small items',
                        difficulty: 'easy',
                    },
                    {
                        title: 'DIY Project',
                        description: 'Transform into a useful household item',
                        difficulty: 'medium',
                    },
                ],
            },
            donate: {
                possible: true,
                organizations: this.extractDonationOrganizations(''),
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
        };
    }

    // Default analysis for errors
    getDefaultAnalysis() {
        return {
            status: 'completed',
            description:
                'Unable to fully analyze the image, but here are general sustainability recommendations.',
            itemCategory: 'other',
            confidence: 0.3,
            recommendations: this.getDefaultRecommendations(),
            environmental: this.getDefaultEnvironmentalData(),
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
