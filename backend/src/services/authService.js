import { auth } from '../config/firebase.js';
import userService from './userService.js';
import emailService from './emailService.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
import { generateResetToken } from '../utils/helpers.js';
import config from '../config/environment.js';
import { db } from '../config/firebase.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

class AuthService {
  async verifyToken(token) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  async createUser(userData) {
    return await userService.createUser(userData);
  }

  async getUserByEmail(email) {
    return await userService.getUserByEmail(email);
  }

  async updateUser(userId, data) {
    return await userService.updateUser(userId, data);
  }

  async forgotPassword(email) {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return { success: true, message: 'If the email exists, a password reset link has been sent.' };
    }

    if (user.userType !== 'regular') {
      throw new ValidationError('Password reset is only available for email/password accounts');
    }

    const resetToken = generateResetToken();
    const resetUrl = `${config.passwordReset.url}?token=${resetToken}`;

    // Store reset token in Firestore (with expiration)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + config.passwordReset.tokenExpiry);

    await db.collection('password_reset_tokens').doc(resetToken).set({
      userId: user.id,
      email: user.email,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Send email
    await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);

    return { success: true, message: 'Password reset email sent' };
  }

  async resetPassword(token, newPassword) {
    // Validate password
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password');
    }

    // Get reset token
    const tokenDoc = await db.collection('password_reset_tokens').doc(token).get();
    if (!tokenDoc.exists) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const tokenData = tokenDoc.data();
    if (tokenData.used) {
      throw new AuthenticationError('Reset token has already been used');
    }

    if (new Date() > tokenData.expiresAt.toDate()) {
      throw new AuthenticationError('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await userService.updateUser(tokenData.userId, { passwordHash });

    // Mark token as used
    await db.collection('password_reset_tokens').doc(token).update({ used: true });

    return { success: true, message: 'Password reset successfully' };
  }

  async validatePasswordResetToken(token) {
    const tokenDoc = await db.collection('password_reset_tokens').doc(token).get();
    if (!tokenDoc.exists) {
      return false;
    }

    const tokenData = tokenDoc.data();
    if (tokenData.used || new Date() > tokenData.expiresAt.toDate()) {
      return false;
    }

    return true;
  }

  async checkTrialPurchaseStatus(userId) {
    return await userService.checkTrialPurchaseStatus(userId);
  }
}

export default new AuthService();

