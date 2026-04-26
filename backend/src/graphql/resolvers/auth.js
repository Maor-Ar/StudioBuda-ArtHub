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
        const errorCode = error?.code || '';
        logger.error('register: Firebase createUser failed', {
          email,
          code: errorCode,
          message: error?.message,
        });

        // Recovery path: user may already exist in Firebase Auth while missing in Firestore.
        if (errorCode === 'auth/email-already-exists') {
          try {
            firebaseUser = await auth.getUserByEmail(email);
            logger.warn('register: using existing Firebase user for Firestore sync', {
              email,
              firebaseUid: firebaseUser?.uid,
            });
          } catch (getUserError) {
            logger.error('register: failed to fetch existing Firebase user', {
              email,
              code: getUserError?.code,
              message: getUserError?.message,
            });
            throw new ValidationError('User with this email already exists', 'email');
          }
        } else {
          throw new AuthenticationError('Failed to create user account');
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user in Firestore using Firebase UID as document ID
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
      // Validate provider parameter
      if (!provider || typeof provider !== 'string') {
        logger.error('loginWithOAuth: invalid provider', { provider });
        throw new ValidationError('Provider is required and must be a string');
      }

      // Normalize provider to lowercase for consistency
      const normalizedProvider = provider.trim().toLowerCase();
      // Validate token
      if (!token || typeof token !== 'string' || token.length < 50) {
        logger.error('loginWithOAuth: invalid token', { tokenLength: token?.length });
        throw new ValidationError('Valid authentication token is required');
      }

      let decodedToken;
      try {
        decodedToken = await authService.verifyToken(token);
      } catch (verifyError) {
        logger.error('loginWithOAuth: token verification failed', { error: verifyError?.message, stack: verifyError?.stack });
        throw verifyError;
      }
      
      // Edge case: Handle missing email (1-5% of tokens may lack email)
      // Try multiple sources: email, firebase.identities.email, or extract from uid
      let userEmail = decodedToken.email;
      if (!userEmail) {
        // Check if email is in identities
        if (decodedToken.firebase?.identities?.email && decodedToken.firebase.identities.email.length > 0) {
          userEmail = decodedToken.firebase.identities.email[0];
        } else {
          logger.error('loginWithOAuth: Firebase token missing email', { 
            uid: decodedToken.uid, 
            keys: Object.keys(decodedToken),
            hasIdentities: !!decodedToken.firebase?.identities
          });
          throw new AuthenticationError('OAuth token missing email. Please ensure the Google account has an email address and try again.');
        }
      }

      // Check for existing user by email (to handle account linking across environments/dev)
      // If user exists with different Firebase UID, link the OAuth account to existing user
      let existingUserByEmail = null;
      try {
        existingUserByEmail = await authService.getUserByEmail(userEmail);
        if (existingUserByEmail && existingUserByEmail.firebaseUid !== decodedToken.uid) {
          // Link accounts (OAuth email match, different UID) Update existing user's firebaseUid to the OAuth UID
          // This allows users to login with either email/password or OAuth
          // Also update userType to OAuth if it was regular
          const updateData = {
            firebaseUid: decodedToken.uid,
          };
          if (existingUserByEmail.userType === 'regular') {
            updateData.userType = normalizedProvider;
          }
          
          // Update the existing user document
          existingUserByEmail = await authService.updateUser(existingUserByEmail.id, updateData);
        }
      } catch (error) {
        if (error.name !== 'NotFoundError' && !(error.message && error.message.includes('not found'))) {
          logger.error('loginWithOAuth: error checking user by email', { error: error?.message });
        }
      }
      
      // Get or create user
      let user;
      
      // If we found an existing user by email and linked accounts, use that user directly
      // (We can't use getUserById with new UID because document ID is still old UID)
      if (existingUserByEmail && existingUserByEmail.firebaseUid === decodedToken.uid) {
        user = existingUserByEmail;
      } else {
        try {
          user = await authService.getUserById(decodedToken.uid);
          if (user.userType === 'regular' && normalizedProvider !== 'regular') {
            user = await authService.updateUser(user.id, { userType: normalizedProvider });
          }
        } catch (error) {
        // User doesn't exist, create new user from OAuth
        // First, ensure Firebase Auth user exists (OAuth might have created it)
        let firebaseUser;
        try {
          firebaseUser = await auth.getUser(decodedToken.uid);
        } catch (authError) {
          logger.error('loginWithOAuth: Firebase user not found', { uid: decodedToken.uid, error: authError?.message });
          throw new AuthenticationError('OAuth user not found in Firebase Auth');
        }

        // Enhanced name extraction with multiple fallbacks
        const nameFromToken = decodedToken.name || decodedToken.displayName || firebaseUser.displayName || '';
        const nameParts = (nameFromToken || '').trim().split(/\s+/).filter(Boolean);
        
        // Extract firstName: prefer first part of name, fallback to email prefix, then 'User'
        const rawFirst = nameParts[0] || (userEmail ? userEmail.split('@')[0] : 'User');
        
        // Extract lastName: prefer remaining parts, fallback to empty (will use firstName)
        const rawLast = nameParts.slice(1).join(' ') || '';
        
        // Enhanced sanitization: remove control chars, emojis, and limit length
        const sanitize = (v, fallback) => {
          // Remove control characters, emojis, and normalize whitespace
          let s = String(v || '')
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control chars
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
            .replace(/[\u{2000}-\u{206F}]/gu, '') // Unicode punctuation
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .slice(0, 100); // Limit length
          return s.length >= 1 ? s : fallback;
        };
        
        const firstName = sanitize(rawFirst, 'User');
        // For OAuth users, if lastName is empty, use firstName as fallback to ensure it's never empty
        const lastName = sanitize(rawLast, firstName || 'User');

        // Log email verification status (informational - Google doesn't always provide this)
        const emailVerified = decodedToken.email_verified === true;
        if (!emailVerified) {
          logger.warn('loginWithOAuth: email not verified in token', { email: userEmail });
        }

        try {
          // Race condition handling: user might be created between check and create
          // Use try-catch to handle duplicate creation attempts
          user = await authService.createUser({
            firstName,
            lastName,
            phone: '', // OAuth doesn't provide phone
            email: userEmail,
            passwordHash: null,
            userType: normalizedProvider,
            role: 'user',
            firebaseUid: decodedToken.uid, // Use Firebase Auth UID as Firestore document ID
          });
        } catch (createError) {
          if (createError.message?.includes('already exists') || createError.code === 'ALREADY_EXISTS') {
            try {
              user = await authService.getUserById(decodedToken.uid);
            } catch (fetchError) {
              logger.error('loginWithOAuth: fetch user after race failed', { error: fetchError?.message });
              throw createError;
            }
          } else {
            logger.error('loginWithOAuth: createUser failed', {
              error: createError?.message,
              name: createError?.name,
              code: createError?.code,
            });
            throw createError;
          }
        }
      }
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

