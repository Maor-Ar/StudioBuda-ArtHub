/**
 * Copy event_cancellations docs into event_occurrence_overrides.
 *
 * Dry-run by default. Write with:
 *   node scripts/migrateCancellationsToOverrides.js --write
 */

import { db } from '../src/config/firebase.js';
import { mapLegacyCancellation } from '../src/utils/occurrenceOverrides.js';

const LEGACY_COLLECTION = 'event_cancellations';
const OVERRIDES_COLLECTION = 'event_occurrence_overrides';
const DO_WRITE = process.argv.includes('--write');

async function migrate() {
  console.log(`Migrating ${LEGACY_COLLECTION} -> ${OVERRIDES_COLLECTION}`);
  console.log(DO_WRITE ? 'Mode: WRITE' : 'Mode: DRY RUN (pass --write to apply)');

  const snapshot = await db.collection(LEGACY_COLLECTION).get();
  console.log(`Found ${snapshot.size} legacy cancellation docs`);

  let created = 0;
  let skipped = 0;
  let wouldCreate = 0;

  for (const doc of snapshot.docs) {
    const mapped = mapLegacyCancellation({ id: doc.id, ...doc.data() });
    const targetRef = db.collection(OVERRIDES_COLLECTION).doc(doc.id);
    const existing = await targetRef.get();

    if (existing.exists) {
      skipped += 1;
      continue;
    }

    const payload = {
      eventId: mapped.eventId,
      dateKey: mapped.dateKey,
      isCancelled: mapped.isCancelled,
      cancellationReason: mapped.cancellationReason,
      cancelledBy: mapped.cancelledBy,
      cancelledAt: mapped.cancelledAt || new Date(),
      overrides: {},
      createdAt: mapped.createdAt || mapped.cancelledAt || new Date(),
      updatedAt: mapped.updatedAt || mapped.cancelledAt || new Date(),
      updatedBy: mapped.updatedBy || mapped.cancelledBy || null,
    };

    console.log(`  ${DO_WRITE ? 'create' : 'would create'} ${doc.id} cancelled=${payload.isCancelled}`);

    if (DO_WRITE) {
      await targetRef.set(payload, { merge: true });
      created += 1;
    } else {
      wouldCreate += 1;
    }
  }

  console.log(`Done. created=${created} skippedExisting=${skipped} wouldCreate=${wouldCreate}`);
  if (!DO_WRITE) {
    console.log('Re-run with --write to copy the missing docs. Legacy collection is not deleted.');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
