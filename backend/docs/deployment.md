# StudioBuda ArtHub - Deployment Guide

## Prerequisites

- Google Cloud Platform account
- Firebase project
- Redis instance (Cloud Memorystore or managed Redis)
- Node.js 18+ installed locally for development

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in all required environment variables:
   - Firebase credentials (from Firebase Console)
   - Redis connection details
   - Grow API credentials (when available)
   - Email service credentials (when available)

## Firebase Configuration

1. Create a Firebase project in Firebase Console
2. Enable Firestore Database
3. Enable Firebase Authentication (Email/Password, Google, Facebook, Apple)
4. Create a service account:
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file
   - Extract values for `.env`:
     - `FIREBASE_PROJECT_ID`: From project settings
     - `FIREBASE_PRIVATE_KEY`: From service account JSON (private_key field)
     - `FIREBASE_CLIENT_EMAIL`: From service account JSON (client_email field)

## Redis Setup

### Option 1: Cloud Memorystore (Recommended for Production)
1. Create Memorystore Redis instance in Google Cloud
2. Note the connection details (host, port)
3. Configure VPC connector if needed

### Option 2: Managed Redis (Redis Cloud, etc.)
1. Create Redis instance with your provider
2. Get connection details
3. Update `.env` with connection details

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start Redis locally (if not using cloud):
```bash
redis-server
```

3. Start the server:
```bash
npm run dev
```

4. Access:
   - GraphQL: http://localhost:4000/graphql
   - API Docs: http://localhost:4000/api-docs
   - Health: http://localhost:4000/health

## Docker Build

1. Build Docker image:
```bash
docker build -t studiobuda-backend .
```

2. Run container:
```bash
docker run -p 4000:4000 --env-file .env studiobuda-backend
```

## Google Cloud Run Deployment

1. Build and push to Container Registry:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/studiobuda-backend
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy studiobuda-backend \
  --image gcr.io/PROJECT_ID/studiobuda-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=...,FIREBASE_PRIVATE_KEY=...,..."
```

3. Configure environment variables in Cloud Run console or via CLI

4. Set up VPC connector for Redis (if using Memorystore)

## Environment Variables Reference

See `.env.example` for all required and optional variables.

## Health Checks

Cloud Run will use the `/health` endpoint for health checks.

## Monitoring

- Google Cloud Monitoring integration
- Logs available in Cloud Logging
- Error tracking via structured logging

