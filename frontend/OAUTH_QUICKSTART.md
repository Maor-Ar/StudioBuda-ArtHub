# OAuth Quick Start Guide

This is a condensed version of the full OAuth setup. For detailed instructions, see [OAUTH_SETUP.md](./OAUTH_SETUP.md).

## What's Already Implemented

✅ All OAuth SDKs installed
✅ AuthService with Google, Facebook, and Apple sign-in
✅ LoginScreen integrated with OAuth
✅ RegisterScreen integrated with OAuth
✅ Backend `loginWithOAuth` mutation ready
✅ app.json configured for OAuth

## What You Need to Configure

### 1. Create Provider Credentials (15-30 minutes)

#### Google (Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create **3 OAuth Client IDs**: Web, iOS, Android
3. Copy the Client IDs

#### Facebook (Required)
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Copy the App ID

#### Apple (Required for iOS only)
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Enable "Sign In with Apple" on your App ID
3. No additional credentials needed

### 2. Setup Environment Variables (2 minutes)

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `.env` and fill in your credentials:
   ```bash
   # From Firebase Console
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...

   # From Google Cloud Console
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...

   # From Facebook Developers
   EXPO_PUBLIC_FACEBOOK_APP_ID=...
   ```

### 3. Update app.json (1 minute)

Replace `YOUR_GOOGLE_CLIENT_ID` in `app.json`:
```json
"CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"]
```

### 4. Test (5 minutes)

1. Start the app:
   ```bash
   npx expo start
   ```

2. Test on a **physical device** (OAuth doesn't work well in simulators)

3. Try signing in with Google, Facebook, or Apple

## Testing Checklist

- [ ] Google Sign-In works on Android
- [ ] Google Sign-In works on iOS
- [ ] Facebook Login works on Android
- [ ] Facebook Login works on iOS
- [ ] Apple Sign In works on iOS (requires physical device, iOS 13+)

## Common Issues

### "Developer Error" (Google)
- **Fix**: Check that your Client IDs in `.env` match those in Google Cloud Console
- **Fix**: For Android, verify SHA-1 certificate fingerprint is added

### "Invalid Key Hash" (Facebook)
- **Fix**: Generate and add your key hash to Facebook Developer Console
  ```bash
  keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
  ```

### "Apple Sign In not available"
- **Fix**: Test on a **real iOS device** (iOS 13+), not simulator
- **Fix**: Verify "Sign In with Apple" is enabled in Apple Developer Portal

## Need Help?

See the full guide: [OAUTH_SETUP.md](./OAUTH_SETUP.md)

## File Structure

```
frontend/
├── src/
│   ├── config/
│   │   └── firebase.js          # OAuth configuration
│   ├── services/
│   │   ├── authService.js       # OAuth implementation
│   │   └── graphql/
│   │       └── mutations.js     # LOGIN_WITH_OAUTH mutation
│   └── screens/
│       └── auth/
│           ├── LoginScreen.js           # OAuth buttons
│           └── RegisterStep1Screen.js   # OAuth buttons
├── .env                         # Your credentials (DO NOT COMMIT)
├── .env.example                 # Template
├── app.json                     # App configuration
├── OAUTH_SETUP.md              # Full setup guide
└── OAUTH_QUICKSTART.md         # This file
```
