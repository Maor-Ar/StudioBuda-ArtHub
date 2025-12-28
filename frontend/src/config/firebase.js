/**
 * Firebase Configuration for React Native
 *
 * This file initializes Firebase for use with expo-auth-session OAuth flows.
 * For production, replace placeholder values with actual Firebase project credentials.
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "studiobuda-arthub.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "studiobuda-arthub",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "studiobuda-arthub.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

/**
 * OAuth Configuration
 * These values must be configured in the Firebase Console and respective provider dashboards
 */
export const oAuthConfig = {
  google: {
    // Get these from Google Cloud Console
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  },
  facebook: {
    // Get this from Facebook Developers Console
    appId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID",
  },
  apple: {
    // Apple Sign In uses the bundle identifier from app.json
    // No additional configuration needed here
  },
};
