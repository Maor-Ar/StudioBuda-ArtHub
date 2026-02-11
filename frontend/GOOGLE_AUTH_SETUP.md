# Google OAuth Setup (Same for Dev & Prod)

This app uses `expo-auth-session` with `useProxy: false` for consistent behavior across all environments.

**Project:** studiobuda-arthub (102013040020)

## 1. Web Client – Add Redirect URIs (Required)

The Web OAuth client `102013040020-on89le0901sibnbho24bdkjvenjt0q34` must include these URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → select project **studiobuda-arthub**
2. **APIs & Services** → **Credentials** → open the **Web client** (102013040020-on89le...)
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:8081`
   - `https://arthub.studiobuda.co.il`
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:8081`
   - `http://localhost:8081/`
   - `https://arthub.studiobuda.co.il`
   - `https://arthub.studiobuda.co.il/`

   > **Note:** Do not add `studiobuda-arthub://` to the Web client – web clients only accept URLs with a domain. Custom schemes are for Android/iOS clients (see below).

5. Click **Save**.

## 2. Android OAuth Clients (Required for native Android)

For native Android, create **separate** OAuth clients (Application type: **Android**) in the same project:

- **Android (dev):** Package `com.studiobuda.arthub`, SHA-1 from debug keystore
- **Android (prod):** Package `com.studiobuda.arthub`, SHA-1 from EAS

These use package name + SHA-1 instead of redirect URIs. Add their Client IDs to `.env` when created.

## 3. Environment Variables

Set in `.env` (same values for dev and prod):

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_DEBUG_CLIENT_ID=YOUR_ANDROID_DEBUG_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

The app uses `EXPO_PUBLIC_GOOGLE_ANDROID_DEBUG_CLIENT_ID` for Android debug builds (`__DEV__`) and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` for production builds.

If not set, the app falls back to the web client ID from `google-services.json` (works for web only).

## 4. Firebase Console

1. Enable **Google** as a sign-in provider in Firebase Authentication
2. The Web client ID from Firebase is already in `google-services.json`

## 5. Development Builds (Native)

For native iOS/Android, use a **development build** (`expo run:ios` or `expo run:android`), not Expo Go. Expo Go does not support custom URL schemes, so `studiobuda-arthub://` redirects will not work there.

For web, Google auth works in the browser at `http://localhost:8081` or `https://arthub.studiobuda.co.il`.

---

## Android OAuth Client ID – SHA-1 Explained

**What is SHA-1?**  
It’s a fingerprint of the certificate used to sign your Android app. Google uses it to verify that the app making the OAuth request is yours.

**How to get SHA-1:**

### Option A: Debug build (development)

1. Open a terminal (PowerShell or Command Prompt).
2. Run (the path uses your Windows user folder):

   ```powershell
   keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```

3. In the output, look for the line **SHA1:** and copy the value (e.g. `AA:BB:CC:DD:...`).

### Option B: Release build (production, EAS)

1. Log in: `eas login`
2. Run: `eas credentials -p android`
3. Choose your project and the Android build profile.
4. Select **Keystore: Manage everything needed to build your project**.
5. Use **View credentials** or download the keystore and run `keytool` on it to get the SHA-1.

### Create the Android OAuth client

1. **Create credentials** → **OAuth client ID**.
2. **Application type:** Android.
3. **Name:** e.g. `StudioBuda ArtHub - Android`.
4. **Package name:** `com.studiobuda.arthub`
5. **SHA-1 certificate fingerprint:** paste your SHA-1 (see below).
6. Click **Create**.
7. Add the Client ID to `.env`:

   ```env
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
   ```

### Two Android OAuth Clients (Debug + Production)

Google Cloud Console allows only one SHA-1 per Android OAuth client. Create two separate clients:

| Client | SHA-1 | Used when |
|--------|-------|-----------|
| **Android (dev)** | Debug SHA-1 (e.g. `31:99:41:7D:CC:AC:A2:87:AE:62:87:0D:61:DA:19:12:41:60:FC:19`) | `expo run:android` / debug builds |
| **Android (prod)** | Production SHA-1 from EAS | Production APK builds |

1. Create **Android OAuth client (dev)** with debug SHA-1 → add `EXPO_PUBLIC_GOOGLE_ANDROID_DEBUG_CLIENT_ID` to `.env`.
2. Create **Android OAuth client (prod)** with production SHA-1 → add `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` to `.env`.

**To get production SHA-1:**

1. Run at least one EAS build: `eas build -p android`
2. Then run: `eas credentials -p android`
3. Choose your build profile → **Keystore** → view credentials.
4. Copy the SHA-1 fingerprint shown there.

---

## iOS OAuth Client ID

1. **Create credentials** → **OAuth client ID**.
2. **Application type:** iOS.
3. **Name:** e.g. `StudioBuda ArtHub - iOS`.
4. **Bundle ID:** `com.studiobuda.arthub`
5. Click **Create**.
6. Add the Client ID to `.env`:

   ```env
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
   ```

No SHA-1 is required for iOS – the Bundle ID is enough.
