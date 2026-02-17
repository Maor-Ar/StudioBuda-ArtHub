import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { OAUTH_PROVIDERS } from '../utils/constants';
import { oAuthConfig, firebaseConfig } from '../config/firebase';

// Firebase project 102013040020 (studiobuda-arthub) - OAuth client must match for id_token to be accepted
const FIREBASE_WEB_CLIENT_ID = '102013040020-on89le0901sibnbho24bdkjvenjt0q34.apps.googleusercontent.com';

// Enable warm-up for web browser on Android
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/** Generate a hex nonce for id_token flow (required by Google) */
async function generateNonce() {
  const bytes = new Uint8Array(16);
  Crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Lazy-load Firebase Auth for Google credential exchange
const getFirebaseAuth = async () => {
  const { getApps, initializeApp } = await import('firebase/app');
  const { getAuth, signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
  const apps = getApps();
  const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
  return { auth: getAuth(app), signInWithCredential, GoogleAuthProvider };
};

/**
 * AuthService - Handles OAuth authentication with Google and Apple
 *
 * This implementation uses Expo-compatible packages:
 * - expo-apple-authentication for Apple Sign In
 * - expo-auth-session for Google Sign In (Expo Go compatible)
 * Note: Facebook login is temporarily disabled
 */
class AuthService {
  /**
   * Sign in with Google using expo-auth-session
   * @returns {Promise<{token: string, email: string, name: string}>}
   */
  async signInWithGoogle() {
    try {
      // useProxy: false for consistent behavior across dev and prod (auth.expo.io proxy is deprecated)
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'studiobuda-arthub',
        useProxy: false,
      });

      // Use Firebase-authorized client ID for web (must match Firebase project 102013040020)
      const clientId = Platform.OS === 'web'
        ? FIREBASE_WEB_CLIENT_ID
        : Platform.select({
            ios: oAuthConfig.google.iosClientId,
            android: oAuthConfig.google.androidClientId,
            default: oAuthConfig.google.webClientId,
          });

      console.log('[AUTH_DEBUG] Google Sign-In: Platform=', Platform.OS, 'clientId=', clientId?.substring(0, 35) + '...', 'redirectUri=', redirectUri);

      // Google requires nonce when requesting id_token (OpenID Connect)
      const nonce = await generateNonce();

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: { nonce },
      });

      console.log('[AUTH_DEBUG] Opening auth popup...');
      const result = await request.promptAsync(GOOGLE_DISCOVERY, { useProxy: false });

      console.log('[AUTH_DEBUG] Google OAuth result type=', result.type);

      if (result.type === 'success') {
        // On web, expo-auth-session may put id_token in params (not authentication) for id_token flow
        const { authentication, params } = result;
        const idToken =
          authentication?.idToken ||
          authentication?.id_token ||
          authentication?.accessToken ||
          params?.id_token;

        if (!idToken) {
          console.error('[AUTH_DEBUG] No idToken in response. authentication:', !!authentication, 'params keys:', params ? Object.keys(params) : 'none');
          throw new Error('No token received from Google');
        }

        console.log('[AUTH_DEBUG] Google returned idToken, length=', idToken?.length);

        // Exchange Google credential for Firebase ID token (required by backend)
        try {
          const { auth, signInWithCredential, GoogleAuthProvider } = await getFirebaseAuth();
          const credential = GoogleAuthProvider.credential(idToken);
          
          if (!credential) {
            console.error('[AUTH_DEBUG] Failed to create Google credential from idToken');
            throw new Error('Failed to create authentication credential');
          }
          
          const userCredential = await signInWithCredential(auth, credential);
          
          // Edge case: Verify user credential was created successfully
          if (!userCredential || !userCredential.user) {
            console.error('[AUTH_DEBUG] Invalid user credential returned from Firebase');
            throw new Error('Failed to authenticate with Google');
          }
          
          const firebaseIdToken = await userCredential.user.getIdToken();

          // Edge case: Verify token was obtained
          if (!firebaseIdToken || firebaseIdToken.length < 100) {
            console.error('[AUTH_DEBUG] Invalid Firebase ID token received', { tokenLength: firebaseIdToken?.length });
            throw new Error('Failed to obtain authentication token');
          }

          console.log('[AUTH_DEBUG] Firebase ID token obtained, length=', firebaseIdToken?.length);

          // Edge case: Handle missing email/name (rare but possible)
          const userEmail = userCredential.user.email || '';
          const userName = userCredential.user.displayName || '';
          
          if (!userEmail) {
            console.warn('[AUTH_DEBUG] Firebase user missing email - backend will handle fallback');
          }

          return {
            token: firebaseIdToken,
            email: userEmail,
            name: userName,
            provider: OAUTH_PROVIDERS.GOOGLE,
          };
        } catch (firebaseError) {
          console.error('[AUTH_DEBUG] Firebase credential exchange failed:', firebaseError);
          
          // Provide more specific error messages
          const errorMessage = firebaseError?.message || String(firebaseError);
          if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          } else if (errorMessage.includes('auth/network-request-failed')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          } else if (errorMessage.includes('auth/invalid-credential')) {
            throw new Error('Invalid authentication credentials. Please try signing in again.');
          }
          
          throw new Error('Failed to sign in with Google. Please try again.');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled');
      } else {
        throw new Error('Failed to sign in with Google');
      }
    } catch (error) {
      const msg = error?.message || String(error);
      console.error('[AUTH_DEBUG] Google sign in error:', msg, error);

      if (msg.includes('cancelled') || msg.includes('canceled')) {
        throw new Error('Google sign-in was cancelled');
      }

      // On web, popup blockers can prevent the auth window from opening
      if (Platform.OS === 'web' && (msg.includes('popup') || msg.includes('blocked') || msg.includes('window'))) {
        throw new Error('אנא אפשר חלונות קופצים (popups) עבור אתר זה ונסה שוב');
      }

      throw new Error('Failed to sign in with Google. Please try again.');
    }
  }

  /**
   * Sign in with Facebook
   * @returns {Promise<{token: string, email: string, name: string}>}
   */
  async signInWithFacebook() {
    try {
      // Initialize Facebook SDK
      await Facebook.initializeAsync({
        appId: oAuthConfig.facebook.appId,
        appName: 'StudioBuda ArtHub',
      });

      // Login with permissions
      const result = await Facebook.logInWithReadPermissionsAsync({
        permissions: ['public_profile', 'email'],
      });

      if (result.type === 'success') {
        const { token } = result;

        // Fetch user data from Facebook Graph API
        const response = await fetch(
          `https://graph.facebook.com/me?access_token=${token}&fields=id,name,email,picture.type(large)`
        );
        const userData = await response.json();

        return {
          token: token,
          email: userData.email,
          name: userData.name || '',
          provider: OAUTH_PROVIDERS.FACEBOOK,
          facebookUserId: userData.id,
        };
      } else if (result.type === 'cancel') {
        throw new Error('Facebook login was cancelled');
      } else {
        throw new Error('Facebook login failed');
      }
    } catch (error) {
      console.error('Facebook sign in error:', error);

      if (error.message.includes('cancelled')) {
        throw new Error('Facebook login was cancelled');
      }

      throw new Error('Failed to sign in with Facebook. Please try again.');
    }
  }

  /**
   * Sign in with Apple
   * @returns {Promise<{token: string, email: string, name: string}>}
   */
  async signInWithApple() {
    try {
      // Check if Apple Authentication is available (iOS 13+)
      const isAvailable = await AppleAuthentication.isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }

      // Request Apple Authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract user information
      const { identityToken, email, fullName } = credential;

      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Construct full name from Apple's name components
      let name = '';
      if (fullName) {
        const firstName = fullName.givenName || '';
        const lastName = fullName.familyName || '';
        name = `${firstName} ${lastName}`.trim();
      }

      return {
        token: identityToken,
        email: email || '', // Email might be null if user chooses to hide it
        name: name,
        provider: OAUTH_PROVIDERS.APPLE,
        appleUserId: credential.user,
      };
    } catch (error) {
      console.error('Apple sign in error:', error);

      // Handle specific error cases
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple sign-in was cancelled');
      }

      throw new Error('Failed to sign in with Apple. Please try again.');
    }
  }

  /**
   * Get OAuth token for a specific provider
   * @param {string} provider - The OAuth provider (google, facebook, apple)
   * @returns {Promise<{token: string, email: string, name: string, provider: string}>}
   */
  async getOAuthToken(provider) {
    switch (provider) {
      case OAUTH_PROVIDERS.GOOGLE:
        return await this.signInWithGoogle();
      case OAUTH_PROVIDERS.FACEBOOK:
        throw new Error('Facebook login is currently unavailable. Please use Google or Apple sign in.');
      case OAUTH_PROVIDERS.APPLE:
        return await this.signInWithApple();
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Sign out from Google
   */
  async signOutGoogle() {
    try {
      // Google sign out with expo-auth-session is handled by revoking the token
      // This would require storing the token, which we don't do for security
      console.log('Google sign out - token should be revoked on backend');
    } catch (error) {
      console.error('Google sign out error:', error);
    }
  }

  /**
   * Sign out from Facebook
   */
  async signOutFacebook() {
    try {
      await Facebook.logOutAsync();
    } catch (error) {
      console.error('Facebook sign out error:', error);
    }
  }

  /**
   * Sign out from all OAuth providers
   */
  async signOutAll() {
    await this.signOutGoogle();
    await this.signOutFacebook();
    // Apple doesn't require explicit sign out
  }
}

export default new AuthService();
