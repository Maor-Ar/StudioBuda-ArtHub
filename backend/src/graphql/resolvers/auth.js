import authService from '../../services/authService.js';
import transactionService from '../../services/transactionService.js';
import { auth } from '../../config/firebase.js';
import { AuthenticationError, ValidationError } from '../../utils/errors.js';
import { validateEmail, validatePassword } from '../../utils/validators.js';
import bcrypt from 'bcrypt';

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

      // Create user in Firestore
      const user = await authService.createUser({
        firstName,
        lastName,
        phone,
        email,
        passwordHash,
        userType: 'regular',
        role: 'user',
      });

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
      // Verify OAuth token
      const decodedToken = await authService.verifyToken(token);
      
      // Get or create user
      let user = await authService.getUserByEmail(decodedToken.email);
      
      if (!user) {
        // Create new user from OAuth
        user = await authService.createUser({
          firstName: decodedToken.name?.split(' ')[0] || '',
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || '',
          phone: '', // OAuth doesn't provide phone
          email: decodedToken.email,
          passwordHash: null,
          userType: provider.toLowerCase(),
          role: 'user',
        });
      }

      // Get active transactions with renewal check
      const activeTransactions = await transactionService.getUserActiveTransactions(
        user.id,
        true
      );

      // Get hasPurchasedTrial status
      const hasPurchasedTrial = user.hasPurchasedTrial || false;

      return {
        token,
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

