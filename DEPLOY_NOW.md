# 🚀 Deploy to Vercel NOW - 5 Minutes

## Quick Start (Choose One Method)

---

## 🌐 Method 1: Vercel Dashboard (EASIEST)

### 1. Go to Vercel
👉 **https://vercel.com/new**

### 2. Import Your Repository
- Click "Import Git Repository"
- Select: `harshitag2/hack-for-green-bharat`
- Click "Import"

### 3. Configure Project
```
Framework Preset: Vite
Root Directory: frontend (click Edit and type this)
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4. Add Environment Variable
Click "Environment Variables":
```
VITE_API_URL = http://localhost:8000
```
(Update this later when you deploy backend)

### 5. Click "Deploy"
⏳ Wait 1-2 minutes...

### 6. Done! 🎉
Your site is live at: `https://your-project.vercel.app`

---

## 💻 Method 2: Vercel CLI (FOR DEVELOPERS)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Navigate to Frontend
```bash
cd greenlantern/frontend
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy
```bash
vercel
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? **[Your account]**
- Link to existing project? **N**
- Project name? **green-lantern**
- Directory? **./frontend**
- Override settings? **N**

### 5. Deploy to Production
```bash
vercel --prod
```

### 6. Done! 🎉
Your URL will be shown in the terminal.

---

## ✅ Post-Deployment Checklist

After deployment:

1. **Test Your Site**
   - Open the Vercel URL
   - Check if map loads
   - Check browser console for errors

2. **Known Issue**: Backend Not Connected
   - Your frontend is live ✅
   - Backend is still local ❌
   - Map will load but no live data

3. **Fix**: Deploy Backend (5 more minutes)
   - Option A: Railway (recommended)
   - Option B: Render
   - See: `DEPLOYMENT_GUIDE.md`

---

## 🔧 Quick Fixes

### Build Failed?
```bash
# Test locally first
cd frontend
npm install
npm run build

# If successful, push and redeploy
git add .
git commit -m "Fix build"
git push
```

### Environment Variables Not Working?
1. Must start with `VITE_`
2. Must redeploy after changing
3. Check in browser: `console.log(import.meta.env.VITE_API_URL)`

---

## 📱 What You'll See

After deployment, your site will have:
- ✅ Live map with Delhi boundary
- ✅ Voronoi service areas
- ✅ Vehicle markers
- ✅ Warehouse and restaurant markers
- ❌ No live tracking (need backend)

---

## 🎯 Next Steps

1. ✅ Deploy frontend (you're doing this now!)
2. 🔄 Deploy backend to Railway
3. 🔗 Update `VITE_API_URL` in Vercel
4. 🧪 Test everything works
5. 🎉 Share your link!

---

## 📞 Need Help?

**Vercel Dashboard**: https://vercel.com/dashboard
**Build Logs**: Click on your deployment → View logs
**Redeploy**: Deployments → ... → Redeploy

---

## 🎁 Bonus: Auto-Deploy

Vercel automatically deploys when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys! 🚀
```

---

## 🔗 Important Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Your GitHub**: https://github.com/harshitag2/hack-for-green-bharat
- **Docs**: See `VERCEL_DEPLOY.md` for detailed guide

---

## ⚡ Super Quick Deploy (One Command)

If you have Vercel CLI installed:

```bash
cd greenlantern/frontend && vercel --prod
```

That's it! 🎉

---

**Ready? Let's deploy!** 🚀

Choose Method 1 (Dashboard) if you're new to Vercel.
Choose Method 2 (CLI) if you're comfortable with terminal.
