@echo off
echo ==========================================
echo   Green Lantern - Push to GitHub
echo ==========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing git repository...
    git init
    echo [32mGit initialized[0m
)

REM Check if remote exists
git remote | findstr "origin" >nul
if errorlevel 1 (
    echo Adding remote repository...
    git remote add origin https://github.com/harshitag2/hack-for-green-bharat.git
    echo [32mRemote added[0m
) else (
    echo [32mRemote already configured[0m
)

REM Create/switch to main branch
git checkout -b main 2>nul || git checkout main
echo [32mOn main branch[0m

echo.
echo Adding files...
git add .

echo.
echo Creating commit...
git commit -m "Add Green Lantern Fleet Management System - Real-time GPS tracking with Pathway streaming - Voronoi diagrams for warehouse service areas - Route optimization with OR-Tools - Modern animated UI with React + Leaflet - Docker containerized deployment"

echo.
echo Pushing to GitHub...
echo You may be prompted for your GitHub credentials
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ==========================================
    echo   Push failed
    echo ==========================================
    echo.
    echo Common solutions:
    echo.
    echo 1. If repository already has content:
    echo    git pull origin main --allow-unrelated-histories
    echo    git push -u origin main
    echo.
    echo 2. If authentication failed:
    echo    - Use Personal Access Token instead of password
    echo    - Generate at: https://github.com/settings/tokens
    echo.
    pause
) else (
    echo.
    echo ==========================================
    echo   Successfully pushed to GitHub!
    echo ==========================================
    echo.
    echo View your repository at:
    echo https://github.com/harshitag2/hack-for-green-bharat
    echo.
    pause
)
