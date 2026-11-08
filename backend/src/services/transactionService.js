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
      // Payment fields
      zcreditReferenceNumber,
      hypTransactionId,
      hypHkId,
      hypOrderId,
      paymentToken,
      cardLast4,
      cardBrand,
      lastPaymentDate,
      purchaseDate,
      isActive,
      entriesUsedThisMonth,
      lastRenewalDate,
      entriesRemaining,
      paymentSource,
      adminNote,
      reservedEventId,
      reservationReleaseAt,
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

    if (
      transactionType === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION &&
      isActive !== false &&
      !reservedEventId
    ) {
      throw new ValidationError('reservedEventId is required for reserved subscription', 'reservedEventId');
    }

    const paymentReference = invoiceId || hypTransactionId || zcreditReferenceNumber;
    if (!paymentReference) {
      throw new ValidationError('invoiceId or payment reference is required', 'invoiceId');
    }

    const now = new Date();
    const transactionDoc = {
      userId,
      transactionType,
      amount,
      invoiceId: paymentReference,
      isActive: isActive !== undefined ? isActive : true,
      purchaseDate: purchaseDate || now,
      createdAt: now,
      updatedAt: now,
      zcreditReferenceNumber: zcreditReferenceNumber || null,
      hypTransactionId: hypTransactionId || null,
      hypHkId: hypHkId || null,
      hypOrderId: hypOrderId || null,
      paymentToken: paymentToken || null,
      cardLast4: cardLast4 || null,
      cardBrand: cardBrand || null,
      lastPaymentDate: lastPaymentDate || now,
      ...(paymentSource != null && { paymentSource }),
      ...(adminNote != null && { adminNote }),
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

    if (transactionType === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION) {
      transactionDoc.reservedEventId = reservedEventId || null;
      transactionDoc.lastRenewalDate = lastRenewalDate || now;
      if (reservationReleaseAt) {
        transactionDoc.reservationReleaseAt = reservationReleaseAt;
      }
    }

    const docRef = await db.collection('transactions').add(transactionDoc);

    // If trial_lesson, update user.hasPurchasedTrial
    if (transactionType === TRANSACTION_TYPES.TRIAL_LESSON) {
      await userService.updateUser(userId, { hasPurchasedTrial: true });
    }

    // Invalidate cache
    await cacheService.invalidateUserCache(userId);

    // logger.info('Transaction created', { transactionId: docRef.id, userId, transactionType });

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
        const lastRenewalDate = transaction.lastRenewalDate?.toDate
          ? transaction.lastRenewalDate.toDate()
          : transaction.lastRenewalDate
            ? new Date(transaction.lastRenewalDate)
            : null;

        // Hyp subscriptions renew via Hyp webhook / daily Hyp entry-reset job.
        if (transaction.hypHkId) {
          updatedTransactions.push(transaction);
          continue;
        }

        // Manual cash stays as admin-managed.
        if (transaction.paymentSource === 'manual_cash') {
          updatedTransactions.push(transaction);
          continue;
        }
        
        if (lastRenewalDate && isPreviousMonth(lastRenewalDate)) {
          // Grow / legacy non-Hyp: only renew when daily Gmail sync stored a receipt.
          try {
            const paymentResult = await growService.verifyPayment(
              transaction.invoiceId,
              userId
            );

            if (paymentResult.verified) {
              const purchaseDate = transaction.purchaseDate?.toDate
                ? transaction.purchaseDate.toDate()
                : new Date(transaction.purchaseDate);
              const newRenewalDate = updateToCurrentMonth(purchaseDate);
              await this.updateTransaction(transaction.id, {
                lastRenewalDate: newRenewalDate,
                lastPaymentDate: paymentResult.paymentDate || new Date(),
                entriesUsedThisMonth: 0,
              });

              transaction.lastRenewalDate = { toDate: () => newRenewalDate };
              transaction.entriesUsedThisMonth = 0;
              updatedTransactions.push(transaction);
            } else {
              // Keep active until the daily job deactivates after grace — avoid
              // cutting access on every login while waiting for the Grow email.
              updatedTransactions.push(transaction);
            }
          } catch (error) {
            logger.error('Error verifying payment:', error);
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
    const normalizedData = { ...data };
    const dateFields = ['purchaseDate', 'lastRenewalDate', 'lastPaymentDate', 'reservationReleaseAt'];
    dateFields.forEach((field) => {
      if (normalizedData[field] !== undefined && normalizedData[field] !== null) {
        if (normalizedData[field] === '') {
          normalizedData[field] = null;
        } else if (typeof normalizedData[field] === 'string') {
          normalizedData[field] = new Date(normalizedData[field]);
        }
      }
    });

    const nonNegativeNumberFields = [
      'monthlyEntries',
      'entriesUsedThisMonth',
      'entriesRemaining',
      'totalEntries',
    ];
    nonNegativeNumberFields.forEach((field) => {
      if (normalizedData[field] !== undefined && normalizedData[field] !== null) {
        if (
          typeof normalizedData[field] !== 'number' ||
          !Number.isFinite(normalizedData[field]) ||
          normalizedData[field] < 0
        ) {
          throw new ValidationError(`${field} must be a non-negative number`, field);
        }
      }
    });

    if (
      normalizedData.entriesRemaining !== undefined &&
      normalizedData.totalEntries !== undefined &&
      normalizedData.entriesRemaining > normalizedData.totalEntries
    ) {
      throw new ValidationError(
        'entriesRemaining cannot be greater than totalEntries',
        'entriesRemaining'
      );
    }

    const updateData = {
      ...normalizedData,
      updatedAt: new Date(),
    };

    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      throw new NotFoundError('Transaction not found');
    }

    await transactionRef.update(updateData);

    const transaction = transactionDoc.data();
    if (
      transaction.transactionType === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION &&
      updateData.isActive === false &&
      transaction.reservedEventId
    ) {
      const reservedRegularService = (await import('./reservedRegularService.js')).default;
      const releaseAt =
        updateData.reservationReleaseAt !== undefined
          ? updateData.reservationReleaseAt
          : transaction.reservationReleaseAt;
      const releaseDate = releaseAt?.toDate
        ? releaseAt.toDate()
        : releaseAt
          ? new Date(releaseAt)
          : null;
      const keepsSeat =
        releaseDate && !Number.isNaN(releaseDate.getTime()) && releaseDate.getTime() > Date.now();
      if (keepsSeat) {
        await reservedRegularService.markRelease(transaction.userId, transaction.reservedEventId, releaseDate);
      } else {
        await reservedRegularService.removeUser(transaction.reservedEventId, transaction.userId);
      }
    }

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
    const transaction = await this.getTransactionById(transactionId);
    if (transaction.hypHkId) {
      const paymentService = (await import('./paymentService.js')).default;
      await paymentService.cancelHypAgreement(transaction.hypHkId);
    }
    const updates = { isActive: false };
    if (transaction.transactionType === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION) {
      const { accessEndsDateFromTransaction } = await import('../utils/reservedRegulars.js');
      const ends = accessEndsDateFromTransaction(transaction);
      if (ends) {
        updates.reservationReleaseAt = new Date(ends);
      }
    }
    return await this.updateTransaction(transactionId, updates);
  }

  async getTransactionByHypOrderId(hypOrderId) {
    if (!hypOrderId) return null;
    const snapshot = await db.collection('transactions')
      .where('hypOrderId', '==', String(hypOrderId))
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getTransactionByHypTransactionId(hypTransactionId) {
    if (!hypTransactionId) return null;
    const snapshot = await db.collection('transactions')
      .where('hypTransactionId', '==', String(hypTransactionId))
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getTransactionByHypHkId(hypHkId) {
    if (!hypHkId) return null;
    const snapshot = await db.collection('transactions')
      .where('hypHkId', '==', String(hypHkId))
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async applyHypRecurringCharge(hypHkId, { hypTransactionId } = {}) {
    const transaction = await this.getTransactionByHypHkId(hypHkId);
    if (!transaction) return null;

    const now = new Date();
    const update = {
      lastPaymentDate: now,
      lastRenewalDate: now,
      entriesUsedThisMonth: 0,
    };
    if (hypTransactionId) {
      update.hypTransactionId = String(hypTransactionId);
    }
    return await this.updateTransaction(transaction.id, update);
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

    const used = transaction.entriesUsedThisMonth ?? 0;
    const limit = transaction.monthlyEntries ?? 0;
    return used < limit;
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

