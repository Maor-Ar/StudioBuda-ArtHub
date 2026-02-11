/**
 * Firebase Configuration for React Native
 *
 * This file initializes Firebase for use with expo-auth-session OAuth flows.
 * For production, replace placeholder values with actual Firebase project credentials.
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBU19U0qOzDs498W7C11-qA4NuUSQ0tuGw",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "studiobuda-arthub.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "studiobuda-arthub",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "studiobuda-arthub.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "102013040020",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:102013040020:web:a773d91232908f2bb44b81",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-YDRVLT5Z1J",
};

/**
 * OAuth Configuration - Same for dev and prod (no env-based variation)
 * Set EXPO_PUBLIC_GOOGLE_* in .env for all environments
 */
// Web client ID from google-services.json - fallback when env not set
const GOOGLE_WEB_FALLBACK = "102013040020-on89le0901sibnbho24bdkjvenjt0q34.apps.googleusercontent.com";
const isPlaceholder = (id) => !id || id.startsWith("YOUR_");

// Android: use debug client in dev, production client in prod builds
const androidProd = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const androidDebug = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_DEBUG_CLIENT_ID;
const getAndroidClientId = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && androidDebug && !isPlaceholder(androidDebug)) {
    return androidDebug;
  }
  return isPlaceholder(androidProd) ? GOOGLE_WEB_FALLBACK : androidProd;
};

export const oAuthConfig = {
  google: {
    iosClientId: isPlaceholder(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ? GOOGLE_WEB_FALLBACK : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: getAndroidClientId(),
    webClientId: isPlaceholder(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ? GOOGLE_WEB_FALLBACK : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
