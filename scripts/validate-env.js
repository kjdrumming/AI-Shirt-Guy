#!/usr/bin/env node

// Environment validation script
// Run with: node scripts/validate-env.js

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

console.log('🔍 Validating production readiness...\n');

// Check if required files exist
const requiredFiles = [
  '.env',
  'server/.env',
  'package.json',
  'server/package.json'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  console.log('');
}

// Load and validate environment variables
config();
config({ path: 'server/.env' });

const requiredEnvVars = {
  frontend: [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_HUGGINGFACE_API_TOKEN',
    'VITE_PRINTIFY_API_TOKEN'
  ],
  backend: [
    'STRIPE_SECRET_KEY',
    'PRINTIFY_API_TOKEN'
  ]
};

let missingEnvVars = [];

// Check frontend env vars
requiredEnvVars.frontend.forEach(envVar => {
  if (!process.env[envVar]) {
    missingEnvVars.push(`Frontend: ${envVar}`);
  }
});

// Check backend env vars
requiredEnvVars.backend.forEach(envVar => {
  if (!process.env[envVar]) {
    missingEnvVars.push(`Backend: ${envVar}`);
  }
});

if (missingEnvVars.length > 0) {
  console.error('❌ Missing environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.log('');
} else {
  console.log('✅ All required environment variables found');
}

// Validate API key formats
const validations = [
  {
    key: 'VITE_STRIPE_PUBLISHABLE_KEY',
    pattern: /^pk_(test_|live_)/,
    name: 'Stripe Publishable Key'
  },
  {
    key: 'STRIPE_SECRET_KEY',
    pattern: /^sk_(test_|live_)/,
    name: 'Stripe Secret Key'
  },
  {
    key: 'VITE_HUGGINGFACE_API_TOKEN',
    pattern: /^hf_/,
    name: 'Hugging Face API Token'
  }
];

let invalidKeys = [];
validations.forEach(({ key, pattern, name }) => {
  const value = process.env[key];
  if (value && !pattern.test(value)) {
    invalidKeys.push(name);
  }
});

if (invalidKeys.length > 0) {
  console.error('❌ Invalid API key formats:');
  invalidKeys.forEach(key => console.error(`   - ${key}`));
  console.log('');
} else {
  console.log('✅ API key formats are valid');
}

// Check for development vs production keys
const isUsingTestKeys = process.env.STRIPE_SECRET_KEY?.includes('_test_');
if (isUsingTestKeys) {
  console.warn('⚠️  Using Stripe TEST keys (development mode)');
  console.warn('   Switch to LIVE keys for production');
} else {
  console.log('✅ Using Stripe LIVE keys (production ready)');
}

// Security checklist
console.log('\n🔒 Security Checklist:');
const securityChecks = [
  { check: fs.existsSync('.gitignore'), message: '.gitignore file exists' },
  { check: !fs.readFileSync('.gitignore', 'utf8').includes('.env'), message: '.env files in .gitignore' },
  { check: process.env.NODE_ENV === 'production', message: 'NODE_ENV set to production' },
];

securityChecks.forEach(({ check, message }) => {
  console.log(`${check ? '✅' : '❌'} ${message}`);
});

// Performance checklist
console.log('\n⚡ Performance Checklist:');
const perfChecks = [
  { check: fs.existsSync('dist'), message: 'Production build exists (run: npm run build)' },
];

perfChecks.forEach(({ check, message }) => {
  console.log(`${check ? '✅' : '❌'} ${message}`);
});

// Summary
const totalIssues = missingFiles.length + missingEnvVars.length + invalidKeys.length;
console.log(`\n📊 Summary: ${totalIssues === 0 ? '✅ Ready for production!' : `❌ ${totalIssues} issues to fix`}`);

if (totalIssues > 0) {
  console.log('\n📖 See PRODUCTION_READINESS.md for detailed setup instructions');
  process.exit(1);
} else {
  console.log('🚀 Your app appears ready for production deployment!');
}