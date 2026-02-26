#!/bin/bash

echo "=========================================="
echo "  Green Lantern - Push to GitHub"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
fi

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo -e "${YELLOW}Adding remote repository...${NC}"
    git remote add origin https://github.com/harshitag2/hack-for-green-bharat.git
    echo -e "${GREEN}✓ Remote added${NC}"
else
    echo -e "${GREEN}✓ Remote already configured${NC}"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    echo -e "${YELLOW}Creating main branch...${NC}"
    git checkout -b main
    echo -e "${GREEN}✓ Main branch created${NC}"
elif [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Switching to main branch...${NC}"
    git checkout -b main 2>/dev/null || git checkout main
    echo -e "${GREEN}✓ On main branch${NC}"
else
    echo -e "${GREEN}✓ Already on main branch${NC}"
fi

echo ""
echo -e "${YELLOW}Adding files...${NC}"
git add .

echo ""
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "Add Green Lantern Fleet Management System

Features:
- Real-time GPS tracking with Pathway streaming framework
- Voronoi diagrams for warehouse service area visualization
- Route optimization with OR-Tools VRP solver
- Modern animated UI with React + Leaflet maps
- Live emissions and fuel consumption tracking
- WebSocket real-time updates
- Docker containerized deployment
- Kafka + PostgreSQL + Redis backend
- Interactive dashboard with live statistics

Tech Stack:
- Frontend: React 18, Vite, Leaflet, D3
- Backend: FastAPI, Python
- Streaming: Pathway framework
- Database: PostgreSQL, Redis
- Message Queue: Apache Kafka
- Optimization: OR-Tools
- Deployment: Docker Compose

Built for Hack for Green Bharat hackathon 🌱"

echo ""
echo -e "${YELLOW}Pushing to GitHub...${NC}"
echo -e "${YELLOW}You may be prompted for your GitHub credentials${NC}"
echo ""

# Try to push
if git push -u origin main; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo -e "  ✓ Successfully pushed to GitHub!"
    echo -e "==========================================${NC}"
    echo ""
    echo "View your repository at:"
    echo -e "${GREEN}https://github.com/harshitag2/hack-for-green-bharat${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo -e "  ✗ Push failed"
    echo -e "==========================================${NC}"
    echo ""
    echo "Common solutions:"
    echo ""
    echo "1. If repository already has content:"
    echo -e "   ${YELLOW}git pull origin main --allow-unrelated-histories${NC}"
    echo -e "   ${YELLOW}git push -u origin main${NC}"
    echo ""
    echo "2. If authentication failed:"
    echo "   - Use Personal Access Token instead of password"
    echo "   - Generate at: https://github.com/settings/tokens"
    echo "   - Use token as password when prompted"
    echo ""
    echo "3. If permission denied:"
    echo "   - Make sure you have write access to the repository"
    echo "   - Check your GitHub username: harshitag2"
    echo ""
fi
