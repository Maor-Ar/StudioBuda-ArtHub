# StudioBuda ArtHub - Complete Deployment Guide

This guide will walk you through deploying both the backend and frontend, and connecting them locally and in production.

## 📋 Current Status

✅ **Backend**: Complete and ready for deployment
- GraphQL API with Apollo Server
- Firebase Firestore integration
- Redis caching
- All features implemented
- Dockerfile ready
- **Missing**: `.env` file (we'll create it)

❓ **Frontend**: Need to check if exists or needs setup
- React Native app (mentioned in requirements)
- Needs to connect to GraphQL backend

---

## 🚀 Part 1: Backend Deployment

### Step 1: Local Backend Setup

#### 1.1 Install Dependencies

```bash
cd backend
npm install
```

#### 1.2 Create `.env` File

**Option A: Use Helper Script (Windows PowerShell)**
```powershell
cd backend
.\create-env.ps1
```

**Option B: Manual Creation**

Create `.env` file in `backend/` directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:19006,http://localhost:8081

# Firebase Configuration (REQUIRED)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com

# Redis Configuration (REQUIRED)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

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

#### 1.3 Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create new one)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file
6. Extract values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and `\n`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

#### 1.4 Setup Redis

**Option A: Local Redis (for development)**
```bash
# Windows (using Chocolatey)
choco install redis-64

# Mac (using Homebrew)
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

**Option B: Redis Cloud (Free tier)**
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Sign up for free account
3. Create database
4. Copy connection details to `.env`

#### 1.5 Start Backend Locally

```bash
cd backend
npm run dev
```

**Verify it's working:**
- Health: http://localhost:4000/health
- GraphQL: http://localhost:4000/graphql
- API Docs: http://localhost:4000/api-docs

---

### Step 2: Deploy Backend to Google Cloud Run

#### 2.1 Prerequisites

1. **Install Google Cloud SDK**
   - Download: https://cloud.google.com/sdk/docs/install
   - Run: `gcloud init`
   - Login and select project

2. **Enable Required APIs**
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 2.2 Setup Firebase in Google Cloud

1. **Create/Select Firebase Project**
   - Use same project as your Firebase setup
   - Or create new project in Google Cloud Console

2. **Setup Cloud Memorystore (Redis) - Optional**
   ```bash
   # Create VPC network (if doesn't exist)
   gcloud compute networks create default --subnet-mode auto
   
   # Create Memorystore Redis instance
   gcloud redis instances create studiobuda-redis \
     --size=1 \
     --region=us-central1 \
     --network=default
   ```
   
   **Note**: For simpler setup, use Redis Cloud (free tier) instead

#### 2.3 Build and Deploy

**Option A: Using Cloud Build (Recommended)**

1. **Create `cloudbuild.yaml`** in `backend/` directory:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/studiobuda-backend', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/studiobuda-backend']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'studiobuda-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/studiobuda-backend'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'PORT=4000,NODE_ENV=production'
```

2. **Set Environment Variables in Cloud Run Console**
   - Go to Cloud Run → studiobuda-backend → Edit & Deploy New Revision
   - Add all environment variables from your `.env` file
   - **Important**: For `FIREBASE_PRIVATE_KEY`, paste the entire key including `\n` characters

3. **Deploy:**
```bash
cd backend
gcloud builds submit --config cloudbuild.yaml
```

**Option B: Manual Docker Build**

1. **Build Docker image:**
```bash
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/studiobuda-backend .
```

2. **Push to Container Registry:**
```bash
docker push gcr.io/YOUR_PROJECT_ID/studiobuda-backend
```

3. **Deploy to Cloud Run:**
```bash
gcloud run deploy studiobuda-backend \
  --image gcr.io/YOUR_PROJECT_ID/studiobuda-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 4000 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "PORT=4000,NODE_ENV=production"
```

4. **Set Environment Variables:**
   - Go to Cloud Run Console
   - Select `studiobuda-backend` service
   - Click "Edit & Deploy New Revision"
   - Go to "Variables & Secrets" tab
   - Add all variables from `.env`

#### 2.4 Get Backend URL

After deployment, you'll get a URL like:
```
https://studiobuda-backend-xxxxx-uc.a.run.app
```

**Save this URL** - you'll need it for frontend configuration.

#### 2.5 Configure Custom Domain (Optional)

1. In Cloud Run console, go to your service
2. Click "Manage Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

---

## 📱 Part 2: Frontend Setup & Connection

### Step 1: Check if Frontend Exists

```bash
# Check if frontend directory exists
ls -la | grep frontend
# or
dir | findstr frontend
```

**If frontend doesn't exist**, you'll need to create a React Native app.

### Step 2: Create React Native Frontend (if needed)

#### 2.1 Initialize React Native Project

```bash
# Using Expo (recommended for easier deployment)
npx create-expo-app frontend --template blank

# Or using React Native CLI
npx react-native init Frontend
```

#### 2.2 Install GraphQL Client

```bash
cd frontend
npm install @apollo/client graphql
npm install @react-native-async-storage/async-storage
```

#### 2.3 Configure Apollo Client

Create `frontend/src/config/apollo.js`:

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL - change based on environment
const GRAPHQL_URI = __DEV__ 
  ? 'http://localhost:4000/graphql'  // Local development
  : 'https://your-backend-url.run.app/graphql';  // Production

const httpLink = createHttpLink({
  uri: GRAPHQL_URI,
});

const authLink = setContext(async (_, { headers }) => {
  // Get token from AsyncStorage
  const token = await AsyncStorage.getItem('authToken');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;
```

#### 2.4 Setup Environment Variables

Create `frontend/.env`:

```env
# Development
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql

# Production (update after backend deployment)
EXPO_PUBLIC_API_URL_PROD=https://your-backend-url.run.app/graphql
```

Update `apollo.js` to use environment variables:

```javascript
const GRAPHQL_URI = __DEV__ 
  ? process.env.EXPO_PUBLIC_API_URL
  : process.env.EXPO_PUBLIC_API_URL_PROD;
```

#### 2.5 Connect to Backend in App

In your main App component:

```javascript
import { ApolloProvider } from '@apollo/client';
import client from './src/config/apollo';

export default function App() {
  return (
    <ApolloProvider client={client}>
      {/* Your app components */}
    </ApolloProvider>
  );
}
```

### Step 3: Test Local Connection

1. **Start Backend:**
```bash
cd backend
npm run dev
```

2. **Start Frontend:**
```bash
cd frontend
npm start
# or
expo start
```

3. **Test GraphQL Query:**
```javascript
import { useQuery, gql } from '@apollo/client';

const GET_EVENTS = gql`
  query GetEvents($dateRange: DateRangeInput!) {
    events(dateRange: $dateRange) {
      id
      title
      date
      startTime
      eventType
    }
  }
`;

function EventsList() {
  const { loading, error, data } = useQuery(GET_EVENTS, {
    variables: {
      dateRange: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View>
      {data.events.map(event => (
        <Text key={event.id}>{event.title}</Text>
      ))}
    </View>
  );
}
```

---

## 🌐 Part 3: Frontend Deployment

### Option A: Expo (Recommended for React Native)

#### 1. Build for Production

```bash
cd frontend

# For iOS
eas build --platform ios

# For Android
eas build --platform android

# For Web (if using Expo Web)
expo build:web
```

#### 2. Deploy Web Version (if applicable)

```bash
expo export:web
# Deploy the 'web-build' folder to:
# - Netlify
# - Vercel
# - Firebase Hosting
# - Any static hosting
```

### Option B: React Native CLI

#### 1. Build Android APK

```bash
cd android
./gradlew assembleRelease
```

#### 2. Build iOS

```bash
cd ios
pod install
# Open in Xcode and archive
```

---

## 🔗 Part 4: Connect Frontend to Deployed Backend

### Update Frontend Configuration

1. **Update Apollo Client URL:**
   - Change `GRAPHQL_URI` in `apollo.js` to your Cloud Run URL
   - Or use environment variables

2. **Update CORS in Backend:**
   - In Cloud Run environment variables, update `CORS_ORIGIN` to include:
     - Your frontend domain
     - `http://localhost:3000` (for local testing)
     - `http://localhost:19006` (Expo dev server)

3. **Test Connection:**
   - Deploy frontend
   - Test GraphQL queries from production frontend

---

## ✅ Verification Checklist

### Backend
- [ ] Backend runs locally on http://localhost:4000
- [ ] GraphQL endpoint accessible at /graphql
- [ ] Health check works at /health
- [ ] Backend deployed to Cloud Run
- [ ] Backend URL accessible from browser
- [ ] Environment variables set in Cloud Run
- [ ] CORS configured correctly

### Frontend
- [ ] Frontend connects to local backend
- [ ] GraphQL queries work locally
- [ ] Frontend connects to deployed backend
- [ ] Authentication flow works
- [ ] Frontend deployed (mobile/web)

### Integration
- [ ] Frontend can query events
- [ ] User registration works
- [ ] User login works
- [ ] Event registration works
- [ ] All features tested end-to-end

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Backend won't start locally
- Check `.env` file exists and has all required variables
- Verify Firebase credentials are correct
- Check Redis is running (if using local Redis)

**Problem**: CORS errors
- Update `CORS_ORIGIN` in `.env` to include frontend URL
- Restart backend after changing `.env`

**Problem**: Cloud Run deployment fails
- Check Dockerfile is in `backend/` directory
- Verify all environment variables are set
- Check Cloud Run logs: `gcloud run services logs read studiobuda-backend`

### Frontend Issues

**Problem**: Can't connect to backend
- Verify backend URL is correct
- Check CORS is configured in backend
- Test backend URL directly in browser

**Problem**: GraphQL queries fail
- Check network tab in browser/dev tools
- Verify authentication token is being sent
- Check backend logs for errors

---

## 📚 Next Steps

1. **Set up monitoring**: Google Cloud Monitoring, error tracking
2. **Configure CI/CD**: GitHub Actions, Cloud Build
3. **Set up staging environment**: Separate Cloud Run service
4. **Add analytics**: Firebase Analytics, Google Analytics
5. **Performance optimization**: Caching, CDN, image optimization

---

## 📞 Support

For issues or questions:
- Check logs: `gcloud run services logs read studiobuda-backend`
- Review documentation in `backend/docs/`
- Check Firebase Console for database/auth issues

