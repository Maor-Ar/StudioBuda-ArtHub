# OAuth Authentication Setup Guide

This guide explains how to configure Google, Facebook, and Apple authentication for the StudioBuda ArtHub mobile app.

## Overview

The app now supports three OAuth providers:
- **Google Sign-In** - Using `@react-native-google-signin/google-signin`
- **Facebook Login** - Using `expo-facebook`
- **Apple Sign In** - Using `expo-apple-authentication`

## Prerequisites

Before you begin, ensure you have:
1. A Firebase project set up at [Firebase Console](https://console.firebase.google.com/)
2. Your app's bundle identifiers:
   - iOS: `com.studiobuda.arthub`
   - Android: `com.studiobuda.arthub`

---

## 1. Google Sign-In Configuration

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**

### Step 2: Create OAuth Client IDs

You need to create **THREE** separate OAuth Client IDs:

#### A. Web Client ID (for Firebase)
- **Application type**: Web application
- **Name**: "StudioBuda ArtHub Web Client"
- **Authorized redirect URIs**: (Leave empty for now, Firebase will handle this)
- **Copy the Client ID** - This is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

#### B. iOS Client ID
- **Application type**: iOS
- **Name**: "StudioBuda ArtHub iOS"
- **Bundle ID**: `com.studiobuda.arthub`
- **Copy the Client ID** - This is your `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

#### C. Android Client ID
- **Application type**: Android
- **Name**: "StudioBuda ArtHub Android"
- **Package name**: `com.studiobuda.arthub`
- **SHA-1 certificate fingerprint**: Get this by running:
  ```bash
  # For debug builds
  cd android && ./gradlew signingReport

  # Or using keytool
  keytool -keystore ~/.android/debug.keystore -list -v
  ```
- **Copy the Client ID** - This is your `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### Step 3: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `studiobuda-arthub`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider
5. Use the **Web Client ID** from Step 2A
6. Click **Save**

### Step 4: Update iOS Configuration

Edit `frontend/app.json` and replace the placeholder:
```json
{
  "ios": {
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"]
        }
      ]
    }
  }
}
```

Replace `YOUR_IOS_CLIENT_ID` with your actual iOS Client ID (without the `.apps.googleusercontent.com` suffix).

---

## 2. Facebook Login Configuration

### Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as the app type
4. Fill in:
   - **App Name**: "StudioBuda ArtHub"
   - **Contact Email**: Your email
5. Click **Create App**

### Step 2: Add Facebook Login Product

1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **iOS** and **Android** platforms

### Step 3: Configure iOS Settings

1. Go to **Facebook Login** → **Settings** (iOS)
2. Set **Bundle ID**: `com.studiobuda.arthub`
3. Enable **Single Sign On**

### Step 4: Configure Android Settings

1. Go to **Facebook Login** → **Settings** (Android)
2. Set **Google Play Package Name**: `com.studiobuda.arthub`
3. Add **Key Hash**:
   ```bash
   # Generate debug key hash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
   # Default password is: android
   ```

### Step 5: Get App ID and App Secret

1. Go to **Settings** → **Basic**
2. Copy your **App ID** - This is your `EXPO_PUBLIC_FACEBOOK_APP_ID`
3. Note: App Secret is not needed for client-side integration

### Step 6: Enable Facebook in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Sign-in method**
3. Enable **Facebook** provider
4. Enter your Facebook **App ID** and **App Secret**
5. Copy the **OAuth redirect URI** and add it to Facebook:
   - Go to Facebook Developers Console
   - Navigate to **Facebook Login** → **Settings**
   - Add the Firebase OAuth redirect URI to **Valid OAuth Redirect URIs**

---

## 3. Apple Sign In Configuration

### Step 1: Enable Sign In with Apple

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select your App ID: `com.studiobuda.arthub`
4. Enable **Sign In with Apple** capability
5. Click **Save**

### Step 2: Configure in Xcode (if using bare workflow)

If you're using a bare React Native project:
1. Open the project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **Sign In with Apple**

### Step 3: Enable Apple Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Sign-in method**
3. Enable **Apple** provider
4. No additional configuration needed for iOS

### Step 4: Verify app.json Configuration

Ensure `frontend/app.json` has:
```json
{
  "ios": {
    "bundleIdentifier": "com.studiobuda.arthub",
    "usesAppleSignIn": true
  },
  "plugins": [
    "expo-apple-authentication"
  ]
}
```

---

## 4. Environment Variables Setup

### Step 1: Create `.env` File

Create a file at `frontend/.env`:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=studiobuda-arthub.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=studiobuda-arthub
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=studiobuda-arthub.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id_here

# Google OAuth
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com

# Facebook OAuth
EXPO_PUBLIC_FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
```

### Step 2: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon** → **Project settings**
4. Scroll down to **Your apps**
5. Select your iOS or Android app (or create one if needed)
6. Copy the configuration values to your `.env` file

---

## 5. Testing OAuth Integration

### Test Google Sign-In

1. Run the app on a physical device (iOS or Android)
2. Navigate to Login or Register screen
3. Tap "המשך עם גוגל" (Continue with Google)
4. Complete the Google sign-in flow
5. Verify you're logged into the app

### Test Facebook Login

1. Run the app on a physical device
2. Navigate to Login or Register screen
3. Tap "המשך עם פייסבוק" (Continue with Facebook)
4. Complete the Facebook login flow
5. Verify you're logged into the app

### Test Apple Sign In

1. Run the app on a **physical iOS device** (iOS 13+)
2. Navigate to Login or Register screen
3. Tap "המשך עם אפל" (Continue with Apple)
4. Complete the Apple sign-in flow
5. Verify you're logged into the app

**Note**: Apple Sign In does NOT work in simulators for development. You must test on a real iOS device.

---

## 6. Building for Production

### iOS Build

1. Ensure you've configured the App ID in Apple Developer Portal
2. Add the Google URL Scheme to `app.json` (see Step 4 in Google section)
3. Run:
   ```bash
   cd frontend
   eas build --platform ios
   ```

### Android Build

1. Generate a release keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Get the SHA-1 fingerprint:
   ```bash
   keytool -list -v -keystore release.keystore -alias my-key-alias
   ```
3. Add the release SHA-1 to:
   - Google Cloud Console (Android OAuth Client)
   - Facebook Developers Console (Android Key Hashes)
4. Create/update `google-services.json` from Firebase Console
5. Place it in `frontend/`
6. Run:
   ```bash
   cd frontend
   eas build --platform android
   ```

---

## 7. Troubleshooting

### Google Sign-In Issues

**Problem**: "Developer Error" or "Sign in failed"
- **Solution**: Verify your Client IDs match in both Google Cloud Console and your `.env` file
- **Solution**: For Android, ensure your SHA-1 fingerprint is correct

**Problem**: "Google Play Services not available"
- **Solution**: Test on a physical device with Google Play Services installed

### Facebook Login Issues

**Problem**: "App not setup for Facebook Login"
- **Solution**: Ensure you've added the Facebook Login product to your app
- **Solution**: Verify your Bundle ID / Package Name matches

**Problem**: "Invalid Key Hash"
- **Solution**: Regenerate your key hash and add it to Facebook Developer Console

### Apple Sign In Issues

**Problem**: "Apple Sign In not available"
- **Solution**: Test on a physical iOS device (iOS 13+), not simulator
- **Solution**: Ensure "Sign In with Apple" is enabled in your App ID

**Problem**: "No identity token received"
- **Solution**: Verify the capability is added in Apple Developer Portal
- **Solution**: Check that `usesAppleSignIn` is true in `app.json`

---

## 8. Backend Integration

The backend is already configured to handle OAuth authentication via the `loginWithOAuth` GraphQL mutation.

### How it Works

1. User taps an OAuth button in the app
2. Frontend calls the OAuth provider SDK
3. Provider returns an ID token
4. Frontend sends the token to backend via `LOGIN_WITH_OAUTH` mutation:
   ```graphql
   mutation LoginWithOAuth($provider: String!, $token: String!) {
     loginWithOAuth(provider: $provider, token: $token) {
       token
       user { ... }
     }
   }
   ```
5. Backend verifies the token with Firebase
6. Backend creates or retrieves the user
7. Backend returns an auth token
8. Frontend stores the token and logs the user in

### Supported Providers

The backend accepts these provider values:
- `"google"`
- `"facebook"`
- `"apple"`

---

## 9. Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Rotate credentials** - If credentials are exposed, regenerate them immediately
3. **Use different credentials for dev/prod** - Separate Firebase projects recommended
4. **Restrict OAuth redirect URIs** - Only allow your app's domains
5. **Monitor Firebase Authentication logs** - Watch for suspicious activity

---

## 10. Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios)
- [Facebook Login for React Native](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Firebase Console logs
3. Check the app logs for error messages
4. Ensure all environment variables are correctly set

For questions, contact the development team.
