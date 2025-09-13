# 🚀 Production Deployment Guide: GitHub → Render + Vercel

## Overview
Deploy your AI Shirt Guy app to production using:
- **GitHub**: Source code repository
- **Render**: Backend API server hosting  
- **Vercel**: Frontend React app hosting

---

## 📋 Pre-Deployment Checklist

### ✅ 1. Repository Setup (COMPLETED)
- [x] Code committed to Git with deployment configs
- [x] Environment files (.env) excluded from Git
- [x] Example environment files created

### ⚠️ 2. Get Live Stripe Keys
**IMPORTANT**: Switch from TEST to LIVE Stripe keys for production!

1. Go to https://dashboard.stripe.com/apikeys
2. Get your **LIVE** keys (not test keys)
3. You'll need:
   - `pk_live_...` (Publishable key for frontend)
   - `sk_live_...` (Secret key for backend)

---

## 🎯 Step-by-Step Deployment

### Step 1: Create GitHub Repository

1. Go to https://github.com and create a new repository
2. Name it something like `ai-shirt-guy` or `creative-shirt-maker`
3. Make it **public** (required for free Render deployment)
4. Copy the repository URL

5. Connect your local code to GitHub:
```bash
cd "/Users/keithjones/Desktop/DEV/creative-shirt-maker-main 2"
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend to Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Service Settings:**
- **Name**: `ai-shirt-guy-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `.` (leave empty or put root)
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && npm start`

**Environment Variables** (Add these in Render dashboard):
```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_STRIPE_SECRET_KEY
PRINTIFY_API_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6Ijc1MmZhNmNjYmY3MmZiZTE0YTVjN2ZlYWRiNmIyODYxNmVlMGM0MzEzZTU1NzVkNTk1Y2NmODFjNGFjMjZjZTI2YjM0NzE0ZjNmNTNiZDI1IiwiaWF0IjoxNzU3NzEyNzc2LjM1Njc2NCwibmJmIjoxNzU3NzEyNzc2LjM1Njc2NiwiZXhwIjoxNzg5MjQ4Nzc2LjM0OTgzNCwic3ViIjoiODM3ODUwNSIsInNjb3BlcyI6WyJzaG9wcy5tYW5hZ2UiLCJzaG9wcy5yZWFkIiwiY2F0YWxvZy5yZWFkIiwib3JkZXJzLnJlYWQiLCJvcmRlcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJ3ZWJob29rcy5yZWFkIiwid2ViaG9va3Mud3JpdGUiLCJ1cGxvYWRzLnJlYWQiLCJ1cGxvYWRzLndyaXRlIiwicHJpbnRfcHJvdmlkZXJzLnJlYWQiLCJ1c2VyLmluZm8iXX0.EzA3EiHD_Vnhjxp84VmDBv4H-UddXU9WRXaceJKj9TdcgDtaLrZ0zys0XkJeIioeGgq6WZIBQqUEshstk_2_HajBuMYZHgBTBuopOTZOR-9n1QX0zMFradniLc9kmUEUGbGnzFrzH84w-mV5wL4JcOSj382IWhsd8B5_oreyX7nARmpUDN2zZLUQdU9aWKYYDMF9iSMgJV9wMSAJ2VWpEC7cAifVofor3Od3emjgcs2btYRxErfZiwmgSfYU1CNfwYOqbWdeg4V8uj7eVGkwOIKWVpoe2jEXnHgPZc0g2VNtppcmEQxG3IlYKxlz05juRxzb_Wk_oH9_3CrQ3EsrOidBImI-UE4c9fJb6BmzXJ9Dmf5Tqg04esarejVtdEgYS8ei5RzwK45peEwbBg-ySrF8FvDsqlwJbzLn5UZWNak1b5-zqsX_rAxbl1TDyJzb13rKVEtjs5Fdutlvgm92q54mZV2FmCA-7BAG6px_jrOc3MwG1zhDU8ITiYSXqF7z89elXvUoOD6rQZvaEDyPIYIcWrtWdkyWS5uA6kKkBV3pDYUTFBwXW5aVpY6kS-coHXku1Y3FDfF_yK-jps-_klvfwPCov-PeNm3EpziXcIh_6Dq_KZkclejLWYy2bNeRAblONAq-tNbBKmRVms1dK9nWl8Vsaz4gv8jtxawmizk
```

5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Note your backend URL: `https://ai-shirt-guy-backend.onrender.com`

### Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Vite project

**Build Settings** (auto-detected):
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

**Environment Variables** (Add in Vercel dashboard):
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_STRIPE_PUBLISHABLE_KEY
VITE_HUGGINGFACE_API_TOKEN=hf_your_huggingface_token_here
VITE_PRINTIFY_API_TOKEN=your_printify_api_token_here
```

5. Click "Deploy"
6. Wait for deployment (2-5 minutes)
7. Note your frontend URL: `https://ai-shirt-guy.vercel.app`

### Step 4: Update API Endpoints

Now you need to update your frontend to use the production backend URL:

1. Update `src/services/stripePaymentService.ts`:
```typescript
const baseUrl = 'https://ai-shirt-guy-backend.onrender.com'; // Replace with your actual Render URL
```

2. Commit and push the change:
```bash
git add .
git commit -m "Update API endpoint for production"
git push
```

3. Vercel will automatically redeploy with the new endpoint

### Step 5: Update CORS Settings

Update your backend CORS to allow your production domain. The backend will automatically be updated when you push to GitHub.

---

## 🔧 Post-Deployment Configuration

### Update Frontend API URL
You need to update the `stripePaymentService.ts` file to point to your production backend URL.

### Test Production Deployment
1. Visit your Vercel URL
2. Try generating a design
3. Test the payment flow with Stripe test cards:
   - `4242 4242 4242 4242` (Visa)
   - Any future expiry date
   - Any 3-digit CVC

### Switch to Live Stripe Keys
⚠️ **Only do this when ready for real customers!**
1. Replace TEST keys with LIVE keys in both Render and Vercel
2. Test with a real card (small amount)
3. Verify webhooks are working

---

## 🏁 You're Live!

Once deployed, your AI Shirt Guy app will be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

## 💰 Costs
- **Render**: Free tier (with cold starts) or $7/month for always-on
- **Vercel**: Free tier for personal projects
- **GitHub**: Free for public repositories

Your app is ready for customers! 🎉👕