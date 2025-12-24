# Quick Deployment Checklist

Use this checklist to quickly deploy and connect your backend and frontend.

## 🎯 Current Status

- ✅ Backend code complete
- ❌ `.env` file missing (need to create)
- ❓ Frontend status unknown (need to check)

---

## Step-by-Step Quick Start

### 1️⃣ Backend Local Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file (choose one method)
# Option A: Use helper script
.\create-env.ps1  # Windows
# or
./create-env.sh   # Mac/Linux

# Option B: Copy from template (if exists)
# Copy .env.example to .env

# Option C: Create manually (see DEPLOYMENT_GUIDE.md)
```

**Next**: Fill in Firebase and Redis credentials in `.env` (see DEPLOYMENT_GUIDE.md for details)

---

### 2️⃣ Test Backend Locally (2 minutes)

```bash
# Start backend
npm run dev

# Verify in browser:
# - http://localhost:4000/health (should return {"status":"ok"})
# - http://localhost:4000/graphql (should show Apollo Sandbox)
```

**✅ Checkpoint**: Backend running locally? → Continue to Step 3

---

### 3️⃣ Deploy Backend to Google Cloud Run (15 minutes)

**Prerequisites:**
- Google Cloud account
- `gcloud` CLI installed and authenticated

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Deploy (using cloudbuild.yaml)
cd backend
gcloud builds submit --config cloudbuild.yaml

# OR manually:
docker build -t gcr.io/YOUR_PROJECT_ID/studiobuda-backend .
docker push gcr.io/YOUR_PROJECT_ID/studiobuda-backend
gcloud run deploy studiobuda-backend \
  --image gcr.io/YOUR_PROJECT_ID/studiobuda-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**After deployment:**
1. Copy the Cloud Run URL (e.g., `https://studiobuda-backend-xxx.run.app`)
2. Go to Cloud Run Console → Edit service → Variables & Secrets
3. Add all environment variables from your `.env` file

**✅ Checkpoint**: Backend deployed? → Save the URL for frontend

---

### 4️⃣ Frontend Setup (10 minutes)

**Check if frontend exists:**
```bash
# From project root
ls frontend  # or dir frontend (Windows)
```

**If frontend doesn't exist:**
```bash
# Create React Native app with Expo
npx create-expo-app frontend --template blank
cd frontend
npm install @apollo/client graphql @react-native-async-storage/async-storage
```

**Configure Apollo Client:**
- Create `frontend/src/config/apollo.js` (see DEPLOYMENT_GUIDE.md)
- Set GraphQL URL to: `http://localhost:4000/graphql` (local) or your Cloud Run URL (production)

**✅ Checkpoint**: Frontend created and configured? → Continue to Step 5

---

### 5️⃣ Connect Frontend to Backend Locally (5 minutes)

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start  # or expo start
```

**Test connection:**
- Open frontend app
- Try a simple GraphQL query (see DEPLOYMENT_GUIDE.md for example)
- Check browser console for errors

**✅ Checkpoint**: Frontend connects to local backend? → Continue to Step 6

---

### 6️⃣ Connect Frontend to Deployed Backend (5 minutes)

1. **Update frontend Apollo config:**
   - Change GraphQL URL to your Cloud Run URL
   - Update `CORS_ORIGIN` in backend Cloud Run environment variables

2. **Test:**
   - Restart frontend
   - Verify queries work against deployed backend

**✅ Checkpoint**: Frontend connects to deployed backend? → Done!

---

## 🚨 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Backend won't start | Check `.env` file exists and has all required variables |
| CORS errors | Update `CORS_ORIGIN` in `.env` to include frontend URL |
| Can't connect to backend | Verify backend URL is correct, check CORS settings |
| GraphQL queries fail | Check network tab, verify auth token is sent |
| Cloud Run deployment fails | Check environment variables are set, review logs |

---

## 📋 Environment Variables Checklist

Make sure these are set in Cloud Run:

**Required:**
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY` (with `\n` characters)
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `REDIS_HOST`
- [ ] `REDIS_PORT`
- [ ] `REDIS_PASSWORD` (if required)

**Optional (can leave empty for now):**
- [ ] `GROW_API_URL`
- [ ] `GROW_API_KEY`
- [ ] `EMAIL_API_KEY`
- [ ] `CORS_ORIGIN` (should include your frontend URL)

---

## 🎉 Success Criteria

You're done when:
- ✅ Backend runs locally and responds to requests
- ✅ Backend deployed to Cloud Run and accessible
- ✅ Frontend connects to backend (local and/or deployed)
- ✅ GraphQL queries work from frontend
- ✅ Authentication flow works (if implemented)

---

## 📚 Need More Details?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive instructions.

