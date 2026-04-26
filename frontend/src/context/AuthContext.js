import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../utils/constants';

const shouldPersistAuthToDisk = async () => {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  return v !== '0' && v !== 'false';
};

// Import Firebase (static import for better bundler support)
let firebaseApp = null;
let firebaseAuth = null;

// For web, try static import; for native, use dynamic import
let firebaseAppModule = null;
let firebaseAuthModule = null;

// Try to import Firebase statically on web (works better with webpack)
// Use conditional import that works in both environments
if (Platform.OS === 'web') {
  try {
    // For web, use dynamic import but wrapped to work with webpack
    // This will be evaluated at runtime
    const importFirebase = async () => {
      const app = await import('firebase/app');
      const auth = await import('firebase/auth');
      return { app, auth };
    };
    // Store the promise for later use
    firebaseAppModule = importFirebase().then(m => m.app).catch(() => null);
    firebaseAuthModule = importFirebase().then(m => m.auth).catch(() => null);
  } catch (e) {
    console.warn('[AUTH] Static Firebase import setup failed on web:', e.message);
  }
}

// Helper to safely import Firebase modules
const safeImport = async (modulePath) => {
  try {
    // On web, if we have static imports, use them
    if (Platform.OS === 'web') {
      if (modulePath === 'firebase/app' && firebaseAppModule) {
        return firebaseAppModule;
      }
      if (modulePath === 'firebase/auth' && firebaseAuthModule) {
        return firebaseAuthModule;
      }
      // Fallback to dynamic import
    }
    
    // Use dynamic import for native or as fallback
    const importFunc = eval(`(specifier) => import(specifier)`);
    return await importFunc(modulePath);
  } catch (error) {
    throw error;
  }
};

const initializeFirebase = async () => {
  if (firebaseApp !== null && firebaseAuth !== null) return;
  try {
    const { ensureFirebase } = await import('../config/firebaseAuth');
    const { app, auth: authInstance } = await ensureFirebase();
    firebaseApp = app;
    firebaseAuth = authInstance;
    console.log('[AUTH] ✅ Firebase (singleton with RN persistence) ready');
  } catch (error) {
    console.warn('[AUTH] ⚠️ Firebase not available:', error.message);
    console.warn('[AUTH] Token exchange will not work. You may need to configure Firebase API keys.');
    firebaseApp = null;
    firebaseAuth = null;
  }
};

