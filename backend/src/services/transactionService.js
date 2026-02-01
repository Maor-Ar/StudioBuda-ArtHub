import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { validateTransactionType, validatePositiveNumber } from '../utils/validators.js';
import userService from './userService.js';
import cacheService from './cacheService.js';
import growService from './growService.js';
import { isPreviousMonth, updateToCurrentMonth } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class TransactionService {
  async createTransaction(transactionData) {
    const {
      userId,
      transactionType,
      amount,
      monthlyEntries,
      totalEntries,
      invoiceId,
      // New payment fields
      zcreditReferenceNumber,
      paymentToken,
      cardLast4,
      cardBrand,
      lastPaymentDate,
      purchaseDate,
      isActive,
      entriesUsedThisMonth,
      lastRenewalDate,
      entriesRemaining,
    } = transactionData;

    // Validate transaction type
    validateTransactionType(transactionType);
    validatePositiveNumber(amount, 'amount');

    // Special validation for trial_lesson
    if (transactionType === TRANSACTION_TYPES.TRIAL_LESSON) {
      const user = await userService.getUserById(userId);
      if (user.hasPurchasedTrial) {
        throw new ConflictError('User has already purchased a trial lesson', 'transactionType');
      }
    }

    // Validate type-specific fields
    if (transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
      if (!monthlyEntries) {
        throw new ValidationError('monthlyEntries is required for subscription', 'monthlyEntries');
      }
      validatePositiveNumber(monthlyEntries, 'monthlyEntries');
    }

    if (transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
      if (!totalEntries) {
        throw new ValidationError('totalEntries is required for punch card', 'totalEntries');
      }
      validatePositiveNumber(totalEntries, 'totalEntries');
    }

    // Require either invoiceId or zcreditReferenceNumber
    if (!invoiceId && !zcreditReferenceNumber) {
      throw new ValidationError('invoiceId or zcreditReferenceNumber is required', 'invoiceId');
    }

    const now = new Date();
    const transactionDoc = {
      userId,
      transactionType,
      amount,
      invoiceId: invoiceId || zcreditReferenceNumber, // Backwards compatibility
      isActive: isActive !== undefined ? isActive : true,
      purchaseDate: purchaseDate || now,
      createdAt: now,
      updatedAt: now,
      // New payment fields
      zcreditReferenceNumber: zcreditReferenceNumber || null,
      paymentToken: paymentToken || null,
      cardLast4: cardLast4 || null,
      cardBrand: cardBrand || null,
      lastPaymentDate: lastPaymentDate || now,
    };

    // Add type-specific fields
    if (transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
      transactionDoc.monthlyEntries = monthlyEntries;
      transactionDoc.lastRenewalDate = lastRenewalDate || now;
      transactionDoc.entriesUsedThisMonth = entriesUsedThisMonth || 0;
    }

    if (transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
      transactionDoc.totalEntries = totalEntries;
      transactionDoc.entriesRemaining = entriesRemaining !== undefined ? entriesRemaining : totalEntries;
    }

    const docRef = await db.collection('transactions').add(transactionDoc);

    // If trial_lesson, update user.hasPurchasedTrial
    if (transactionType === TRANSACTION_TYPES.TRIAL_LESSON) {
      await userService.updateUser(userId, { hasPurchasedTrial: true });
    }

    // Invalidate cache
    await cacheService.invalidateUserCache(userId);

    logger.info('Transaction created', {
      transactionId: docRef.id,
      userId,
      transactionType,
      amount,
      hasToken: !!paymentToken,
    });

    return { id: docRef.id, ...transactionDoc };
  }

  async getUserActiveTransactions(userId, checkRenewal = false) {
    const cacheKey = cacheService.getUserTransactionsKey(userId);
    if (!checkRenewal) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const snapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    let transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Check and renew subscriptions if requested
    if (checkRenewal) {
      transactions = await this.checkAndRenewSubscriptions(transactions, userId);
    }

    // Cache the result
    await cacheService.set(cacheKey, transactions, 300); // 5 minutes TTL

    return transactions;
  }

  async checkAndRenewSubscriptions(transactions, userId) {
    const updatedTransactions = [];
    
    for (const transaction of transactions) {
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        const lastRenewalDate = transaction.lastRenewalDate?.toDate();
        
        if (lastRenewalDate && isPreviousMonth(lastRenewalDate)) {
          // Verify payment with Grow
          try {
            const paymentResult = await growService.verifyPayment(
              transaction.invoiceId,
              userId
            );

            if (paymentResult.verified) {
              // Update renewal date and reset entries
              const newRenewalDate = updateToCurrentMonth(transaction.purchaseDate.toDate());
              await this.updateTransaction(transaction.id, {
                lastRenewalDate: newRenewalDate,
                entriesUsedThisMonth: 0,
              });

              transaction.lastRenewalDate = { toDate: () => newRenewalDate };
              transaction.entriesUsedThisMonth = 0;
              updatedTransactions.push(transaction);
            } else {
              // Payment not verified, deactivate
              await this.updateTransaction(transaction.id, { isActive: false });
              // Don't add to active transactions
            }
          } catch (error) {
            logger.error('Error verifying payment:', error);
            // On error, keep transaction active but don't renew
            updatedTransactions.push(transaction);
          }
        } else {
          updatedTransactions.push(transaction);
        }
      } else {
        updatedTransactions.push(transaction);
      }
    }

    return updatedTransactions;
  }

  async updateTransaction(transactionId, data) {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      throw new NotFoundError('Transaction not found');
    }

    await transactionRef.update(updateData);

    const transaction = transactionDoc.data();
    // Invalidate cache
    await cacheService.invalidateUserCache(transaction.userId);

    return { id: transactionId, ...transaction, ...updateData };
  }

  async renewSubscription(transactionId, managerId) {
    const transaction = await this.getTransactionById(transactionId);
    
    if (transaction.transactionType !== TRANSACTION_TYPES.SUBSCRIPTION) {
      throw new ValidationError('Transaction is not a subscription', 'transactionType');
    }

    const newRenewalDate = updateToCurrentMonth(transaction.purchaseDate.toDate());
    return await this.updateTransaction(transactionId, {
      lastRenewalDate: newRenewalDate,
      entriesUsedThisMonth: 0,
    });
  }

  async cancelSubscription(transactionId, managerId) {
    return await this.updateTransaction(transactionId, { isActive: false });
  }

  async getTransactionById(transactionId) {
    const doc = await db.collection('transactions').doc(transactionId).get();
    if (!doc.exists) {
      throw new NotFoundError('Transaction not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async checkSubscriptionLimit(transactionId) {
    const transaction = await this.getTransactionById(transactionId);
    
    if (transaction.transactionType !== TRANSACTION_TYPES.SUBSCRIPTION) {
      throw new ValidationError('Transaction is not a subscription', 'transactionType');
    }

    return transaction.entriesUsedThisMonth < transaction.monthlyEntries;
  }

  async checkTrialEligibility(userId) {
    const transactions = await this.getUserActiveTransactions(userId);
    return transactions.some(
      t => t.transactionType === TRANSACTION_TYPES.TRIAL_LESSON && t.isActive
    );
  }

  async checkTrialPurchaseEligibility(userId) {
    const user = await userService.getUserById(userId);
    return !user.hasPurchasedTrial;
  }

  async useSubscriptionEntry(transactionId) {
    const transaction = await this.getTransactionById(transactionId);
    
    if (transaction.transactionType !== TRANSACTION_TYPES.SUBSCRIPTION) {
      throw new ValidationError('Transaction is not a subscription', 'transactionType');
    }

    const newCount = (transaction.entriesUsedThisMonth || 0) + 1;
    return await this.updateTransaction(transactionId, {
      entriesUsedThisMonth: newCount,
    });
  }

  async usePunchCardEntry(transactionId) {
    const transaction = await this.getTransactionById(transactionId);
    
    if (transaction.transactionType !== TRANSACTION_TYPES.PUNCH_CARD) {
      throw new ValidationError('Transaction is not a punch card', 'transactionType');
    }

    if (!transaction.entriesRemaining || transaction.entriesRemaining <= 0) {
      throw new ConflictError('Punch card has no remaining entries', 'transactionId');
    }

    const newRemaining = transaction.entriesRemaining - 1;
    const updateData = {
      entriesRemaining: newRemaining,
    };

    // If no entries remaining, deactivate the punch card
    if (newRemaining === 0) {
      updateData.isActive = false;
    }

    return await this.updateTransaction(transactionId, updateData);
  }
}

export default new TransactionService();

