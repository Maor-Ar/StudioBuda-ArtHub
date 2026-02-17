# Deployment Troubleshooting Guide

## Issue: Code Changes Not Reflecting in Cloud Run

If your code changes aren't appearing in the deployed Cloud Run service, follow these steps:

### Step 1: Verify Changes Are Committed and Pushed

1. **Check git status:**
   ```bash
   git status
   ```

2. **If you have uncommitted changes, commit them:**
   ```bash
   git add backend/src/utils/validators.js backend/src/services/authService.js
   git commit -m "Update password validation to require only 6 characters minimum"
   ```

3. **Push to trigger Cloud Build:**
   ```bash
   git push origin main
   ```

### Step 2: Verify Cloud Build Trigger

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Build** → **Triggers**
3. Check that your trigger is configured to build on push to `main` branch
4. Verify the trigger is pointing to `backend/cloudbuild.yaml`

### Step 3: Force a Fresh Build (If Needed)

If changes still aren't reflecting, force a rebuild without cache:

**Option A: Manual Build (Recommended)**
```bash
cd backend
gcloud builds submit --config=cloudbuild.yaml --no-cache
```

**Option B: Update cloudbuild.yaml temporarily**
The `cloudbuild.yaml` now includes `--no-cache` flag to ensure fresh builds. After confirming it works, you can remove it for faster builds.

### Step 4: Verify Deployment

1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read studiobuda-backend --region=us-central1 --limit=50
   ```

2. Test the API endpoint:
   ```bash
   curl -X POST https://studiobuda-backend-873405578260.us-central1.run.app/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}'
   ```

### Step 5: Verify Code in Container (Debug)

If still having issues, you can verify the code inside the running container:

1. **Get the service URL:**
   ```bash
   gcloud run services describe studiobuda-backend --region=us-central1 --format="value(status.url)"
   ```

2. **Check the deployed code by inspecting the container** (requires Cloud Run Admin access):
   - Go to Cloud Run → studiobuda-backend → Revisions
   - Click on the latest revision
   - Check the logs for any errors

### Common Issues

1. **Docker Cache**: Docker might be using cached layers. The updated `cloudbuild.yaml` uses `--no-cache` to prevent this.

2. **Old Commit**: Cloud Build might be building from an old commit. Always ensure changes are pushed before the build triggers.

3. **Wrong Branch**: Verify Cloud Build trigger is watching the correct branch (usually `main`).

4. **Build Failure**: Check Cloud Build logs for errors:
   ```bash
   gcloud builds list --limit=5
   gcloud builds log <BUILD_ID>
   ```

### Quick Fix Command

If you need to force a rebuild right now:

```bash
cd backend
gcloud builds submit --config=cloudbuild.yaml --no-cache
```

This will:
1. Build a fresh Docker image without cache
2. Push it to Container Registry
3. Deploy to Cloud Run

### Verification Checklist

- [ ] Code changes are committed locally
- [ ] Changes are pushed to remote repository
- [ ] Cloud Build trigger fired successfully
- [ ] Build completed without errors
- [ ] New revision deployed to Cloud Run
- [ ] Service is serving 100% traffic on new revision
- [ ] API endpoint responds correctly
- [ ] Password validation works as expected (6+ chars, no complexity requirements)
