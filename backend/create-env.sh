#!/bin/bash
# Bash script to create .env file from template
# Run this script: chmod +x create-env.sh && ./create-env.sh

if [ -f .env ]; then
    echo ".env file already exists. Skipping creation."
    echo "If you want to recreate it, delete .env first."
    exit 0
fi

cat > .env << 'EOF'
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
EOF

echo ".env file created successfully!"
echo "Please edit .env and add your actual credentials."

