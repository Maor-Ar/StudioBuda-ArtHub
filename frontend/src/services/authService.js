import { auth } from '@react-native-firebase/auth';
import { LOGIN_WITH_OAUTH } from './graphql/mutations';
import { OAUTH_PROVIDERS } from '../utils/constants';

class AuthService {
  // Sign in with Google
  async signInWithGoogle() {
    try {
      // For Expo, you would use expo-auth-session
      // This is a placeholder - actual implementation depends on your Firebase setup
      const googleProvider = new auth.GoogleAuthProvider();
      const result = await auth().signInWithCredential(googleProvider);
      return result.user.getIdToken();
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  // Sign in with Facebook
  async signInWithFacebook() {
    try {
      const facebookProvider = new auth.FacebookAuthProvider();
      const result = await auth().signInWithCredential(facebookProvider);
      return result.user.getIdToken();
    } catch (error) {
      console.error('Facebook sign in error:', error);
      throw error;
    }
  }

  // Sign in with Apple
  async signInWithApple() {
    try {
      const appleProvider = new auth.AppleAuthProvider();
      const result = await auth().signInWithCredential(appleProvider);
      return result.user.getIdToken();
    } catch (error) {
      console.error('Apple sign in error:', error);
      throw error;
    }
  }

  // Get OAuth token for a provider
  async getOAuthToken(provider) {
    switch (provider) {
      case OAUTH_PROVIDERS.GOOGLE:
        return await this.signInWithGoogle();
      case OAUTH_PROVIDERS.FACEBOOK:
        return await this.signInWithFacebook();
      case OAUTH_PROVIDERS.APPLE:
        return await this.signInWithApple();
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }
}

export default new AuthService();






