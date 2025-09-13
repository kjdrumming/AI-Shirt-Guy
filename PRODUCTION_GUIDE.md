# Creative Shirt Maker - Production Deployment Guide

## Production Architecture

This application uses a dual-server architecture for production:

1. **Frontend Server**: Serves the React application
2. **Proxy Server**: Handles Printify API requests to avoid CORS issues

## Server Setup

### 1. Proxy Server (Required for Production)

The proxy server handles all Printify API requests to avoid CORS issues.

```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your Printify API token
npm start
```

### 2. Frontend Application

```bash
npm install
npm run build
npm run preview  # or serve with your preferred static server
```

## Environment Variables

### Frontend (.env)
```
VITE_PRINTIFY_API_TOKEN=your_printify_api_token_here
```

### Proxy Server (server/.env)
```
PRINTIFY_API_TOKEN=your_printify_api_token_here
PORT=3001
```

## Deployment Options

### Option 1: Separate Servers
- Deploy proxy server on one instance (e.g., Heroku, Railway, Render)
- Deploy frontend on CDN (e.g., Vercel, Netlify, Cloudflare Pages)
- Update vite.config.ts to point to your proxy server URL

### Option 2: Single Server
- Deploy both on same instance
- Serve frontend static files from Express server
- Modify server/printifyProxy.js to serve static files

## Development vs Production

- **Development**: Vite proxy directly calls Printify API with auth headers
- **Production**: Vite proxy forwards to Express server which handles API auth

The application automatically detects the environment and routes requests appropriately.

## API Endpoints

All Printify API calls are routed through `/api/printify/*` which:
- In development: Goes directly to Printify API via Vite proxy
- In production: Goes to Express proxy server at localhost:3001

## Security Notes

- Never expose your Printify API token in frontend code
- The proxy server keeps your API token secure on the backend
- CORS is handled by the proxy server in production