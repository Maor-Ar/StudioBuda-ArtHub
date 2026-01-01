import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GRAPHQL_ENDPOINT, STORAGE_KEYS } from '../utils/constants';

// Try static import for web
let firebaseAppModuleStatic = null;
let firebaseAuthModuleStatic = null;
if (Platform.OS === 'web') {
  try {
    firebaseAppModuleStatic = require('firebase/app');
    firebaseAuthModuleStatic = require('firebase/auth');
  } catch (e) {
    // Ignore - will use dynamic import
  }
}

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Create auth link to attach token to requests
const authLink = setContext(async (_, { headers }) => {
  console.log('[APOLLO] 🚀 authLink called!');
  try {
    console.log('[APOLLO] 🔐 Getting token for GraphQL request...');
    
    // First, try to get token from AsyncStorage (fastest, always works)
    let token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    console.log('[APOLLO] Stored token from AsyncStorage:', token ? `Found (length: ${token.length})` : 'Not found');
    
    // Then try to get fresh token from Firebase Auth if available
    let firebaseAuthInstance = null;
    try {
      let firebaseAuthModule, firebaseAppModule;
      
      if (Platform.OS === 'web' && firebaseAuthModuleStatic && firebaseAppModuleStatic) {
        console.log('[APOLLO] Using static Firebase imports (web)');
        firebaseAuthModule = firebaseAuthModuleStatic;
        firebaseAppModule = firebaseAppModuleStatic;
      } else {
        console.log('[APOLLO] Using dynamic Firebase imports');
        firebaseAuthModule = await import('firebase/auth');
        firebaseAppModule = await import('firebase/app');
      }
      
      const apps = firebaseAppModule.getApps();
      console.log('[APOLLO] Firebase apps count:', apps.length);
      if (apps.length > 0) {
        firebaseAuthInstance = firebaseAuthModule.getAuth(apps[0]);
        console.log('[APOLLO] ✅ Firebase Auth instance obtained');
        
        const currentUser = firebaseAuthInstance.currentUser;
        console.log('[APOLLO] Current Firebase user:', !!currentUser);
        
        if (currentUser) {
          // Get fresh ID token (Firebase automatically refreshes if expired)
          console.log('[APOLLO] 🔄 Getting fresh ID token from Firebase user...');
          try {
            const freshToken = await currentUser.getIdToken();
            console.log('[APOLLO] ✅ Got fresh ID token from Firebase, length:', freshToken?.length);
            // Use fresh token if we got one
            if (freshToken && freshToken.length > 100) {
              token = freshToken;
              // Update stored token
              await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
              console.log('[APOLLO] ✅ Updated stored token with fresh ID token');
            }
          } catch (tokenError) {
            console.warn('[APOLLO] ⚠️ Failed to get fresh token from Firebase, using stored token:', tokenError.message);
            // Continue with stored token
          }
        } else {
          console.log('[APOLLO] ⚠️ No Firebase currentUser, using stored token');
        }
      }
    } catch (firebaseError) {
      // Firebase not available, will use stored token
      console.warn('[APOLLO] ⚠️ Firebase not available in apolloClient, using stored token:', firebaseError.message);
    }
    
    // Validate token before sending
    // Note: ID tokens from Firebase are typically 900-1000 chars, custom tokens are ~800 chars
    // If we got the token from Firebase getIdToken(), it's definitely an ID token
    if (token) {
      const tokenPreview = token.substring(0, 50);
      console.log('[APOLLO] ✅ Using token, preview:', tokenPreview + '...');
    } else {
      console.warn('[APOLLO] ⚠️ No token available to send');
    }
    
    const authHeader = token ? `Bearer ${token}` : '';
    console.log('[APOLLO] Sending authorization header:', authHeader ? `Bearer ${token.substring(0, 20)}...` : 'NONE');
    
    return {
      headers: {
        ...headers,
        authorization: authHeader,
      },
    };
  } catch (error) {
    // If everything fails, try to use stored token as last resort
    console.error('[APOLLO] ❌ Error in authLink:', error);
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (storedToken) {
        console.log('[APOLLO] Using stored token as fallback');
        return {
          headers: {
            ...headers,
            authorization: `Bearer ${storedToken}`,
          },
        };
      }
    } catch (fallbackError) {
      console.error('[APOLLO] ❌ Fallback also failed:', fallbackError);
    }
    return { headers };
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          events: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          myRegistrations: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          myTransactions: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default client;
