/**
 * Backfill occurrence_counts and dateKey on existing registrations.
 *
 * Run once after deploying counter-based reads:
 *   node scripts/backfillOccurrenceCounts.js
 */

import { db } from '../src/config/firebase.js';
import { REGISTRATION_STATUS } from '../src/config/constants.js';

const MANUAL_REGISTRATIONS_COLLECTION = 'event_manual_registrations';
const OCCURRENCE_COUNTS_COLLECTION = 'occurrence_counts';

const getDateKey = (dateValue) => {
  if (!dateValue) return null;
  const dateObj = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
  if (Number.isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().split('T')[0];
};

const addCount = (counts, eventId, dateKey) => {
  if (!eventId || !dateKey) return;
  const key = `${eventId}_${dateKey}`;
  const existing = counts.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    counts.set(key, { eventId, dateKey, count: 1 });
  }
};

async function backfill() {
  console.log('Starting occurrence count backfill...');

  const counts = new Map();
  let dateKeyUpdates = 0;

  const [registrationsSnap, manualSnap] = await Promise.all([
    db.collection('event_registrations')
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get(),
    db.collection(MANUAL_REGISTRATIONS_COLLECTION)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get(),
  ]);

  const processDoc = async (collectionName, doc) => {
    const data = doc.data();
    const dateKey = data.dateKey || getDateKey(data.date || data.occurrenceDate);
    if (!data.dateKey && dateKey) {
      await db.collection(collectionName).doc(doc.id).update({ dateKey });
      dateKeyUpdates += 1;
    }
    addCount(counts, data.eventId, dateKey);
  };

  for (const doc of registrationsSnap.docs) {
    await processDoc('event_registrations', doc);
  }

  for (const doc of manualSnap.docs) {
    await processDoc(MANUAL_REGISTRATIONS_COLLECTION, doc);
  }

  let counterWrites = 0;
  const now = new Date();
  const entries = [...counts.values()];

  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + 400);
    chunk.forEach(({ eventId, dateKey, count }) => {
      const docId = `${eventId}_${dateKey}`;
      batch.set(
        db.collection(OCCURRENCE_COUNTS_COLLECTION).doc(docId),
        {
          eventId,
          dateKey,
          count,
          updatedAt: now,
        },
        { merge: true }
      );
      counterWrites += 1;
    });
    await batch.commit();
  }

  console.log(`Backfill complete.`);
  console.log(`- Confirmed registrations scanned: ${registrationsSnap.size + manualSnap.size}`);
  console.log(`- dateKey fields added/updated: ${dateKeyUpdates}`);
  console.log(`- occurrence_counts docs written: ${counterWrites}`);
}

backfill()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
