# Quick Deployment Guide - 5 Minutes

## Easiest Option: Vercel (Frontend Only)

### 1. Deploy Frontend to Vercel (2 minutes)

```bash
cd frontend
npm install -g vercel
vercel
```

Follow prompts:
- Link to existing project? **No**
- Project name? **green-lantern**
- Directory? **./frontend**
- Override settings? **Yes**
  - Build Command: `npm run build`
  - Output Directory: `dist`

Your site is live! 🎉

**Note**: Backend will run locally. For full deployment, see below.

---

## Full Stack: Railway (Recommended)

### 1. Sign up at Railway
https://railway.app (Free $5 credit)

### 2. Deploy in 3 clicks

1. **New Project** → **Deploy from GitHub**
2. **Connect** your repo: `harshitag2/hack-for-green-bharat`
3. **Add PostgreSQL** database (click "New" → "Database" → "PostgreSQL")

### 3. Configure Services

Railway auto-detects your services. Just add environment variables:

**Backend**:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=8000
```

**Frontend**:
```
VITE_API_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

### 4. Done! 🚀

Your app is live at: `https://your-app.railway.app`

---

## VPS Deployment (DigitalOcean/AWS)

### 1. Create VPS
- 2GB RAM minimum
- Ubuntu 22.04

### 2. SSH and Run

```bash
# SSH into server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone https://github.com/harshitag2/hack-for-green-bharat.git
cd hack-for-green-bharat/greenlantern

# Deploy
./deploy.sh
```

### 3. Access

- Frontend: `http://your-server-ip:3000`
- Backend: `http://your-server-ip:8000`

---

## Local Testing Before Deploy

```bash
# Test production build locally
docker-compose -f docker-compose.prod.yml up --build

# Access at:
# http://localhost:3000
```

---

## Troubleshooting

### "Cannot connect to backend"
Update frontend environment:
```bash
# In frontend/.env
VITE_API_URL=https://your-backend-url.com
```

### "Database connection failed"
Check DATABASE_URL format:
```
postgresql://user:password@host:5432/database
```

### "Port already in use"
```bash
# Stop existing containers
docker-compose down

# Or change port in .env
FRONTEND_PORT=8080
```

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Railway
3. ✅ Connect database
4. ✅ Test live site
5. 📝 Add custom domain (optional)
6. 🔒 Setup SSL (automatic on Vercel/Railway)

---

## Cost

- **Vercel**: Free (hobby)
- **Railway**: $5/month (includes $5 credit)
- **VPS**: $12/month (DigitalOcean)

**Recommended**: Start with Vercel + Railway (Free tier)

---

## Support

Need help? Check:
- Full guide: `DEPLOYMENT_GUIDE.md`
- Logs: `docker-compose logs -f`
- Issues: GitHub Issues

**Quick Deploy Command**:
```bash
./deploy.sh
```
