import { db } from '../config/firebase.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  applyOverrideToEvent,
  getOverrideDocId,
  isOverrideCancelled,
  mapLegacyCancellation,
  mergeOverrideFields,
  sanitizeOverridePatch,
  validateOverridePatch,
} from '../utils/occurrenceOverrides.js';

export const OCCURRENCE_OVERRIDES_COLLECTION = 'event_occurrence_overrides';
export const LEGACY_CANCELLATIONS_COLLECTION = 'event_cancellations';

const toIso = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

class OccurrenceOverrideService {
  getDocId(eventId, dateKey) {
    return getOverrideDocId(eventId, dateKey);
  }

  isCancelled(doc) {
    return isOverrideCancelled(doc);
  }

  applyToEvent(event, doc) {
    return applyOverrideToEvent(event, doc);
  }

  formatDoc(docId, data) {
    if (!data) return null;
    return {
      id: docId,
      eventId: data.eventId,
      dateKey: data.dateKey,
      isCancelled: isOverrideCancelled(data),
      cancellationReason: data.cancellationReason || null,
      cancelledBy: data.cancelledBy || null,
      cancelledAt: toIso(data.cancelledAt),
      overrides: data.overrides || {},
      updatedAt: toIso(data.updatedAt),
      updatedBy: data.updatedBy || null,
    };
  }

  async getForOccurrence(eventId, dateKey) {
    const map = await this.getForOccurrences([{ eventId, dateKey }]);
    return map.get(this.getDocId(eventId, dateKey)) || null;
  }

  async getForOccurrences(occurrenceKeys) {
    const map = new Map();
    if (!occurrenceKeys?.length) {
      return map;
    }

    const uniqueDocIds = [
      ...new Set(
        occurrenceKeys
          .filter(({ eventId, dateKey }) => eventId && dateKey)
          .map(({ eventId, dateKey }) => this.getDocId(eventId, dateKey))
      ),
    ];

    for (let i = 0; i < uniqueDocIds.length; i += 100) {
      const chunkIds = uniqueDocIds.slice(i, i + 100);
      const overrideRefs = chunkIds.map((docId) =>
        db.collection(OCCURRENCE_OVERRIDES_COLLECTION).doc(docId)
      );
      const snapshots = await db.getAll(...overrideRefs);
      const missingIds = [];

      snapshots.forEach((doc, idx) => {
        const docId = chunkIds[idx];
        if (doc.exists) {
          map.set(docId, doc.data());
        } else {
          missingIds.push(docId);
        }
      });

      if (missingIds.length === 0) continue;

      const legacyRefs = missingIds.map((docId) =>
        db.collection(LEGACY_CANCELLATIONS_COLLECTION).doc(docId)
      );
      const legacySnapshots = await db.getAll(...legacyRefs);
      legacySnapshots.forEach((doc, idx) => {
        map.set(missingIds[idx], doc.exists ? mapLegacyCancellation(doc.data()) : null);
      });
    }

    return map;
  }

  async setCancelled(eventId, dateKey, { reason, adminId }) {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
      throw new ValidationError('Cancellation reason is required', 'reason');
    }

    const now = new Date();
    const docId = this.getDocId(eventId, dateKey);
    const ref = db.collection(OCCURRENCE_OVERRIDES_COLLECTION).doc(docId);
    const existing = await ref.get();
    const existingData = existing.exists ? existing.data() : {};

    const payload = {
      eventId,
      dateKey,
      isCancelled: true,
      cancellationReason: trimmedReason,
      cancelledBy: adminId,
      cancelledAt: now,
      overrides: existingData.overrides || {},
      createdAt: existingData.createdAt || now,
      updatedAt: now,
      updatedBy: adminId,
    };

    await ref.set(payload, { merge: true });
    return this.formatDoc(docId, payload);
  }

  async setReenabled(eventId, dateKey, adminId) {
    const now = new Date();
    const docId = this.getDocId(eventId, dateKey);
    const ref = db.collection(OCCURRENCE_OVERRIDES_COLLECTION).doc(docId);
    const existing = await ref.get();
    let existingData = existing.exists ? existing.data() : null;

    if (!existingData) {
      const legacy = await db.collection(LEGACY_CANCELLATIONS_COLLECTION).doc(docId).get();
      existingData = legacy.exists ? mapLegacyCancellation(legacy.data()) : null;
    }

    if (!existingData || !isOverrideCancelled(existingData)) {
      throw new NotFoundError('This event occurrence is not cancelled', 'eventId');
    }

    const payload = {
      eventId,
      dateKey,
      isCancelled: false,
      cancellationReason: existingData.cancellationReason || null,
      cancelledBy: existingData.cancelledBy || adminId,
      cancelledAt: existingData.cancelledAt || now,
      overrides: existingData.overrides || {},
      createdAt: existingData.createdAt || now,
      updatedAt: now,
      updatedBy: adminId,
    };

    await ref.set(payload, { merge: true });
    return this.formatDoc(docId, payload);
  }

  async setOverrides(eventId, dateKey, overrides, adminId) {
    const patch = sanitizeOverridePatch(overrides);
    if (Object.keys(patch).length === 0) {
      throw new ValidationError('No occurrence fields to update', 'overrides');
    }
    validateOverridePatch(patch);

    const now = new Date();
    const docId = this.getDocId(eventId, dateKey);
    const ref = db.collection(OCCURRENCE_OVERRIDES_COLLECTION).doc(docId);
    const existing = await ref.get();
    const existingData = existing.exists ? existing.data() : {};

    const payload = {
      eventId,
      dateKey,
      isCancelled: existingData.isCancelled === true,
      cancellationReason: existingData.cancellationReason || null,
      cancelledBy: existingData.cancelledBy || null,
      cancelledAt: existingData.cancelledAt || null,
      overrides: mergeOverrideFields(existingData.overrides || {}, patch),
      createdAt: existingData.createdAt || now,
      updatedAt: now,
      updatedBy: adminId,
    };

    await ref.set(payload, { merge: true });
    return this.formatDoc(docId, payload);
  }

  async rekeyFromEvent(oldEventId, newEventId, minDateKey) {
    const snapshot = await db
      .collection(OCCURRENCE_OVERRIDES_COLLECTION)
      .where('eventId', '==', oldEventId)
      .get();

    const operations = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      if (!data.dateKey || data.dateKey < minDateKey) return;
      const newDocId = this.getDocId(newEventId, data.dateKey);
      operations.push((batch) => {
        batch.set(db.collection(OCCURRENCE_OVERRIDES_COLLECTION).doc(newDocId), {
          ...data,
          eventId: newEventId,
          updatedAt: new Date(),
        });
        batch.delete(doc.ref);
      });
    });

    return operations;
  }
}

export default new OccurrenceOverrideService();
