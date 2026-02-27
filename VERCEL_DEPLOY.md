# Deploy to Vercel - Step by Step

## Method 1: Vercel Dashboard (Easiest - 3 minutes)

### Step 1: Push to GitHub (if not done)
```bash
cd greenlantern
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy on Vercel

1. **Go to**: https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click**: "Add New" → "Project"
4. **Import** your repository: `harshitag2/hack-for-green-bharat`
5. **Configure**:
   - Framework Preset: **Vite**
   - Root Directory: **frontend** (click "Edit" and type `frontend`)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

6. **Environment Variables** (click "Add"):
   ```
   Name: VITE_API_URL
   Value: http://localhost:8000
   ```
   (We'll update this later when backend is deployed)

7. **Click**: "Deploy"

### Step 3: Wait (1-2 minutes)
Vercel will build and deploy your app.

### Step 4: Done! 🎉
Your site is live at: `https://your-project-name.vercel.app`

---

## Method 2: Vercel CLI (For Developers)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd frontend
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** green-lantern (or your choice)
- **Directory?** ./ (current directory)
- **Override settings?** No (vercel.json is configured)

### Step 4: Production Deploy
```bash
vercel --prod
```

Your site is live! 🚀

---

## What About the Backend?

Your frontend is now live, but it needs a backend. You have 2 options:

### Option A: Keep Backend Local (Testing)
- Backend runs on your computer
- Frontend on Vercel can't connect (CORS issues)
- Good for: Testing the deployment process

### Option B: Deploy Backend Too (Recommended)

**Quick Backend Deployment Options:**

1. **Railway** (Easiest):
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select your repo
   - Add PostgreSQL database
   - Done in 5 minutes!

2. **Render**:
   - Go to https://render.com
   - New → Web Service
   - Connect GitHub
   - Select your repo
   - Root Directory: `backend`

3. **Heroku**:
   ```bash
   cd backend
   heroku create green-lantern-backend
   heroku addons:create heroku-postgresql:mini
   git push heroku main
   ```

---

## Update Frontend to Use Deployed Backend

### After deploying backend:

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Settings** → **Environment Variables**
4. **Edit** `VITE_API_URL`:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
5. **Redeploy**:
   - Go to "Deployments"
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## Troubleshooting

### Build Failed
**Error**: "Command failed: npm run build"

**Fix**:
```bash
# Test build locally first
cd frontend
npm install
npm run build

# If it works locally, push to GitHub
git add .
git commit -m "Fix build"
git push
```

### 404 on Routes
**Error**: Refreshing page shows 404

**Fix**: Already handled by `vercel.json` rewrites. If still happening:
1. Check `vercel.json` exists in frontend folder
2. Redeploy

### Can't Connect to Backend
**Error**: "Network Error" or "Failed to fetch"

**Fix**:
1. Check `VITE_API_URL` in Vercel environment variables
2. Make sure backend is deployed and running
3. Check backend CORS settings allow your Vercel domain

### Environment Variables Not Working
**Error**: API calls go to wrong URL

**Fix**:
1. Environment variables must start with `VITE_`
2. After changing env vars, you must redeploy
3. Check in browser console: `console.log(import.meta.env.VITE_API_URL)`

---

## Custom Domain (Optional)

### Add Your Domain:

1. **Vercel Dashboard** → Your Project
2. **Settings** → **Domains**
3. **Add Domain**: `your-domain.com`
4. **Follow DNS instructions**
5. **SSL**: Automatic (Vercel handles it)

---

## Monitoring Your Deployment

### View Logs:
1. Vercel Dashboard → Your Project
2. Click on a deployment
3. View "Build Logs" or "Function Logs"

### Analytics:
- Vercel provides free analytics
- Enable in: Settings → Analytics

### Performance:
- Vercel automatically optimizes:
  - Image optimization
  - Edge caching
  - Compression
  - CDN distribution

---

## Deployment Checklist

- [x] Code pushed to GitHub
- [x] Vercel project created
- [x] Frontend deployed
- [ ] Backend deployed (Railway/Render)
- [ ] Environment variables updated
- [ ] Test live site
- [ ] Custom domain (optional)

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm deployment-url
```

---

## Cost

**Vercel Free Tier Includes:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic SSL
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Analytics

**Perfect for:**
- Personal projects
- Hackathons
- Demos
- Small apps

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. 🔄 Deploy backend to Railway (see DEPLOYMENT_GUIDE.md)
3. 🔗 Connect frontend to backend
4. 🧪 Test live site
5. 🎉 Share your link!

---

## Your Deployment URLs

After deployment, save these:

- **Frontend**: https://your-project.vercel.app
- **Backend**: (deploy next)
- **GitHub**: https://github.com/harshitag2/hack-for-green-bharat

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Discord**: https://vercel.com/discord
- **Status**: https://vercel-status.com

**Need help?** Check build logs in Vercel dashboard!
