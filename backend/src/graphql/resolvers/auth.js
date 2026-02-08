import authService from '../../services/authService.js';
import transactionService from '../../services/transactionService.js';
import { auth } from '../../config/firebase.js';
import { AuthenticationError, ValidationError } from '../../utils/errors.js';
import { validateEmail, validatePassword } from '../../utils/validators.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger.js';

export const authResolvers = {
  Mutation: {
    register: async (_, { input }, context) => {
      const { firstName, lastName, phone, email, password } = input;

      // Validate inputs
      validateEmail(email);
      validatePassword(password);

      // Check if user already exists
      const existingUser = await authService.getUserByEmail(email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists', 'email');
      }

      // Create user in Firebase Auth
      let firebaseUser;
      try {
        firebaseUser = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
        });
      } catch (error) {
        throw new AuthenticationError('Failed to create user account');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user in Firestore using Firebase UID as document ID
      console.log(`[REGISTER] Creating Firestore user with Firebase UID: ${firebaseUser.uid}`);
      const user = await authService.createUser({
        firstName,
        lastName,
        phone,
        email,
        passwordHash,
        userType: 'regular',
        role: 'user',
        firebaseUid: firebaseUser.uid, // Use Firebase Auth UID as Firestore document ID
      });
      console.log(`[REGISTER] Firestore user created successfully: ${user.id}`);

      // Get active transactions (will be empty for new user)
      const activeTransactions = await transactionService.getUserActiveTransactions(
        user.id,
        false
      );

      // Get hasPurchasedTrial status
      const hasPurchasedTrial = user.hasPurchasedTrial || false;

      // Generate custom token for client
      const token = await auth.createCustomToken(firebaseUser.uid);

      return {
        token,
        user,
        activeTransactions,
        hasPurchasedTrial,
      };
    },

    login: async (_, { input }, context) => {
      const { email, password } = input;

      validateEmail(email);

      // Get user from Firestore
      const user = await authService.getUserByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (user.userType !== 'regular') {
        throw new AuthenticationError('Please use OAuth login for this account');
      }

      // Verify password
      if (!user.passwordHash) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Get Firebase user
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(email);
      } catch (error) {
        throw new AuthenticationError('User account not found');
      }

      // Get active transactions with renewal check
      const activeTransactions = await transactionService.getUserActiveTransactions(
        user.id,
        true
      );

      // Get hasPurchasedTrial status
      const hasPurchasedTrial = user.hasPurchasedTrial || false;

      // Generate custom token
      const token = await auth.createCustomToken(firebaseUser.uid);

      return {
        token,
        user,
        activeTransactions,
        hasPurchasedTrial,
      };
    },

    loginWithOAuth: async (_, { provider, token }, context) => {
      logger.info('[AUTH_DEBUG] loginWithOAuth: provider=%s tokenLength=%s', provider, token?.length);

      // Verify OAuth token (expects Firebase ID token, NOT Google access token)
      const decodedToken = await authService.verifyToken(token);
      logger.info('[AUTH_DEBUG] loginWithOAuth: token verified, uid=%s', decodedToken?.uid);
      
      // Get or create user
      let user;
      try {
        user = await authService.getUserById(decodedToken.uid);
        logger.info('[AUTH_DEBUG] loginWithOAuth: existing user found, id=%s', user?.id);
      } catch (error) {
        logger.info('[AUTH_DEBUG] loginWithOAuth: user not found, creating new. error=%s', error?.message);
        // User doesn't exist, create new user from OAuth
        // First, ensure Firebase Auth user exists (OAuth might have created it)
        let firebaseUser;
        try {
          firebaseUser = await auth.getUser(decodedToken.uid);
        } catch (error) {
          // If Firebase user doesn't exist, we can't create Firestore user
          throw new AuthenticationError('OAuth user not found in Firebase Auth');
        }
        
        user = await authService.createUser({
          firstName: decodedToken.name?.split(' ')[0] || '',
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || '',
          phone: '', // OAuth doesn't provide phone
          email: decodedToken.email,
          passwordHash: null,
          userType: provider.toLowerCase(),
          role: 'user',
          firebaseUid: decodedToken.uid, // Use Firebase Auth UID as Firestore document ID
        });
        logger.info('[AUTH_DEBUG] loginWithOAuth: new user created, id=%s', user?.id);
      }

      // Get active transactions with renewal check
      const activeTransactions = await transactionService.getUserActiveTransactions(
        user.id,
        true
      );

      // Get hasPurchasedTrial status
      const hasPurchasedTrial = user.hasPurchasedTrial || false;

      // Return custom token (not ID token) - client needs it for signInWithCustomToken
      const customToken = await auth.createCustomToken(decodedToken.uid);

      return {
        token: customToken,
        user,
        activeTransactions,
        hasPurchasedTrial,
      };
    },

    forgotPassword: async (_, { email }, context) => {
      validateEmail(email);
      await authService.forgotPassword(email);
      return true;
    },

    resetPassword: async (_, { input }, context) => {
      const { token, newPassword } = input;
      validatePassword(newPassword);
      await authService.resetPassword(token, newPassword);
      return true;
    },
  },
};

