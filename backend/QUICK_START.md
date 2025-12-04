# Quick Start Guide

Get the server running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create .env File

Create a file named `.env` in the `backend` directory with this content:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase (get from Firebase Console - see SETUP_GUIDE.md)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com

# Redis (use Redis Cloud free tier - see SETUP_GUIDE.md)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Optional (can leave empty for now)
GROW_API_URL=
GROW_API_KEY=
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_API_KEY=
EMAIL_FROM_ADDRESS=
EMAIL_FROM_NAME=StudioBuda
PASSWORD_RESET_URL=http://localhost:3000/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600
```

## Step 3: Get Credentials

### Firebase (Required)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable Firestore Database
4. Enable Authentication
5. Go to Project Settings > Service Accounts
6. Generate new private key
7. Copy values to `.env`

### Redis (Required)
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Sign up (free tier)
3. Create database
4. Copy connection details to `.env`

## Step 4: Start Server

```bash
npm run dev
```

## Step 5: Test

- Health: http://localhost:4000/health
- GraphQL: http://localhost:4000/graphql
- API Docs: http://localhost:4000/api-docs

## Need More Help?

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## Testing Without Credentials

In development mode, the server will start even without credentials (with warnings). However, database and auth features won't work. See SETUP_GUIDE.md for details.
