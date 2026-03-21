import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateTransactionType, validatePositiveNumber } from '../utils/validators.js';

const COLLECTION = 'products';

const VALID_TYPES = new Set([
  TRANSACTION_TYPES.SUBSCRIPTION,
  TRANSACTION_TYPES.PUNCH_CARD,
  TRANSACTION_TYPES.TRIAL_LESSON,
]);

function assertProductType(type) {
  validateTransactionType(type);
  if (!VALID_TYPES.has(type)) {
    throw new ValidationError('Invalid product type', 'type');
  }
}

function validateProductPayload(data, { partial = false } = {}) {
  const {
    title,
    type,
    price,
    monthlyEntries,
    totalEntries,
    validityMonths,
    termsHtml,
    sortOrder,
  } = data;

  if (!partial || title !== undefined) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ValidationError('title is required', 'title');
    }
  }
  if (!partial || type !== undefined) {
    if (type) assertProductType(type);
    else if (!partial) throw new ValidationError('type is required', 'type');
  }
  if (!partial || price !== undefined) {
    if (price !== undefined && price !== null) {
      validatePositiveNumber(Number(price), 'price');
    } else if (!partial) {
      throw new ValidationError('price is required', 'price');
    }
  }

  const t = type ?? data.type;
  if (!partial || monthlyEntries !== undefined) {
    if (t === TRANSACTION_TYPES.SUBSCRIPTION && !partial) {
      if (monthlyEntries == null || monthlyEntries < 1) {
        throw new ValidationError('monthlyEntries is required for subscription', 'monthlyEntries');
      }
    }
  }
  if (!partial || totalEntries !== undefined) {
    if (t === TRANSACTION_TYPES.PUNCH_CARD && !partial) {
      if (totalEntries == null || totalEntries < 1) {
        throw new ValidationError('totalEntries is required for punch_card', 'totalEntries');
      }
    }
  }
  if (!partial || validityMonths !== undefined) {
    if (t === TRANSACTION_TYPES.PUNCH_CARD && !partial) {
      if (validityMonths == null || validityMonths < 1) {
        throw new ValidationError('validityMonths is required for punch_card', 'validityMonths');
      }
    }
  }

  if (termsHtml !== undefined && termsHtml !== null && typeof termsHtml !== 'string') {
    throw new ValidationError('termsHtml must be a string', 'termsHtml');
  }
  if (sortOrder !== undefined && sortOrder !== null && typeof sortOrder !== 'number') {
    throw new ValidationError('sortOrder must be a number', 'sortOrder');
  }
}