// Create the AuthContext
const AuthContext = createContext({
  user: null,
  token: null,
  transactions: [],
  isLoading: true,
  isAuthenticated: false,
  login: async (token, userData, transactions, options) => {},
  logout: async () => {},
  updateUser: (userData) => {},
  updateTransactions: (transactions) => {},
});

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      if (!(await shouldPersistAuthToDisk())) {
        try {
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.USER_DATA,
            STORAGE_KEYS.USER_TRANSACTIONS,
          ]);
        } catch (e) {
          /* ignore */
        }
        return;
      }

      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const storedTransactions = await AsyncStorage.getItem(STORAGE_KEYS.USER_TRANSACTIONS);

      if (storedToken && storedUser) {
        // Validate that the stored token is an ID token (not a custom token)
        // Custom tokens can't be verified by Firebase Auth client, so if we can't
        // get a current user, it's likely a custom token and should be cleared
        // Try to validate token with Firebase, but don't fail if Firebase isn't available
        try {
          await initializeFirebase();
          if (firebaseAuth) {
            const currentUser = firebaseAuth.currentUser;
            
            // If we have a Firebase user, get a fresh ID token
            if (currentUser) {
              try {
                const freshToken = await currentUser.getIdToken();
                
                // Load user data with fresh token
                setToken(freshToken);
                setUser(JSON.parse(storedUser));
                if (storedTransactions) {
                  setTransactions(JSON.parse(storedTransactions));
                }
                
                // Update stored token with fresh ID token
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, freshToken);
                return; // Successfully loaded with Firebase
              } catch (tokenError) {
                console.warn('Failed to get fresh token, using stored token:', tokenError);
              }
            }
          }
        } catch (firebaseError) {
          // Firebase not available or failed - continue with stored token
          console.warn('Firebase validation failed, using stored token:', firebaseError.message);
        }
        
        // Fallback: Use stored token (might be custom token, but will work for now)
        // The backend will handle validation
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions));
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (customToken, userData, activeTransactions = [], { rememberMe = true } = {}) => {
    console.log('[AUTH] 🔐 Starting login process...', { rememberMe });
    console.log('[AUTH] Custom token length:', customToken?.length);
    console.log('[AUTH] Custom token preview:', customToken?.substring(0, 50) + '...');
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe ? '1' : '0');
      const { resetFirebaseClient } = await import('../config/firebaseAuth');
      await resetFirebaseClient();
      firebaseApp = null;
      firebaseAuth = null;

      let idToken = customToken; // Fallback to custom token if Firebase fails
      
      // Try to initialize Firebase and exchange token
      try {
        console.log('[AUTH] 🔥 Initializing Firebase...');
        await initializeFirebase();
        console.log('[AUTH] Firebase initialized, firebaseAuth:', !!firebaseAuth);
        
        if (firebaseAuth) {
          console.log('[AUTH] 🔄 Exchanging custom token for ID token...');
          // Exchange custom token for ID token using Firebase Auth
          const firebaseAuthModule = await safeImport('firebase/auth');
          const { signInWithCustomToken } = firebaseAuthModule;
          
          // Sign in with custom token
          console.log('[AUTH] Calling signInWithCustomToken...');
          const userCredential = await signInWithCustomToken(firebaseAuth, customToken);
          console.log('[AUTH] ✅ Sign in successful, user:', !!userCredential?.user);
          
          // Verify we got a user
          if (userCredential && userCredential.user) {
            // Get ID token (this is what the backend expects)
            console.log('[AUTH] Getting ID token from user...');
            idToken = await userCredential.user.getIdToken();
            console.log('[AUTH] ✅ ID token received, length:', idToken?.length);
            console.log('[AUTH] ID token preview:', idToken?.substring(0, 50) + '...');
            
            // Validate we got an ID token (should be a JWT string)
            if (!idToken || typeof idToken !== 'string' || idToken.length < 100) {
              console.warn('[AUTH] ⚠️ Invalid ID token received, using custom token as fallback');
              idToken = customToken;
            } else {
              console.log('[AUTH] ✅ Successfully exchanged custom token for ID token');
            }
          } else {
            console.warn('[AUTH] ⚠️ No user credential returned from signInWithCustomToken');
          }
        } else {
          console.warn('[AUTH] ⚠️ Firebase Auth not initialized');
        }
      } catch (firebaseError) {
        // Firebase not available or failed - use custom token as fallback
        console.error('[AUTH] ❌ Firebase token exchange failed:', firebaseError);
        console.error('[AUTH] Error details:', {
          message: firebaseError.message,
          code: firebaseError.code,
          stack: firebaseError.stack
        });
        console.warn('[AUTH] ⚠️ Using custom token as fallback');
        idToken = customToken;
      }
      
      // Filter only active transactions (subscriptions and punch cards)
      const filteredTransactions = activeTransactions.filter(t => t.isActive);
      
      console.log('[AUTH] 💾 Storing token (type:', idToken === customToken ? 'CUSTOM' : 'ID', ', length:', idToken?.length, ')', 'persistDisk:', rememberMe);
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TRANSACTIONS, JSON.stringify(filteredTransactions));
      } else {
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_TRANSACTIONS);
        } catch (e) {
          /* ignore */
        }
      }

      // Update state
      setToken(idToken);
      setUser(userData);
      setTransactions(filteredTransactions);
      console.log('[AUTH] ✅ Login completed successfully');
    } catch (error) {
      console.error('Failed to store auth data:', error);
      // Clear any partial data on error
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch (clearError) {
        // Ignore clear errors
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Firebase if initialized
      try {
        await initializeFirebase();
        if (firebaseAuth) {
          const firebaseAuthModule = await safeImport('firebase/auth');
          await firebaseAuthModule.signOut(firebaseAuth);
        }
      } catch (firebaseError) {
        // If Firebase isn't available, continue with logout anyway
        console.warn('Firebase sign out failed, continuing with local logout:', firebaseError);
      }

      const { resetFirebaseClient } = await import('../config/firebaseAuth');
      await resetFirebaseClient();
      firebaseApp = null;
      firebaseAuth = null;
      
      // Clear stored data (keep REMEMBER_ME so next login can reuse the same choice)
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TRANSACTIONS);

      // Clear state
      setToken(null);
      setUser(null);
      setTransactions([]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  // Function to get fresh ID token (refreshes if needed)
  const getFreshToken = async () => {
    try {
      await initializeFirebase();
      if (!firebaseAuth) {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return storedToken;
      }
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken(true); // Force refresh
        if (await shouldPersistAuthToDisk()) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
        }
        setToken(idToken);
        return idToken;
      }
      // If no current user, return stored token
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return storedToken;
    } catch (error) {
      console.error('Failed to get fresh token:', error);
      // Fallback to stored token
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return storedToken;
    }
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    (async () => {
      if (await shouldPersistAuthToDisk()) {
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser))
          .catch((error) => console.error('Failed to update stored user:', error));
      }
    })();
  };

  const updateTransactions = (newTransactions) => {
    // Filter only active transactions
    const filteredTransactions = newTransactions.filter(t => t.isActive);
    setTransactions(filteredTransactions);

    (async () => {
      if (await shouldPersistAuthToDisk()) {
        AsyncStorage.setItem(STORAGE_KEYS.USER_TRANSACTIONS, JSON.stringify(filteredTransactions))
          .catch((error) => console.error('Failed to update stored transactions:', error));
      }
    })();
  };

  const value = {
    user,
    token,
    transactions,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
    updateTransactions,
    getFreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;




