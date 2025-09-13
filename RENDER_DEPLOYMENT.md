# Render.com Deployment Configuration for AI Shirt Guy Backend

## Service Configuration
- **Service Type**: Web Service
- **Environment**: Node.js
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && npm start`
- **Root Directory**: `.` (repository root)

## Environment Variables to Set in Render Dashboard
```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
PRINTIFY_API_TOKEN=your_printify_api_token_here
PORT=10000
```

## Important Notes
- Render automatically assigns a PORT environment variable (usually 10000)
- The app will be available at: https://your-app-name.onrender.com
- Free tier may have cold starts after 15 minutes of inactivity
- For production, consider upgrading to paid plan for better reliability

## Deployment Steps
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build and start commands above
4. Add all environment variables
5. Deploy!