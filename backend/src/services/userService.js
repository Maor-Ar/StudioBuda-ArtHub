import { db } from '../config/firebase.js';
import { USER_TYPES, USER_ROLES } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateEmail, validatePhone, validateName } from '../utils/validators.js';
import cacheService from './cacheService.js';

class UserService {
  async createUser(userData) {
    const { firstName, lastName, phone, email, passwordHash, userType, role } = userData;

    // Validate inputs
    validateName(firstName, 'firstName');
    validateName(lastName, 'lastName');
    validatePhone(phone);
    validateEmail(email);

    const userDoc = {
      firstName,
      lastName,
      phone,
      email,
      passwordHash: passwordHash || null,
      userType: userType || USER_TYPES.REGULAR,
      role: role || USER_ROLES.USER,
      hasPurchasedTrial: false, // Default to false
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const docRef = await db.collection('users').add(userDoc);
    
    // Invalidate cache
    await cacheService.delPattern('user:*');

    return { id: docRef.id, ...userDoc };
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

