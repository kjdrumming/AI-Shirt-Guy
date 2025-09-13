# Vercel Deployment Configuration for AI Shirt Guy Frontend

## Build Configuration
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Environment Variables to Set in Vercel Dashboard
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
VITE_HUGGINGFACE_API_TOKEN=hf_your_huggingface_token_here
VITE_PRINTIFY_API_TOKEN=your_printify_api_token_here
```

## Important Notes
- The app will be available at: https://your-app-name.vercel.app
- Vercel automatically detects Vite projects
- Environment variables must have VITE_ prefix to be accessible in frontend
- After deployment, update your backend CORS settings with the new domain

## Deployment Steps
1. Connect your GitHub repository to Vercel
2. Import the project
3. Vercel will auto-detect Vite configuration
4. Add all environment variables
5. Deploy!

## Post-Deployment
Remember to update your backend's CORS configuration with the new Vercel domain!