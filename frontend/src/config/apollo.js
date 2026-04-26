import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRAPHQL_ENDPOINT, STORAGE_KEYS } from '../utils/constants';

let authFailureHandler = null;
let isAuthFailureHandling = false;

export const setApolloAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
};

const invokeAuthFailureHandler = async () => {
  if (!authFailureHandler || isAuthFailureHandling) {
    return;
  }

  isAuthFailureHandling = true;
  try {
    await authFailureHandler();
  } catch (error) {
    console.error('[APOLLO] ❌ Auth failure handler threw:', error);
  } finally {
    // Small debounce window to avoid repeated logout calls from concurrent queries.
    setTimeout(() => {
      isAuthFailureHandling = false;
    }, 1000);
  }
};

// Create HTTP link
console.log('[APOLLO] 🔗 Creating HTTP link with endpoint:', GRAPHQL_ENDPOINT);
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
  // Add error handling to see connection issues
  fetch: async (uri, options) => {
    console.log('[APOLLO] 📡 Making request to:', uri);
    console.log('[APOLLO] 📡 Request options:', {
      method: options?.method,
      headers: options?.headers ? Object.keys(options.headers) : 'none',
    });
    
    try {
      const response = await fetch(uri, options);
      console.log('[APOLLO] ✅ Response status:', response.status, response.statusText);
      if (!response.ok) {
        console.error('[APOLLO] ❌ Response not OK:', response.status, response.statusText);
        const text = await response.text();
        console.error('[APOLLO] ❌ Response body:', text.substring(0, 200));
      }
      return response;
    } catch (error) {
      console.error('[APOLLO] ❌ Network error:', error.message);
      console.error('[APOLLO] ❌ Error details:', error);
      console.error('[APOLLO] ❌ Failed to connect to:', uri);
      console.error('[APOLLO] ❌ Make sure:');
      console.error('[APOLLO]    1. Backend is running (default port 4000, or EXPO_PUBLIC_GRAPHQL_URL)');
      console.error('[APOLLO]    2. Your phone and computer are on the same Wi-Fi network');
      console.error('[APOLLO]    3. Firewall allows the backend port');
      throw error;
    }
  },
});

// Create auth link to attach token to requests
const authLink = setContext(async (_, { headers }) => {
  console.log('[APOLLO] 🚀 authLink called!');
  try {
    console.log('[APOLLO] 🔐 Getting token for GraphQL request...');
    
    // First, try to get token from AsyncStorage (fastest, always works)
    let token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    console.log('[APOLLO] Stored token from AsyncStorage:', token ? `Found (length: ${token.length})` : 'Not found');
    
    // Then try to get a fresh ID token (Firebase uses long-lived refresh tokens; ID tokens are ~1h)
    try {
      const { getFirebaseAuth } = await import('./firebaseAuth');
      const firebaseAuthInstance = await getFirebaseAuth();
      const currentUser = firebaseAuthInstance.currentUser;
      console.log('[APOLLO] Current Firebase user:', !!currentUser);
      if (currentUser) {
        console.log('[APOLLO] 🔄 Getting fresh ID token from Firebase user...');
        try {
          const freshToken = await currentUser.getIdToken();
          console.log('[APOLLO] ✅ Got fresh ID token from Firebase, length:', freshToken?.length);
          if (freshToken && freshToken.length > 100) {
            token = freshToken;
            const rem = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
            const usePersistentStorage = rem !== '0' && rem !== 'false';
            if (usePersistentStorage) {
              await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
              console.log('[APOLLO] ✅ Updated stored token with fresh ID token');
            } else {
              console.log('[APOLLO] Session-only: keeping refreshed ID token in memory (not on disk)');
            }
          }
        } catch (tokenError) {
          console.warn('[APOLLO] ⚠️ Failed to get fresh token from Firebase, using stored token:', tokenError.message);
        }
      } else {
        console.log('[APOLLO] ⚠️ No Firebase currentUser, using stored token (ensure RN auth persistence is enabled)');
      }
    } catch (firebaseError) {
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

const isAuthLikeGraphQLError = (err) => {
  const message = (err?.message || '').toLowerCase();
  const code = (err?.extensions?.code || '').toUpperCase();
  return (
    message.includes('authentication required') ||
    message.includes('invalid or expired token') ||
    message.includes('authentication failed') ||
    message.includes('insufficient permissions') ||
    message.includes('user account is incomplete') ||
    message.includes('try signing in again') ||
    message.includes('incomplete. please try signing') ||
    code === 'UNAUTHENTICATED' ||
    code === 'AUTHENTICATION_ERROR'
  );
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const hasAuthGraphQLError = Array.isArray(graphQLErrors) && graphQLErrors.some(isAuthLikeGraphQLError);

  const networkStatusCode = networkError?.statusCode || networkError?.status;
  const hasAuthNetworkError = networkStatusCode === 401;

  if (hasAuthGraphQLError || hasAuthNetworkError) {
    console.warn('[APOLLO] ⚠️ Authentication error detected, triggering logout');
    invokeAuthFailureHandler();
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
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
