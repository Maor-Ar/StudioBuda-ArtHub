import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { OAUTH_PROVIDERS } from '../utils/constants';
import { oAuthConfig } from '../config/firebase';

// Enable warm-up for web browser on Android
WebBrowser.maybeCompleteAuthSession();

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
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'studiobuda-arthub',
        useProxy: true,
      });

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };

      const clientId = Platform.select({
        ios: oAuthConfig.google.iosClientId,
        android: oAuthConfig.google.androidClientId,
        default: oAuthConfig.google.webClientId,
      });

      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      const result = await request.promptAsync(discovery, { useProxy: true });

      if (result.type === 'success') {
        const { authentication } = result;
        const { accessToken } = authentication;

        // Fetch user info from Google
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const userInfo = await userInfoResponse.json();

        return {
          token: accessToken,
          email: userInfo.email,
          name: userInfo.name || '',
          provider: OAUTH_PROVIDERS.GOOGLE,
        };
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled');
      } else {
        throw new Error('Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google sign in error:', error);

      if (error.message.includes('cancelled')) {
        throw new Error('Google sign-in was cancelled');
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
