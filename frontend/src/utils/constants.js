import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Helper function to get the correct API URL based on platform
const getGraphQLEndpoint = () => {
  if (!__DEV__) {
    return 'https://studiobuda-backend-873405578260.me-west1.run.app/graphql';
  }

  // For web, use localhost
  if (Platform.OS === 'web') {
    const endpoint = 'http://localhost:4000/graphql';
    console.log('[CONSTANTS] 🌐 Web platform - using endpoint:', endpoint);
    return endpoint;
  }

  // For mobile (iOS/Android), try multiple methods to detect the IP
  console.log('[CONSTANTS] 📱 Mobile platform detected');
  console.log('[CONSTANTS] Constants.expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));
  
  // Method 1: Try hostUri (most common)
  if (Constants.expoConfig?.hostUri) {
    const hostUri = Constants.expoConfig.hostUri;
    console.log('[CONSTANTS] 📱 Method 1 - Detected hostUri:', hostUri);
    const ip = hostUri.split(':')[0];
    const endpoint = `http://${ip}:4000/graphql`;
    console.log('[CONSTANTS] ✅ Using endpoint from hostUri:', endpoint);
    return endpoint;
  }

  // Method 2: Try debuggerHost
  if (Constants.expoConfig?.debuggerHost) {
    const debuggerHost = Constants.expoConfig.debuggerHost;
    console.log('[CONSTANTS] 📱 Method 2 - Detected debuggerHost:', debuggerHost);
    const ip = debuggerHost.split(':')[0];
    const endpoint = `http://${ip}:4000/graphql`;
    console.log('[CONSTANTS] ✅ Using endpoint from debuggerHost:', endpoint);
    return endpoint;
  }

  // Method 3: Try manifest2.extra.expoClient.hostUri
  if (Constants.manifest2?.extra?.expoClient?.hostUri) {
    const hostUri = Constants.manifest2.extra.expoClient.hostUri;
    console.log('[CONSTANTS] 📱 Method 3 - Detected manifest2 hostUri:', hostUri);
    const ip = hostUri.split(':')[0];
    const endpoint = `http://${ip}:4000/graphql`;
    console.log('[CONSTANTS] ✅ Using endpoint from manifest2:', endpoint);
    return endpoint;
  }

  // Method 4: Try to extract from the Expo dev server URL in the terminal
  // This is a fallback - we'll use the IP from the Expo terminal output
  // The user should see the IP in their Expo terminal (e.g., "exp://192.168.15.238:8081")
  // For now, we'll use a common development IP pattern
  console.warn('[CONSTANTS] ⚠️ Could not auto-detect IP. Please check your Expo terminal for the IP address.');
  console.warn('[CONSTANTS] ⚠️ Look for a line like: "Metro waiting on exp://192.168.X.X:8081"');
  console.warn('[CONSTANTS] ⚠️ You can manually set the IP by creating a .env file with: EXPO_PUBLIC_API_IP=192.168.X.X');
  
  // Try environment variable as last resort
  if (process.env.EXPO_PUBLIC_API_IP) {
    const ip = process.env.EXPO_PUBLIC_API_IP;
    const endpoint = `http://${ip}:4000/graphql`;
    console.log('[CONSTANTS] ✅ Using endpoint from EXPO_PUBLIC_API_IP:', endpoint);
    return endpoint;
  }

  // Final fallback: use localhost (will only work on emulator/simulator, not physical device)
  console.error('[CONSTANTS] ❌ Could not detect IP. Using localhost (will NOT work on physical devices)');
  const fallbackEndpoint = 'http://localhost:4000/graphql';
  console.log('[CONSTANTS] 📱 Fallback endpoint:', fallbackEndpoint);
  return fallbackEndpoint;
};

// API Configuration
export const GRAPHQL_ENDPOINT = getGraphQLEndpoint();

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@studiobuda:auth_token',
  USER_DATA: '@studiobuda:user_data',
  USER_TRANSACTIONS: '@studiobuda:user_transactions',
};

// Event Types
export const EVENT_TYPES = {
  TRIAL: 'trial',
  SUBSCRIPTION_ONLY: 'subscription_only',
  PAID_WORKSHOP: 'paid_workshop',
};

// Transaction Types
export const TRANSACTION_TYPES = {
  SUBSCRIPTION: 'subscription',
  PUNCH_CARD: 'punch_card',
  TRIAL_LESSON: 'trial_lesson',
};

