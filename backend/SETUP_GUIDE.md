# StudioBuda ArtHub - Complete Setup Guide

This guide will walk you through setting up the backend from scratch, including local development and Google Cloud deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Setting Up Firebase](#setting-up-firebase)
4. [Setting Up Redis](#setting-up-redis)
5. [Running the Server Locally](#running-the-server-locally)
6. [Testing Without Full Credentials](#testing-without-full-credentials)
7. [Google Cloud Deployment](#google-cloud-deployment)
8. [Connecting a Custom Domain](#connecting-a-custom-domain)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** v18 or higher installed ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** installed
- A **Google account** (for Firebase and Google Cloud)
- A **Firebase project** (we'll set this up)
- A **Redis instance** (we'll set this up)
- **Google Cloud SDK** installed ([Download here](https://cloud.google.com/sdk/docs/install))

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Check npm version
npm --version

# Check Git
git --version

# Check Google Cloud SDK (after installation)
gcloud --version
```

---

## Local Development Setup

### Step 1: Install Dependencies

Navigate to the backend directory and install all npm packages:

```bash
cd backend
npm install
```

This will install all dependencies listed in `package.json` into the `node_modules` folder.

### Step 2: Create Environment File

**Option 1: Use Helper Script (Easiest)**

**Windows (PowerShell):**
```powershell
.\create-env.ps1
```

**Mac/Linux:**
```bash
chmod +x create-env.sh
./create-env.sh
```

**Option 2: Manual Copy**

**Windows (PowerShell):**
```powershell
# If .env.example exists
Copy-Item .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

**Option 3: Manual Creation**

If the above doesn't work, create a file named `.env` in the `backend` directory with this content:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase Configuration (required - see Firebase setup below)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Redis Configuration (required - see Redis setup below)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Grow Payment Integration (Optional for now)
GROW_API_URL=https://api.grow.com
GROW_API_KEY=your-grow-api-key

# Email Service Configuration (Optional for now)
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM_ADDRESS=noreply@studiobuda.com
EMAIL_FROM_NAME=StudioBuda

# Password Reset Configuration
PASSWORD_RESET_URL=http://localhost:3000/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600
```

Now edit the `.env` file with your actual credentials (we'll get these in the next steps).

---

## Setting Up Firebase

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter project name: `StudioBuda-ArtHub` (or your preferred name)
4. Follow the setup wizard (you can disable Google Analytics for now)
5. Click **"Create project"**

### Step 2: Enable Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a location (choose the closest to your users)
5. Click **"Enable"**

### Step 3: Enable Firebase Authentication

1. Go to **Authentication** in the left menu
2. Click **"Get started"**
3. Enable the following sign-in methods:
   - **Email/Password** (enable)
   - **Google** (enable - you'll need to configure OAuth consent screen)
   - **Facebook** (enable - requires Facebook App setup)
   - **Apple** (enable - requires Apple Developer account)

### Step 4: Get Service Account Credentials

1. Go to **Project Settings** (gear icon) > **Service Accounts**
2. Click **"Generate new private key"**
3. A JSON file will download - **DO NOT COMMIT THIS FILE**
4. Open the JSON file and extract these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Step 5: Add to .env File

Open your `.env` file and add the Firebase credentials:

```env
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nActual key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important**: The `FIREBASE_PRIVATE_KEY` must be in quotes and include the `\n` characters exactly as they appear in the JSON file.

---

## Setting Up Redis

You have two options for Redis:

### Option 1: Redis Cloud (Free Tier - Recommended for Development)

1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Sign up for a free account
3. Create a new database
4. Choose the free tier (30MB)
5. Select a region close to you
6. After creation, you'll get:
   - **Endpoint** (host) → `REDIS_HOST`
   - **Port** → `REDIS_PORT` (usually 6379)
   - **Password** → `REDIS_PASSWORD`

Add to your `.env`:
```env
REDIS_HOST=your-redis-endpoint.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password
```

### Option 2: Local Redis (Using Docker)

If you have Docker installed:

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

Then in your `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Option 3: Install Redis Locally

**Windows:**
- Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
- Or use WSL2 and install Redis there

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

---

## Running the Server Locally

### Step 1: Complete Your .env File

Make sure your `.env` file has all required variables:

```env
# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase (required)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email

# Redis (required)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password-if-needed

# Optional (can be empty for now)
GROW_API_URL=
GROW_API_KEY=
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_API_KEY=
EMAIL_FROM_ADDRESS=
EMAIL_FROM_NAME=StudioBuda
PASSWORD_RESET_URL=http://localhost:3000/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600
```

### Step 2: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Step 3: Verify It's Working

1. Open your browser to `http://localhost:4000/health`
   - You should see: `{"status":"ok","timestamp":"..."}`

2. Open GraphQL endpoint: `http://localhost:4000/graphql`
   - You should see the GraphQL interface

3. Open API docs: `http://localhost:4000/api-docs`
   - You should see Swagger documentation

---

## Testing Without Full Credentials

**Good News!** The server has been configured to start in development mode even without full credentials. However, features will be limited:

### Development Mode Behavior

In `NODE_ENV=development`, the server will:
- ✅ Start successfully (with warnings)
- ✅ Serve GraphQL endpoint
- ✅ Serve API documentation
- ⚠️  **Firebase**: Will warn but continue (database/auth won't work)
- ⚠️  **Redis**: Will warn but continue (caching disabled)

### What Works Without Credentials

- ✅ Server starts and responds to health checks
- ✅ GraphQL endpoint is accessible
- ✅ API documentation is available
- ✅ You can test the server structure

### What Doesn't Work Without Credentials

- ❌ Database operations (Firestore)
- ❌ Authentication
- ❌ User management
- ❌ Caching (Redis)
- ❌ Any feature requiring Firebase or Redis

### Minimal Setup for Full Testing

To test all features, you need at minimum:

1. **Firebase**: Create a free Firebase project (takes 5 minutes)
   - Free tier includes: 1GB storage, 50K reads/day, 20K writes/day
   - See [Setting Up Firebase](#setting-up-firebase) section

2. **Redis**: Use Redis Cloud free tier (takes 2 minutes)
   - Free tier: 30MB storage, perfect for development
   - See [Setting Up Redis](#setting-up-redis) section

3. **Grow & Email**: Leave empty for now (they're placeholders)

With Firebase and Redis configured, you can:
- ✅ Start the server
- ✅ Test GraphQL queries
- ✅ Test authentication
- ✅ Test all CRUD operations
- ✅ Test caching
- ❌ Payment verification (placeholder)
- ❌ Email sending (placeholder)

---

## Google Cloud Deployment

### Step 1: Install Google Cloud SDK

1. Download from [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Run the installer
3. After installation, run:
```bash
gcloud init
```
4. Login with your Google account
5. Select or create a project
6. Choose a default region

### Step 2: Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com
```

### Step 3: Set Up Google Cloud Project

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Set default region
gcloud config set run/region us-central1
```

### Step 4: Create Redis Instance (Cloud Memorystore)

**Option A: Use Cloud Memorystore (Managed Redis)**

```bash
# Create Redis instance
gcloud redis instances create studiobuda-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

This will take 10-15 minutes. After creation, get the connection details:

```bash
gcloud redis instances describe studiobuda-redis --region=us-central1
```

**Option B: Use Redis Cloud (Easier for first deployment)**

You can continue using Redis Cloud even in production (they have paid tiers).

### Step 5: Build and Push Docker Image

```bash
# Make sure you're in the backend directory
cd backend

# Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/studiobuda-backend:latest .

# Configure Docker to use gcloud
gcloud auth configure-docker

# Push the image to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/studiobuda-backend:latest
```

### Step 6: Set Up Environment Variables in Cloud Run

Create a file called `env-vars.yaml`:

```yaml
FIREBASE_PROJECT_ID: your-project-id
FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL: your-client-email
REDIS_HOST: your-redis-host
REDIS_PORT: "6379"
REDIS_PASSWORD: your-redis-password
NODE_ENV: production
CORS_ORIGIN: https://arthub.studiobuda.co.il
GROW_API_URL: https://api.grow.com
GROW_API_KEY: your-grow-key
EMAIL_SERVICE_PROVIDER: sendgrid
EMAIL_API_KEY: your-email-key
EMAIL_FROM_ADDRESS: noreply@studiobuda.com
EMAIL_FROM_NAME: StudioBuda
PASSWORD_RESET_URL: https://arthub.studiobuda.co.il/reset-password
PASSWORD_RESET_TOKEN_EXPIRY: "3600"
```

### Step 7: Deploy to Cloud Run

```bash
gcloud run deploy studiobuda-backend \
  --image gcr.io/YOUR_PROJECT_ID/studiobuda-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 4000 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300 \
  --env-vars-file env-vars.yaml
```

### Step 8: Get Your Service URL

After deployment, you'll get a URL like:
```
https://studiobuda-backend-xxxxx-uc.a.run.app
```

Test it:
```bash
curl https://studiobuda-backend-xxxxx-uc.a.run.app/health
```

---

## Connecting a Custom Domain

### Step 1: Verify Domain Ownership

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Run** > Your service
3. Click **"Manage Custom Domains"**
4. Click **"Add Mapping"**
5. Enter your domain: `api.studiobuda.com`
6. Follow the verification steps (add DNS records)

### Step 2: Update DNS Records

Add these DNS records to your domain provider:

**For Cloud Run:**
- Type: `CNAME`
- Name: `api` (or `@` for root domain)
- Value: `ghs.googlehosted.com`

**Or use A record:**
- Type: `A`
- Name: `api`
- Value: (provided by Google Cloud)

### Step 3: Update CORS in .env

Update your Cloud Run environment variables:

```bash
gcloud run services update studiobuda-backend \
  --update-env-vars CORS_ORIGIN=https://arthub.studiobuda.co.il,https://api.studiobuda.co.il \
  --region us-central1
```

### Step 4: Update Frontend

Update your frontend to use the new API URL:
```
https://api.studiobuda.com/graphql
```

---

## Troubleshooting

### Server Won't Start

**Error: "Missing required environment variables"**
- Check your `.env` file exists
- Verify all required variables are set
- Make sure `FIREBASE_PRIVATE_KEY` is in quotes

**Error: "Firebase initialization error"**
- Verify Firebase credentials are correct
- Check that private key includes `\n` characters
- Make sure service account has proper permissions

**Error: "Redis connection failed"**
- Verify Redis is running (if local)
- Check Redis host/port/password
- Test connection: `redis-cli -h YOUR_HOST -p YOUR_PORT -a YOUR_PASSWORD ping`

### GraphQL Errors

**Error: "Authentication required"**
- Make sure you're sending the Firebase ID token in the `Authorization` header
- Format: `Authorization: Bearer YOUR_FIREBASE_TOKEN`

**Error: "Permission denied"**
- Check user role in Firestore
- Verify you're using the correct role for the operation

### Deployment Issues

**Error: "Image not found"**
- Make sure you pushed the image: `docker push gcr.io/YOUR_PROJECT_ID/studiobuda-backend:latest`
- Verify project ID is correct

**Error: "Service timeout"**
- Increase timeout: `--timeout 300`
- Check Cloud Run logs: `gcloud run services logs read studiobuda-backend`

**Error: "Out of memory"**
- Increase memory: `--memory 1Gi`

### Redis Connection Issues in Cloud Run

If using Cloud Memorystore, you need to:
1. Enable VPC connector
2. Configure Cloud Run to use VPC connector
3. Or use Redis Cloud (easier, works from anywhere)

---

## Next Steps

After setup:

1. ✅ Test all GraphQL queries and mutations
2. ✅ Set up Firebase Security Rules (see `docs/database.md`)
3. ✅ Configure email service (SendGrid/Mailgun)
4. ✅ Integrate Grow payment API
5. ✅ Set up monitoring and alerts
6. ✅ Configure CI/CD pipeline

---

## Quick Reference

**Local Development:**
```bash
npm install          # Install dependencies
cp .env.example .env # Create env file
# Edit .env with your credentials
npm run dev          # Start dev server
```

**Deployment:**
```bash
docker build -t gcr.io/PROJECT_ID/studiobuda-backend:latest .
docker push gcr.io/PROJECT_ID/studiobuda-backend:latest
gcloud run deploy studiobuda-backend --image gcr.io/PROJECT_ID/studiobuda-backend:latest
```

**Health Check:**
```bash
curl http://localhost:4000/health  # Local
curl https://your-service-url/health  # Production
```

---

## Support

If you encounter issues:
1. Check the logs: `npm run dev` shows detailed logs
2. Check Cloud Run logs: `gcloud run services logs read studiobuda-backend`
3. Review Firebase console for database/auth issues
4. Check Redis connection status

Good luck! 🚀
