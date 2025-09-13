// Security middleware for production
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Stripe payment rate limit (more restrictive)
const stripePaymentLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 payment attempts per windowMs
  'Too many payment attempts, please try again later.'
);

// Image generation rate limit
const imageLimiter = createRateLimit(
  60 * 1000, // 1 minute
  5, // limit each IP to 5 image generations per minute
  'Too many image generation requests, please try again later.'
);

module.exports = {
  generalLimiter,
  stripePaymentLimiter,
  
  // Security headers
  securityHeaders: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://api.printify.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
      },
    },
  }),
  
  // Rate limiters
  generalLimiter,
  stripePaymentLimiter,
  imageLimiter,
  
  // Input validation middleware
  validateInput: (req, res, next) => {
    // Sanitize and validate inputs
    if (req.body.prompt) {
      req.body.prompt = req.body.prompt.trim().slice(0, 500); // Limit prompt length
    }
    
    if (req.body.amount) {
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount < 0 || amount > 10000) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
    }
    
    next();
  },
  
  // Environment validation
  validateEnvironment: () => {
    const required = ['STRIPE_SECRET_KEY', 'PRINTIFY_API_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing);
      process.exit(1);
    }
  }
};