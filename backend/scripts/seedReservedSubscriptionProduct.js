import { db } from '../src/config/firebase.js';
import {
  RESERVED_SUBSCRIPTION_PRODUCT_ID,
  RESERVED_SUBSCRIPTION_SUBTITLE,
  RESERVED_SUBSCRIPTION_TERMS_HTML,
  RESERVED_SUBSCRIPTION_TITLE,
} from '../src/config/reservedSubscriptionCopy.js';

/**
 * Idempotent catalog seed.
 * Copies price from the live subscription product with monthlyEntries === 4.
 * Refuses to invent a price when that product is missing.
 */
async function seedReservedSubscriptionProduct() {
  const snap = await db.collection('products').get();
  const products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const source = products.find(
    (product) => product.type === 'subscription' && Number(product.monthlyEntries) === 4
  );

  if (!source || source.price == null || Number(source.price) <= 0) {
    console.error(
      'Live subscription product with monthlyEntries 4 was not found. Refusing to invent a price.'
    );
    process.exit(1);
  }

  const ref = db.collection('products').doc(RESERVED_SUBSCRIPTION_PRODUCT_ID);
  const existing = await ref.get();
  const now = new Date();
  const catalogFields = {
    title: RESERVED_SUBSCRIPTION_TITLE,
    subtitle: RESERVED_SUBSCRIPTION_SUBTITLE,
    type: 'reserved_subscription',
    price: Number(source.price),
    monthlyEntries: null,
    totalEntries: null,
    validityMonths: null,
    termsHtml: RESERVED_SUBSCRIPTION_TERMS_HTML,
    updatedAt: now,
  };

  if (!existing.exists) {
    await ref.set({
      ...catalogFields,
      sortOrder: 3,
      isActive: true,
      isPurchasable: true,
      createdAt: now,
    });
    console.log(
      `Created ${RESERVED_SUBSCRIPTION_PRODUCT_ID} at ${catalogFields.price} (copied from ${source.id}).`
    );
  } else {
    await ref.set(catalogFields, { merge: true });
    console.log(
      `Updated ${RESERVED_SUBSCRIPTION_PRODUCT_ID} price/title/terms from ${source.id} (${catalogFields.price}). Left active flags unchanged.`
    );
  }

  process.exit(0);
}

seedReservedSubscriptionProduct().catch((error) => {
  console.error(error);
  process.exit(1);
});
