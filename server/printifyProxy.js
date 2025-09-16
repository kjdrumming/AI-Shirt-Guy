// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');
const NodeCache = require('node-cache');
const app = express();

// Create cache instance (cache for 10 minutes for catalog data, 1 minute for dynamic data)
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false
});

// Create HTTPS agent with relaxed SSL for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Only for development - disable SSL verification
});

// Import security middleware
const { generalLimiter, stripePaymentLimiter, printifyLimiter, securityHeaders } = require('./middleware/security');

// Import Stripe and Printify multi-order routes
const stripeRoutes = require('./routes/stripe');
const printifyMultiOrderRoutes = require('./routes/printifyMultiOrder');
const adminConfigRoutes = require('./routes/adminConfig');
const printifyCatalogRoutes = require('./routes/printifyCatalog');
const printifyProductsRoutes = require('./routes/printifyProducts');
const printifyUploadsRoutes = require('./routes/printifyUploads');

// Apply security middleware
app.use(securityHeaders);
app.use(generalLimiter);

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ai-shirt-guy-kjdrummings-projects.vercel.app', 'https://ai-shirt-guy.vercel.app'] // Add your Vercel domains
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:8082', 'http://127.0.0.1:8082'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size

// Stripe API routes with rate limiting
app.use('/api/stripe', stripePaymentLimiter, stripeRoutes);

// Admin configuration routes
app.use('/api/admin', generalLimiter, adminConfigRoutes);

// Design generation endpoint for admin (must be before any /api/printify routes)
app.post('/api/generate-designs', generalLimiter, async (req, res) => {
  try {
    const { prompt, imageSource = 'pollinations', count = 3, shape = 'square', aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🎨 Generating designs for admin:', { 
      prompt: prompt.substring(0, 50), 
      imageSource, 
      count, 
      shape, 
      aspectRatio 
    });

    // Convert aspect ratio to dimensions
    let width = 512;
    let height = 512;
    
    switch (aspectRatio) {
      case '16:9':
        width = 512;
        height = 288;
        break;
      case '9:16':
        width = 288;
        height = 512;
        break;
      case '4:3':
        width = 512;
        height = 384;
        break;
      case '1:1':
      default:
        width = 512;
        height = 512;
        break;
    }

    // Add shape context to the prompt
    let enhancedPrompt = prompt;
    if (shape !== 'square') {
      const shapeDescriptions = {
        'circle': 'in a circular composition, round framing',
        'triangle': 'in a triangular composition, geometric triangle framing',
        'oval': 'in an oval composition, oval framing',
        'rectangle': 'in a rectangular composition, landscape framing',
        'diamond': 'in a diamond composition, diamond-shaped framing',
        'hexagon': 'in a hexagonal composition, hexagon framing'
      };
      
      enhancedPrompt = `${prompt}, ${shapeDescriptions[shape] || ''}`;
    }

    const designs = [];
    
    if (imageSource === 'pollinations') {
      // Generate designs using Pollinations.ai with shape and aspect ratio
      for (let i = 0; i < count; i++) {
        const seedValue = Math.floor(Math.random() * 1000000);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seedValue}&enhance=true&nologo=true`;
        designs.push(pollinationsUrl);
        
        // Add small delay to avoid overwhelming the API
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } else if (imageSource === 'stock') {
      // For stock images, we'd need to implement a stock image search
      // For now, return placeholder with correct dimensions
      for (let i = 0; i < count; i++) {
        designs.push(`https://via.placeholder.com/${width}x${height}.png?text=Stock+Design+${i + 1}+${shape}`);
      }
    } else {
      // Hugging Face would require implementation
      for (let i = 0; i < count; i++) {
        designs.push(`https://via.placeholder.com/${width}x${height}.png?text=HF+Design+${i + 1}+${shape}`);
      }
    }

    res.json({
      success: true,
      designs,
      prompt: enhancedPrompt,
      originalPrompt: prompt,
      shape,
      aspectRatio,
      imageSource,
      count: designs.length,
      dimensions: { width, height }
    });

  } catch (error) {
    console.error('❌ Error generating designs:', error);
    res.status(500).json({ 
      error: 'Failed to generate designs',
      details: error.message 
    });
  }
});

// Printify catalog search routes
app.use('/api/catalog', generalLimiter, printifyCatalogRoutes);
console.log('✅ Catalog search available at /api/catalog');

// Printify products routes
app.use('/api/products', generalLimiter, printifyProductsRoutes);
console.log('✅ Products API available at /api/products');

// Printify uploads routes
app.use('/api/printify', generalLimiter, printifyUploadsRoutes);
console.log('✅ Printify uploads API available at /api/printify/uploads');

// Printify multi-order endpoint
app.use('/api/printify/multi-order', printifyLimiter, printifyMultiOrderRoutes);

// Printify API proxy endpoint with rate limiting and caching
app.use('/api/printify', printifyLimiter, async (req, res) => {
  try {
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Remove /api/printify prefix and ensure proper URL construction
    let apiPath = req.url;
    if (apiPath.startsWith('/')) {
      apiPath = apiPath.substring(1);
    }
    
    // Create cache key for GET requests
    const cacheKey = `${req.method}:${apiPath}`;
    
    // For GET requests, check cache first
    if (req.method === 'GET') {
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        console.log('💾 Cache HIT for:', apiPath);
        return res.json(cachedResponse);
      }
      console.log('🔄 Cache MISS for:', apiPath);
    }
    
    const printifyUrl = `https://api.printify.com/v1/${apiPath}`;
    
    console.log('🌐 Making request to:', printifyUrl);
    
    const response = await fetch(printifyUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      agent: httpsAgent // Use custom HTTPS agent
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error:', data);
        return res.status(response.status).json(data);
      }

      // Cache successful GET responses (catalog data doesn't change often)
      if (req.method === 'GET') {
        // Cache catalog data for longer (30 minutes)
        const cacheTime = apiPath.includes('catalog') ? 1800 : 600; // 30 min for catalog, 10 min for others
        cache.set(cacheKey, data, cacheTime);
        console.log(`💾 Cached response for: ${apiPath} (${cacheTime}s)`);
      }

      res.json(data);
    } else {
      // Not JSON response, likely an error page
      const text = await response.text();
      console.error('❌ Non-JSON response:', text.substring(0, 200));
      return res.status(response.status).json({ 
        error: 'Invalid response from Printify API',
        details: text.substring(0, 200)
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache statistics endpoint for monitoring
app.get('/api/cache-stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    ...stats,
    keys: cache.keys().length,
    keyList: cache.keys(),
    message: 'Cache statistics - helps reduce API calls to stay under Printify limits'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security middleware: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'BASIC'}`);
  console.log('✅ Printify proxy available at /api/printify');
  console.log('✅ Stripe API available at /api/stripe');
});

module.exports = app;