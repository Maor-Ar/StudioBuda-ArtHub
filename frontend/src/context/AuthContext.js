import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../utils/constants';

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
  if (firebaseApp !== null) return; // null means we tried and failed, undefined means not tried yet
  try {
    // Import Firebase modules
    let firebaseModule, firebaseAuthModule;
    
    if (Platform.OS === 'web') {
      // On web, try to use the pre-loaded modules if available
      if (firebaseAppModule && firebaseAuthModule) {
        console.log('[AUTH] Using pre-loaded Firebase imports (web)');
        firebaseModule = await firebaseAppModule;
        firebaseAuthModule = await firebaseAuthModule;
      } else {
        console.log('[AUTH] Using direct dynamic Firebase imports (web)');
        firebaseModule = await import('firebase/app');
        firebaseAuthModule = await import('firebase/auth');
      }
    } else {
      console.log('[AUTH] Using dynamic Firebase imports (native)');
      firebaseModule = await safeImport('firebase/app');
      firebaseAuthModule = await safeImport('firebase/auth');
    }
    
    // Import config file (this is a local file, not a module)
    const { firebaseConfig } = await import('../config/firebase');
    
    console.log('[AUTH] Firebase config check:', {
      hasApiKey: !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY',
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });
    
    if (firebaseModule.getApps().length === 0) {
      console.log('[AUTH] Initializing Firebase app...');
      try {
        firebaseApp = firebaseModule.initializeApp(firebaseConfig);
        console.log('[AUTH] ✅ Firebase app initialized successfully');
      } catch (initError) {
        console.error('[AUTH] ❌ Firebase app initialization failed:', initError.message);
        throw initError;
      }
    } else {
      firebaseApp = firebaseModule.getApp();
      console.log('[AUTH] ✅ Using existing Firebase app');
    }
    
    try {
      firebaseAuth = firebaseAuthModule.getAuth(firebaseApp);
      console.log('[AUTH] ✅ Firebase Auth initialized successfully');
    } catch (authError) {
      console.error('[AUTH] ❌ Firebase Auth initialization failed:', authError.message);
      throw authError;
    }
  } catch (error) {
    // Firebase not available - set to null to indicate we tried
    console.warn('[AUTH] ⚠️ Firebase not available:', error.message);
    console.warn('[AUTH] Token exchange will not work. You may need to configure Firebase API keys.');
    firebaseApp = null;
    firebaseAuth = null;
    // Don't throw - allow app to continue without Firebase
  }
};

// Create the AuthContext
const AuthContext = createContext({
  user: null,
  token: null,
  transactions: [],
  isLoading: true,
  isAuthenticated: false,
  login: async (token, userData, transactions) => {},
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

  const login = async (customToken, userData, activeTransactions = []) => {
    console.log('[AUTH] 🔐 Starting login process...');
    console.log('[AUTH] Custom token length:', customToken?.length);
    console.log('[AUTH] Custom token preview:', customToken?.substring(0, 50) + '...');
    
    try {
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
      
      // Store token (ID token if available, otherwise custom token), user data, and transactions
      console.log('[AUTH] 💾 Storing token (type:', idToken === customToken ? 'CUSTOM' : 'ID', ', length:', idToken?.length, ')');
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TRANSACTIONS, JSON.stringify(filteredTransactions));

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
      
      // Clear stored data
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
        // Update stored token
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
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
    
    // Update stored user data
    AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser))
      .catch(error => console.error('Failed to update stored user:', error));
  };

  const updateTransactions = (newTransactions) => {
    // Filter only active transactions
    const filteredTransactions = newTransactions.filter(t => t.isActive);
    setTransactions(filteredTransactions);
    
    // Update stored transactions
    AsyncStorage.setItem(STORAGE_KEYS.USER_TRANSACTIONS, JSON.stringify(filteredTransactions))
      .catch(error => console.error('Failed to update stored transactions:', error));
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




