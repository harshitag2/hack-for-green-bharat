# Push Green Lantern to GitHub

## Quick Setup

```bash
# Navigate to greenlantern directory
cd greenlantern

# Initialize git if not already done
git init

# Add remote repository
git remote add origin https://github.com/harshitag2/hack-for-green-bharat.git

# Check current branch
git branch

# If not on main, create and switch to main
git checkout -b main

# Add all files
git add .

# Commit with message
git commit -m "Add Green Lantern Fleet Management System

- Real-time GPS tracking with Pathway streaming
- Voronoi diagrams for warehouse service areas
- Route optimization with emissions tracking
- Modern animated UI with React + Leaflet
- Kafka + PostgreSQL + Redis backend
- Docker containerized deployment"

# Push to GitHub
git push -u origin main
```

## If Repository Already Has Content

If the repository already has files, you might need to pull first:

```bash
# Pull existing content
git pull origin main --allow-unrelated-histories

# Resolve any conflicts if needed
# Then push
git push -u origin main
```

## If You Get Authentication Error

### Option A: Use Personal Access Token (Recommended)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing:

```bash
git push -u origin main
# Username: harshitag2
# Password: <your-personal-access-token>
```

### Option B: Use SSH

```bash
# Change remote to SSH
git remote set-url origin git@github.com:harshitag2/hack-for-green-bharat.git

# Push
git push -u origin main
```

## Verify Push

After pushing, visit:
https://github.com/harshitag2/hack-for-green-bharat

## What's Being Pushed

- ✅ Complete Green Lantern application
- ✅ Frontend (React + Vite + Leaflet)
- ✅ Backend (FastAPI + Python)
- ✅ Pathway streaming pipeline
- ✅ Route optimizer
- ✅ Simulators
- ✅ Docker configuration
- ✅ Database schemas
- ✅ Documentation

## Troubleshooting

### Large Files Warning

If you get warnings about large files:

```bash
# Add .gitignore for node_modules and other large files
echo "node_modules/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo ".DS_Store" >> .gitignore

# Remove cached files
git rm -r --cached node_modules
git commit -m "Remove node_modules from tracking"
git push
```

### Permission Denied

Make sure you're logged in to GitHub and have write access to the repository.

```bash
# Configure git user
git config user.name "harshitag2"
git config user.email "your-email@example.com"
```
