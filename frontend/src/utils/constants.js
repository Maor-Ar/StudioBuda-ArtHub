import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Helper function to get the correct API URL based on platform
const getGraphQLEndpoint = () => {
  if (!__DEV__) {
    return 'https://your-production-url.com/graphql';
  }

  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:4000/graphql';
  }

  // For mobile (iOS/Android), use the Expo dev server's IP
  // Constants.expoConfig.hostUri gives us something like "192.168.1.100:8081"
  // We need to extract the IP and change the port to 4000
  if (Constants.expoConfig?.hostUri) {
    const hostUri = Constants.expoConfig.hostUri;
    // Extract IP address (remove port if present)
    const ip = hostUri.split(':')[0];
    return `http://${ip}:4000/graphql`;
  }

  // Fallback: use localhost (will only work on emulator/simulator, not physical device)
  console.warn('Could not detect Expo dev server IP. Using localhost. This may not work on physical devices.');
  return 'http://localhost:4000/graphql';
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

