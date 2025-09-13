#!/usr/bin/env node

// Production mode switcher
// Usage: node scripts/set-production-mode.js [on|off]

import fs from 'fs';
import path from 'path';

const mode = process.argv[2];

if (!mode || !['on', 'off'].includes(mode)) {
  console.log('Usage: node scripts/set-production-mode.js [on|off]');
  process.exit(1);
}

const isProduction = mode === 'on';

console.log(`🔧 Setting production mode: ${isProduction ? 'ON' : 'OFF'}`);

// Update server .env
const serverEnvPath = 'server/.env';
if (fs.existsSync(serverEnvPath)) {
  let serverEnv = fs.readFileSync(serverEnvPath, 'utf8');
  
  if (serverEnv.includes('NODE_ENV=')) {
    serverEnv = serverEnv.replace(/NODE_ENV=.*/, `NODE_ENV=${isProduction ? 'production' : 'development'}`);
  } else {
    serverEnv += `\nNODE_ENV=${isProduction ? 'production' : 'development'}`;
  }
  
  fs.writeFileSync(serverEnvPath, serverEnv);
  console.log(`✅ Updated ${serverEnvPath}`);
}

// Display warnings for production mode
if (isProduction) {
  console.log('\n🚨 PRODUCTION MODE WARNINGS:');
  console.log('- Switch Stripe keys from TEST to LIVE');
  console.log('- Update CORS origins to your domain');
  console.log('- Set up monitoring and logging');
  console.log('- Test all payment flows');
  console.log('\n📋 Run validation: npm run validate-env');
} else {
  console.log('\n✅ Development mode active');
  console.log('- Using TEST Stripe keys');
  console.log('- Local CORS origins enabled');
  console.log('- Debug logging enabled');
}

console.log('\n🔄 Restart your server to apply changes');