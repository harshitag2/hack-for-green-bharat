# 🚀 How to Push Green Lantern to GitHub

## Quick Method (Recommended)

### On Mac/Linux:
```bash
cd greenlantern
./git-push.sh
```

### On Windows:
```cmd
cd greenlantern
git-push.bat
```

The script will automatically:
1. Initialize git repository
2. Add remote (https://github.com/harshitag2/hack-for-green-bharat.git)
3. Create main branch
4. Add all files
5. Create commit with detailed message
6. Push to GitHub

---

## Manual Method

If you prefer to do it manually:

```bash
cd greenlantern

# Initialize git
git init

# Add remote
git remote add origin https://github.com/harshitag2/hack-for-green-bharat.git

# Create main branch
git checkout -b main

# Add files
git add .

# Commit
git commit -m "Add Green Lantern Fleet Management System"

# Push
git push -u origin main
```

---

## 🔐 Authentication

### Option 1: Personal Access Token (Recommended)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Tokens (classic)"
3. Give it a name: "Green Lantern Push"
4. Select scope: `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

When pushing:
- Username: `harshitag2`
- Password: `<paste-your-token-here>`

### Option 2: SSH (Alternative)

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to GitHub: https://github.com/settings/keys

# Change remote to SSH
git remote set-url origin git@github.com:harshitag2/hack-for-green-bharat.git

# Push
git push -u origin main
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Repository already has content

```bash
# Pull first, then push
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Issue 2: Authentication failed

- Make sure you're using a **Personal Access Token**, not your GitHub password
- GitHub no longer accepts passwords for git operations

### Issue 3: Permission denied

- Verify you have write access to the repository
- Check you're using the correct username: `harshitag2`

### Issue 4: Large files warning

```bash
# Add to .gitignore
echo "node_modules/" >> .gitignore
echo "__pycache__/" >> .gitignore

# Remove from git cache
git rm -r --cached node_modules
git commit -m "Remove large files"
git push
```

### Issue 5: Merge conflicts

```bash
# If you get conflicts after pull
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
git push
```

---

## ✅ Verify Push

After pushing, visit:
**https://github.com/harshitag2/hack-for-green-bharat**

You should see:
- ✅ All Green Lantern files
- ✅ README.md displayed
- ✅ Commit message
- ✅ All folders (frontend, backend, pathway_pipeline, etc.)

---

## 📦 What's Being Pushed

```
greenlantern/
├── frontend/              # React dashboard
├── backend/               # FastAPI server
├── pathway_pipeline/      # Pathway streaming
├── optimizer/             # Route optimization
├── simulators/            # GPS/Load simulators
├── db/                    # Database schemas
├── kafka-setup/           # Kafka configuration
├── docker-compose.yml     # Full stack orchestration
├── README.md              # Documentation
├── .gitignore            # Ignore node_modules, etc.
└── scripts/              # Migration scripts
```

**Total Size**: ~50-100 MB (excluding node_modules)

---

## 🎯 Next Steps After Push

1. **Add Repository Description** on GitHub:
   - "Real-time fleet management with Pathway streaming, route optimization, and emissions tracking"

2. **Add Topics** on GitHub:
   - `pathway`, `fleet-management`, `route-optimization`, `real-time`, `kafka`, `react`, `fastapi`, `docker`

3. **Enable GitHub Pages** (optional):
   - Settings → Pages → Deploy from main branch

4. **Add Collaborators** (if needed):
   - Settings → Collaborators → Add people

5. **Create Release** (optional):
   - Releases → Create a new release → v1.0.0

---

## 💡 Tips

- **Commit Often**: Make small, frequent commits
- **Write Good Messages**: Describe what changed and why
- **Use Branches**: Create feature branches for new work
- **Pull Before Push**: Always pull latest changes first

---

## 🆘 Need Help?

If you're still having issues:

1. Check git status: `git status`
2. Check remote: `git remote -v`
3. Check logs: `git log --oneline`
4. Force push (⚠️ use carefully): `git push -f origin main`

---

**Ready to push? Run the script!**

```bash
./git-push.sh
```
