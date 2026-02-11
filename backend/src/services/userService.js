import { db } from '../config/firebase.js';
import { USER_TYPES, USER_ROLES } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateEmail, validatePhone, validateName } from '../utils/validators.js';
import cacheService from './cacheService.js';

class UserService {
  async createUser(userData) {
    const { firstName, lastName, phone, email, passwordHash, userType, role, firebaseUid } = userData;

    // Validate inputs
    const isOAuthUser = userType && userType !== USER_TYPES.REGULAR;
    const finalFirstName = (firstName?.trim() || '').trim() || (isOAuthUser ? 'User' : '');
    const finalLastName = (lastName?.trim() || '').trim() || (isOAuthUser ? '' : '');
    if (!isOAuthUser) {
      validateName(finalFirstName, 'firstName');
      validateName(finalLastName, 'lastName');
      validatePhone(phone);
    } else {
      validateName(finalFirstName, 'firstName');
      if (finalLastName) {
        try {
          validateName(finalLastName, 'lastName');
        } catch {
          // OAuth names (e.g. from Google) may contain chars that fail validation
          finalLastName = '';
        }
      }
      // OAuth users have no phone - only validate if one was provided
      if (phone && String(phone).trim()) validatePhone(String(phone).trim());
    }
    validateEmail(email);

    if (!firebaseUid) {
      throw new ValidationError('Firebase UID is required to create user');
    }

    const userDoc = {
      firstName: finalFirstName,
      lastName: finalLastName,
      phone: phone ?? '',
      email,
      passwordHash: passwordHash || null,
      userType: userType || USER_TYPES.REGULAR,
      role: role || USER_ROLES.USER,
      hasPurchasedTrial: false, // Default to false
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Use Firebase UID as the document ID so it matches the auth token
    const docRef = db.collection('users').doc(firebaseUid);
    console.log(`[USER_SERVICE] Creating user document with ID: ${firebaseUid}`);
    await docRef.set(userDoc);
    console.log(`[USER_SERVICE] User document created successfully: ${firebaseUid}`);
    
    // Invalidate cache
    await cacheService.delPattern('user:*');

    return { id: firebaseUid, ...userDoc };
  }

  async getUserById(userId) {
    const cacheKey = cacheService.getUserKey(userId);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      throw new NotFoundError('User not found');
    }

    const userData = { id: doc.id, ...doc.data() };
    const { CACHE_TTL } = await import('../config/constants.js');
    await cacheService.set(cacheKey, userData, CACHE_TTL.USER);

    return userData;
  }

  async getUserByEmail(email) {
    validateEmail(email);
    
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async updateUser(userId, data) {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db.collection('users').doc(userId).update(updateData);
    
    // Invalidate user cache
    await cacheService.invalidateUserCache(userId);

    return this.getUserById(userId);
  }

  async checkTrialPurchaseStatus(userId) {
    const user = await this.getUserById(userId);
    return user.hasPurchasedTrial || false;
  }
}

export default new UserService();

