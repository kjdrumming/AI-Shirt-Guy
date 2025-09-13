# Deploy to Vercel - Step by Step Guide

## 🚀 Quick Deployment Steps

### 1. Push to GitHub (if not already done)
```bash
git add .
git commit -m "Ready for Vercel deployment with admin config"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Import Project"
4. Select your `creative-shirt-maker-main` repository

### 3. Configure Deployment Settings
Vercel will auto-detect your Vite project. Use these settings:

- **Framework Preset**: Vite (auto-detected)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 4. Add Environment Variables

In the Vercel dashboard, add these environment variables:

```
VITE_HUGGINGFACE_API_TOKEN=hf_your_huggingface_token_here

VITE_PRINTIFY_API_TOKEN=your_printify_api_token_here

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_key_here
```

### 5. Deploy!
Click "Deploy" and Vercel will build and deploy your app.

## 🔧 Post-Deployment

### Access Your App
- Your app will be available at: `https://your-project-name.vercel.app`
- Admin panel: `https://your-project-name.vercel.app/admin-config`
- Default admin password: `admin123`

### Test the Features
1. **Regular App**: Create designs, select shirts, go through checkout
2. **Admin Panel**: Change image source (Stock/HuggingFace/Pollinations)
3. **Mobile/Desktop**: Verify both work with your admin settings

### Important Notes
- 🧪 **Test Mode**: All Stripe transactions are in test mode
- 🔒 **Admin Access**: `/admin-config` or add `?admin=true` to any URL
- 🎨 **Image Sources**: Switch between Stock, AI, and Pollinations via admin
- 📱 **Responsive**: Works on all devices with proper admin sync
- 🎯 **Seasonal Prompts**: Auto-adjusts based on current date/season

## 🔗 Useful Links After Deployment
- Vercel Dashboard: Monitor builds and deployments
- Stripe Dashboard: View test transactions
- Admin Panel: Configure app settings remotely

## 🚨 Troubleshooting
If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set correctly
3. Ensure no syntax errors in your latest code

Your app is production-ready with all the latest features! 🎉