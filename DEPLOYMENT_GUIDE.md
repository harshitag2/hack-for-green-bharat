# Green Lantern - Deployment Guide

## Quick Deployment Options

### Option 1: Vercel + Railway (Recommended - Easiest)
**Best for**: Quick deployment with free tier
**Time**: 15-20 minutes

### Option 2: Docker on VPS (AWS/DigitalOcean/Linode)
**Best for**: Full control, production-ready
**Time**: 30-45 minutes

### Option 3: Render (All-in-One)
**Best for**: Simple full-stack deployment
**Time**: 20-30 minutes

---

## Option 1: Vercel + Railway (RECOMMENDED)

### Step 1: Deploy Backend on Railway

1. **Sign up at Railway**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Connect your GitHub**: https://github.com/harshitag2/hack-for-green-bharat
4. **Add PostgreSQL Database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will auto-provision the database

5. **Configure Backend Service**:
   - Click "New" → "GitHub Repo" → Select your repo
   - Set **Root Directory**: `backend`
   - Add environment variables:
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     KAFKA_BOOTSTRAP_SERVERS=your-kafka-url (or remove Kafka for now)
     REDIS_URL=${{Redis.REDIS_URL}}
     PORT=8000
     ```

6. **Add Redis** (optional):
   - Click "New" → "Database" → "Redis"

7. **Deploy**: Railway will auto-deploy
   - Note your backend URL: `https://your-app.railway.app`

### Step 2: Deploy Frontend on Vercel

1. **Sign up at Vercel**: https://vercel.com
2. **Import Project** → Connect GitHub
3. **Select Repository**: hack-for-green-bharat
4. **Configure Build**:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

6. **Deploy**: Click "Deploy"
   - Your site will be live at: `https://your-app.vercel.app`

### Step 3: Initialize Database

```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Run initialization
\i db/init.sql
\i db/migrate_real_data.sql
\i db/reduce_clutter.sql
```

---

## Option 2: Docker on VPS (AWS/DigitalOcean)

### Prerequisites
- VPS with 2GB+ RAM
- Docker & Docker Compose installed
- Domain name (optional)

### Step 1: Prepare VPS

```bash
# SSH into your VPS
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone Repository

```bash
git clone https://github.com/harshitag2/hack-for-green-bharat.git
cd hack-for-green-bharat/greenlantern
```

### Step 3: Configure Environment

```bash
# Copy and edit .env file
cp .env.example .env
nano .env
```

Update `.env`:
```env
# Database
POSTGRES_USER=greenlantern
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=greenlantern

# Backend
DATABASE_URL=postgresql://greenlantern:your-secure-password@postgres:5432/greenlantern
REDIS_URL=redis://redis:6379
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Frontend (for production build)
VITE_API_URL=http://your-server-ip:8000
```

### Step 4: Update docker-compose for Production

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db:/docker-entrypoint-initdb.d
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
```

### Step 5: Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 6: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## Option 3: Render (All-in-One)

### Step 1: Sign up at Render
https://render.com

### Step 2: Create PostgreSQL Database
1. New → PostgreSQL
2. Note the connection string

### Step 3: Deploy Backend
1. New → Web Service
2. Connect GitHub repo
3. Settings:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     ```
     DATABASE_URL=your-postgres-url
     REDIS_URL=your-redis-url
     ```

### Step 4: Deploy Frontend
1. New → Static Site
2. Connect GitHub repo
3. Settings:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     ```
     VITE_API_URL=https://your-backend.onrender.com
     ```

---

## Post-Deployment Checklist

### 1. Test Backend API
```bash
curl https://your-backend-url/health
```

### 2. Test Frontend
- Open `https://your-frontend-url`
- Check browser console for errors
- Verify map loads correctly
- Test vehicle tracking

### 3. Initialize Database
```bash
# If using Railway/Render
# Connect to database and run:
psql $DATABASE_URL < db/init.sql
psql $DATABASE_URL < db/migrate_real_data.sql
psql $DATABASE_URL < db/reduce_clutter.sql
```

### 4. Setup Monitoring (Optional)
- Add error tracking: Sentry
- Add analytics: Google Analytics
- Add uptime monitoring: UptimeRobot

---

## Environment Variables Reference

### Backend
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
KAFKA_BOOTSTRAP_SERVERS=host:9092
PORT=8000
CORS_ORIGINS=https://your-frontend-url.com
```

### Frontend
```env
VITE_API_URL=https://your-backend-url.com
```

---

## Troubleshooting

### Frontend can't connect to Backend
- Check CORS settings in backend
- Verify `VITE_API_URL` is correct
- Check browser console for errors

### Database connection fails
- Verify `DATABASE_URL` format
- Check firewall rules
- Ensure database is running

### Map doesn't load
- Check if `delhi_boundary.geojson` is in `public/` folder
- Verify build includes public assets
- Check browser console for 404 errors

### Docker deployment issues
```bash
# Restart services
docker-compose restart

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Cost Estimates

### Free Tier (Hobby Projects)
- **Vercel**: Free (100GB bandwidth)
- **Railway**: $5/month (500 hours)
- **Render**: Free tier available
- **Total**: $0-5/month

### Production (Small Scale)
- **Railway**: $20/month
- **Vercel Pro**: $20/month
- **Total**: $40/month

### VPS Option
- **DigitalOcean Droplet**: $12/month (2GB RAM)
- **Domain**: $10/year
- **Total**: $12-15/month

---

## Quick Start Commands

### Deploy to Vercel (Frontend)
```bash
cd frontend
npm install -g vercel
vercel
```

### Deploy to Railway (Backend)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Deploy with Docker
```bash
docker-compose up -d --build
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Docker Docs**: https://docs.docker.com

---

**Need help?** Check the logs first:
```bash
# Railway
railway logs

# Render
# Check dashboard logs

# Docker
docker-compose logs -f
```