class ProductService {
  normalizeDoc(id, data) {
    return {
      id,
      title: data.title ?? '',
      subtitle: data.subtitle ?? '',
      type: data.type,
      price: data.price,
      monthlyEntries: data.monthlyEntries ?? null,
      totalEntries: data.totalEntries ?? null,
      validityMonths: data.validityMonths ?? null,
      termsHtml: data.termsHtml ?? '',
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive !== false,
      isPurchasable: data.isPurchasable !== false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Active products shown on purchase page: active + purchasable online.
   */
  async listActiveForPurchase() {
    const snapshot = await db.collection(COLLECTION).where('isActive', '==', true).get();
    const rows = snapshot.docs
      .map((doc) => this.normalizeDoc(doc.id, doc.data()))
      .filter((p) => p.isPurchasable !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return rows;
  }

  /**
   * All products for admin (including inactive / not purchasable).
   */
  async listAll() {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs
      .map((doc) => this.normalizeDoc(doc.id, doc.data()))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getById(productId) {
    const doc = await db.collection(COLLECTION).doc(productId).get();
    if (!doc.exists) {
      throw new NotFoundError('Product not found');
    }
    return this.normalizeDoc(doc.id, doc.data());
  }

  /**
   * Authoritative product for checkout: must exist, active, purchasable.
   */
  async getActivePurchasableForCheckout(productId) {
    const product = await this.getById(productId);
    if (!product.isActive) {
      throw new ValidationError('Product is not available', 'productId');
    }
    if (product.isPurchasable === false) {
      throw new ValidationError('Product is not available for online purchase', 'productId');
    }
    return product;
  }

  async create(productId, input) {
    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      throw new ValidationError('Product id is required', 'id');
    }
    const ref = db.collection(COLLECTION).doc(productId.trim());
    const existing = await ref.get();
    if (existing.exists) {
      throw new ValidationError('Product with this id already exists', 'id');
    }

    validateProductPayload(input, { partial: false });

    const now = new Date();
    const doc = {
      title: input.title.trim(),
      subtitle: (input.subtitle ?? '').trim(),
      type: input.type,
      price: Number(input.price),
      monthlyEntries: input.type === TRANSACTION_TYPES.SUBSCRIPTION ? Number(input.monthlyEntries) : null,
      totalEntries: input.type === TRANSACTION_TYPES.PUNCH_CARD ? Number(input.totalEntries) : null,
      validityMonths: input.type === TRANSACTION_TYPES.PUNCH_CARD ? Number(input.validityMonths) : null,
      termsHtml: input.termsHtml ?? '',
      sortOrder: input.sortOrder !== undefined && input.sortOrder !== null ? Number(input.sortOrder) : 0,
      isActive: input.isActive !== false,
      isPurchasable: input.isPurchasable !== false,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(doc);
    return this.normalizeDoc(ref.id, doc);
  }

  async update(productId, input) {
    const ref = db.collection(COLLECTION).doc(productId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundError('Product not found');
    }

    const current = snap.data();
    const merged = {
      title: input.title !== undefined ? input.title : current.title,
      subtitle: input.subtitle !== undefined ? input.subtitle : current.subtitle,
      type: input.type !== undefined ? input.type : current.type,
      price: input.price !== undefined ? input.price : current.price,
      monthlyEntries:
        input.monthlyEntries !== undefined ? input.monthlyEntries : current.monthlyEntries,
      totalEntries: input.totalEntries !== undefined ? input.totalEntries : current.totalEntries,
      validityMonths: input.validityMonths !== undefined ? input.validityMonths : current.validityMonths,
      termsHtml: input.termsHtml !== undefined ? input.termsHtml : current.termsHtml,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : current.sortOrder,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      isPurchasable:
        input.isPurchasable !== undefined ? input.isPurchasable : current.isPurchasable,
    };

    validateProductPayload(
      {
        ...merged,
        title: merged.title,
        type: merged.type,
        price: merged.price,
        monthlyEntries: merged.monthlyEntries,
        totalEntries: merged.totalEntries,
        validityMonths: merged.validityMonths,
      },
      { partial: false }
    );

    const updateData = {
      title: typeof merged.title === 'string' ? merged.title.trim() : merged.title,
      subtitle:
        merged.subtitle === undefined || merged.subtitle === null
          ? ''
          : String(merged.subtitle).trim(),
      type: merged.type,
      price: Number(merged.price),
      monthlyEntries:
        merged.type === TRANSACTION_TYPES.SUBSCRIPTION ? Number(merged.monthlyEntries) : null,
      totalEntries:
        merged.type === TRANSACTION_TYPES.PUNCH_CARD ? Number(merged.totalEntries) : null,
      validityMonths:
        merged.type === TRANSACTION_TYPES.PUNCH_CARD ? Number(merged.validityMonths) : null,
      termsHtml: merged.termsHtml ?? '',
      sortOrder: merged.sortOrder !== undefined && merged.sortOrder !== null ? Number(merged.sortOrder) : 0,
      isActive: merged.isActive !== false,
      isPurchasable: merged.isPurchasable !== false,
      updatedAt: new Date(),
    };

    await ref.update(updateData);
    const updated = await ref.get();
    return this.normalizeDoc(updated.id, updated.data());
  }

  async softDelete(productId) {
    return this.update(productId, { isActive: false });
  }
}

export default new ProductService();