// User Roles
export const USER_ROLES = {
  USER: 'user',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

// OAuth Providers
export const OAUTH_PROVIDERS = {
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  APPLE: 'apple',
};

// Products (hardcoded for now - can be moved to config/API later)
export const PRODUCTS = [
  {
    id: 'subscription-4-monthly',
    name: 'מנוי 4 כניסות בחודש',
    description: '4 כניסות לסטודיו, בתוקף לחודש אחד',
    type: TRANSACTION_TYPES.SUBSCRIPTION,
    price: 330,
    monthlyEntries: 4,
    terms: `* המנוי כולל 4 כניסות לסטודיו, בתוקף לחודש אחד מיום התשלום.
	• הכניסות מיועדות לשימוש בתוך תקופת החודש בלבד ואינן נצברות או עוברות לחודש הבא.
	• ניתן לבטל את המנוי בכל שלב, והביטול ייכנס לתוקף מהחיוב הבא שטרם בוצע.
	• לאחר ביצוע תשלום חודשי, לא יתבצע החזר כספי עבור אותו חודש.
	• המנוי הוא אישי ואינו ניתן להעברה.
* ביטול הגעה יתאפשר עד 5 שעות לפני תחילת השיעור. ביטול מאוחר ייחשב ככניסה מנוצלת.
* הסטודיו שומר לעצמו את הזכות לבצע שינויים בלו"ז או במדריכים/ות במקרה הצורך.`,
  },
  {
    id: 'subscription-6-monthly',
    name: 'מנוי 6 כניסות בחודש',
    description: '6 כניסות לסטודיו, בתוקף לחודש אחד',
    type: TRANSACTION_TYPES.SUBSCRIPTION,
    price: 460,
    monthlyEntries: 6,
    terms: `* המנוי כולל 6 כניסות לסטודיו, בתוקף לחודש אחד מיום התשלום.
	• הכניסות מיועדות לשימוש בתוך תקופת החודש בלבד ואינן נצברות או עוברות לחודש הבא.
	• ניתן לבטל את המנוי בכל שלב, והביטול ייכנס לתוקף מהחיוב הבא שטרם בוצע.
	• לאחר ביצוע תשלום חודשי, לא יתבצע החזר כספי עבור אותו חודש.
	• המנוי הוא אישי ואינו ניתן להעברה.
* ביטול הגעה יתאפשר עד 5 שעות לפני תחילת השיעור. ביטול מאוחר ייחשב ככניסה מנוצלת.
* הסטודיו שומר לעצמו את הזכות לבצע שינויים בלו"ז או במדריכים/ות במקרה הצורך.`,
  },
  {
    id: 'subscription-unlimited',
    name: 'מנוי ללא הגבלה',
    description: 'כניסות ללא הגבלה, בתוקף לחודש אחד',
    type: TRANSACTION_TYPES.SUBSCRIPTION,
    price: 520,
    monthlyEntries: 99, // Placeholder for unlimited
    terms: `* המנוי כולל כניסות ללא הגבלה לסטודיו, בתוקף לחודש אחד מיום התשלום.
	• הכניסות מיועדות לשימוש בתוך תקופת החודש בלבד ואינן נצברות או עוברות לחודש הבא.
	• ניתן לבטל את המנוי בכל שלב, והביטול ייכנס לתוקף מהחיוב הבא שטרם בוצע.
	• לאחר ביצוע תשלום חודשי, לא יתבצע החזר כספי עבור אותו חודש.
	• המנוי הוא אישי ואינו ניתן להעברה.
* ביטול הגעה יתאפשר עד 5 שעות לפני תחילת השיעור. ביטול מאוחר ייחשב ככניסה מנוצלת.
* הסטודיו שומר לעצמו את הזכות לבצע שינויים בלו"ז או במדריכים/ות במקרה הצורך.`,
  },
  {
    id: 'punch-card-5',
    name: 'כרטיסיה חד פעמית 5 כניסות',
    description: '5 כניסות לסטודיו, בתוקף לחצי שנה',
    type: TRANSACTION_TYPES.PUNCH_CARD,
    price: 425,
    totalEntries: 5,
    validityMonths: 6,
    terms: `* הכרטיסיה כוללת 5 כניסות לסטודיו, בתוקף לחצי שנה מיום התשלום.
* הכרטיסיה הינה אישית ואינה ניתנת להעברה.
* ביטול הגעה יתאפשר עד 5 שעות לפני תחילת השיעור. ביטול מאוחר יחשב ככניסה מנוצלת.
* הסטודיו שומר לעצמו את הזכות לבצע שינויים בלו"ז או במדריכים/ות במקרה הצורך.`,
  },
];

