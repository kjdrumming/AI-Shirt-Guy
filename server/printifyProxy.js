// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

// Import security middleware
const { generalLimiter, stripePaymentLimiter, securityHeaders } = require('./middleware/security');

// Import Stripe routes
const stripeRoutes = require('./routes/stripe');

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

// Printify API proxy endpoint
app.use('/api/printify', async (req, res) => {
  try {
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    const printifyUrl = `https://api.printify.com/v1${req.url}`;
    
    const response = await fetch(printifyUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0',
        ...req.headers
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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