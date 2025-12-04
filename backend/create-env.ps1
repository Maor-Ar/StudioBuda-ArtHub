# PowerShell script to create .env file from template
# Run this script: .\create-env.ps1

$envContent = @"
# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase Configuration
# Get these from Firebase Console > Project Settings > Service Accounts
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Grow Payment Integration (Optional)
GROW_API_URL=https://api.grow.com
GROW_API_KEY=your-grow-api-key

# Email Service Configuration (Optional)
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM_ADDRESS=noreply@studiobuda.com
EMAIL_FROM_NAME=StudioBuda

# Password Reset Configuration
PASSWORD_RESET_URL=http://localhost:3000/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600
"@

if (Test-Path .env) {
    Write-Host ".env file already exists. Skipping creation." -ForegroundColor Yellow
    Write-Host "If you want to recreate it, delete .env first." -ForegroundColor Yellow
} else {
    $envContent | Out-File -FilePath .env -Encoding utf8
    Write-Host ".env file created successfully!" -ForegroundColor Green
    Write-Host "Please edit .env and add your actual credentials." -ForegroundColor Yellow
}

