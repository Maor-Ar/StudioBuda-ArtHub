# How to Build APK for Testing

## App icon (first-time setup)

Before building, generate the app icon and favicon from `icon_sticker_purple_and_pink.svg`:

```bash
npm run generate-icon
```

This creates `assets/images/icon.png` (Android/iOS), `adaptive-icon.png` (Android), and `favicon.png` (web).

## Option 1: EAS Build (Recommended - Easiest)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```
   (Create free account at https://expo.dev if needed)

3. Build APK:
   ```bash
   npm run build:apk
   ```
   or
   ```bash
   eas build --platform android --profile preview
   ```

4. Wait for build to complete (5-15 minutes)
5. Download APK from the link provided

## Option 2: Local Build (Advanced)

If you want to build locally without cloud:

1. First, ensure Android SDK is installed
2. Run prebuild:
   ```bash
   npx expo prebuild --platform android
   ```
3. Build APK:
   ```bash
   cd android
   .\gradlew.bat assembleRelease
   ```
4. APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Quick Start (EAS Build)

Just run these commands:
```bash
npm install -g eas-cli
eas login
npm run build:apk
```
