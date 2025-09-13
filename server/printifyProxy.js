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

// Apply security middleware
app.use(securityHeaders);
app.use(generalLimiter);

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your actual domain
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