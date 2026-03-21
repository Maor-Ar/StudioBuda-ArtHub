import { randomUUID } from 'crypto';
import userService from '../../services/userService.js';
import transactionService from '../../services/transactionService.js';
import productService from '../../services/productService.js';
import { requireManager, requireAdmin } from '../middleware/permissions.js';
import { USER_ROLES } from '../../config/constants.js';
import { TRANSACTION_TYPES } from '../../config/constants.js';
import { ValidationError } from '../../utils/errors.js';
import { validateEmail, validatePhone, validateName } from '../../utils/validators.js';
import logger from '../../utils/logger.js';

async function countActiveAdmins() {
  const { db } = await import('../../config/firebase.js');
  const snapshot = await db.collection('users').where('role', '==', USER_ROLES.ADMIN).get();
  return snapshot.docs.filter((d) => d.data().isActive !== false).length;
}

export const adminResolvers = {
  Mutation: {
    adminUpdateUser: async (_, { id, input }, context) => {
      const actor = await requireManager(context);
      const target = await userService.getUserById(id);

      if (actor.id === id && input.isActive === false) {
        throw new ValidationError('לא ניתן להשבית את החשבון שלך');
      }

      if (input.role === USER_ROLES.ADMIN && target.role !== USER_ROLES.ADMIN) {
        await requireAdmin(context);
      }

      if (
        input.role != null &&
        input.role !== USER_ROLES.ADMIN &&
        target.role === USER_ROLES.ADMIN &&
        input.role !== target.role
      ) {
        const activeAdmins = await countActiveAdmins();
        if (activeAdmins <= 1 && target.isActive !== false) {
          throw new ValidationError('לא ניתן להסיר את מנהל המערכת האחרון');
        }
      }

      if (input.isActive === false && target.role === USER_ROLES.ADMIN) {
        const activeAdmins = await countActiveAdmins();
        if (activeAdmins <= 1) {
          throw new ValidationError('לא ניתן להשבית את מנהל המערכת האחרון');
        }
      }

      const updates = {};

      if (input.firstName != null) {
        validateName(String(input.firstName).trim(), 'firstName');
        updates.firstName = String(input.firstName).trim();
      }
      if (input.lastName != null) {
        validateName(String(input.lastName).trim(), 'lastName');
        updates.lastName = String(input.lastName).trim();
      }
      if (input.phone != null) {
        const p = String(input.phone).trim();
        if (p.length > 0) {
          validatePhone(p);
        }
        updates.phone = p;
      }
      if (input.userType != null) {
        updates.userType = input.userType;
      }
      if (input.role != null) {
        updates.role = input.role;
      }
      if (input.hasPurchasedTrial != null) {
        updates.hasPurchasedTrial = input.hasPurchasedTrial;
      }
      if (input.isActive != null) {
        updates.isActive = input.isActive;
      }

      if (input.email != null) {
        const newEmail = String(input.email).trim();
        validateEmail(newEmail);
        if (newEmail !== target.email) {
          const existing = await userService.getUserByEmail(newEmail);
          if (existing && existing.id !== id) {
            throw new ValidationError('כתובת האימייל כבר בשימוש', 'email');
          }
          try {
            await userService.updateAuthEmail(id, newEmail);
          } catch (e) {
            logger.error('[adminUpdateUser] Firebase auth email update failed', { message: e.message });
            throw new ValidationError(
              e.message?.includes('email') ? 'כתובת האימייל לא תקינה או תפוסה' : 'עדכון אימייל נכשל',
              'email'
            );
          }
          updates.email = newEmail;
        }
      }

      if (Object.keys(updates).length === 0) {
        return userService.getUserById(id);
      }

      return userService.updateUser(id, updates);
    },

    adminCreateTransactionForUser: async (_, { userId, input }, context) => {
      await requireManager(context);

      await userService.getUserById(userId);

      const product = await productService.getById(input.productId);
      if (!product.isActive) {
        throw new ValidationError('המוצר אינו פעיל', 'productId');
      }

      const amount =
        input.amount != null && input.amount !== undefined
          ? Number(input.amount)
          : Number(product.price);

      if (!amount || amount <= 0) {
        throw new ValidationError('סכום חייב להיות חיובי', 'amount');
      }

      const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
      if (Number.isNaN(purchaseDate.getTime())) {
        throw new ValidationError('תאריך רכישה לא תקין', 'purchaseDate');
      }

      const invoiceId = `CASH-${randomUUID()}`;

      const payload = {
        userId,
        transactionType: product.type,
        amount,
        invoiceId,
        purchaseDate,
        paymentSource: 'manual_cash',
        adminNote: input.adminNote != null ? String(input.adminNote).slice(0, 2000) : null,
      };

      if (product.type === TRANSACTION_TYPES.SUBSCRIPTION) {
        payload.monthlyEntries = product.monthlyEntries;
        payload.lastRenewalDate = purchaseDate;
        payload.entriesUsedThisMonth = 0;
      } else if (product.type === TRANSACTION_TYPES.PUNCH_CARD) {
        payload.totalEntries = product.totalEntries;
        payload.entriesRemaining = product.totalEntries;
      }

      return transactionService.createTransaction(payload);
    },
  },
};
