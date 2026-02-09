# One-time icon setup - run from frontend folder
# Usage: .\scripts\setup-icons.ps1

Write-Host "Installing sharp..." -ForegroundColor Cyan
npm install sharp --save-dev

Write-Host "Generating icons..." -ForegroundColor Cyan
node scripts/generate-app-icon.js

Write-Host "Done. Commit assets/images/*.png and package-lock.json" -ForegroundColor Green
Write-Host "Then add icon config to app.json - see ICONS_SETUP.md" -ForegroundColor Yellow
