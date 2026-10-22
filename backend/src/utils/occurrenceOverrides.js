import { ValidationError } from './errors.js';
import { validateName, validatePositiveNumber, validateTime } from './validators.js';

export const OVERRIDABLE_EVENT_FIELDS = [
  'title',
  'description',
  'startTime',
  'duration',
  'instructorName',
  'maxRegistrations',
];

export const getOverrideDocId = (eventId, dateKey) => `${eventId}_${dateKey}`;

export const isOverrideCancelled = (doc) => doc?.isCancelled === true;

export const mapLegacyCancellation = (legacyDoc) => {
  if (!legacyDoc) return null;
  return {
    eventId: legacyDoc.eventId,
    dateKey: legacyDoc.dateKey,
    isCancelled: legacyDoc.isActive !== false,
    cancellationReason: legacyDoc.reason || legacyDoc.cancellationReason || null,
    cancelledBy: legacyDoc.cancelledBy || null,
    cancelledAt: legacyDoc.cancelledAt || null,
    overrides: {},
    createdAt: legacyDoc.cancelledAt || null,
    updatedAt: legacyDoc.updatedAt || legacyDoc.cancelledAt || null,
    updatedBy: legacyDoc.cancelledBy || null,
  };
};

export const sanitizeOverridePatch = (overrides = {}) => {
  const patch = {};
  for (const field of OVERRIDABLE_EVENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(overrides, field)) continue;
    const value = overrides[field];
    if (value === null) {
      patch[field] = null;
      continue;
    }
    if (value === undefined) continue;
    if (field === 'duration' || field === 'maxRegistrations') {
      patch[field] = Number(value);
    } else {
      patch[field] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return patch;
};

export const validateOverridePatch = (patch = {}) => {
  if (patch.title !== undefined && patch.title !== null) {
    validateName(patch.title, 'title');
  }
  if (patch.description !== undefined && patch.description !== null && typeof patch.description !== 'string') {
    throw new ValidationError('Invalid description', 'description');
  }
  if (patch.startTime !== undefined && patch.startTime !== null) {
    validateTime(patch.startTime);
  }
  if (patch.duration !== undefined && patch.duration !== null) {
    validatePositiveNumber(patch.duration, 'duration');
  }
  if (patch.instructorName !== undefined && patch.instructorName !== null) {
    validateName(patch.instructorName, 'instructorName');
  }
  if (patch.maxRegistrations !== undefined && patch.maxRegistrations !== null) {
    validatePositiveNumber(patch.maxRegistrations, 'maxRegistrations');
  }
};

export const mergeOverrideFields = (currentOverrides = {}, patch = {}) => {
  const merged = { ...currentOverrides };
  for (const [field, value] of Object.entries(patch)) {
    if (!OVERRIDABLE_EVENT_FIELDS.includes(field)) continue;
    if (value === null) {
      delete merged[field];
    } else {
      merged[field] = value;
    }
  }
  return merged;
};

export const applyOverrideToEvent = (event, doc) => {
  const rawOverrides = doc?.overrides || {};
  const applied = {};
  const overriddenFields = [];

  for (const field of OVERRIDABLE_EVENT_FIELDS) {
    const value = rawOverrides[field];
    if (value !== undefined && value !== null) {
      applied[field] = value;
      overriddenFields.push(field);
    }
  }

  const cancelled = isOverrideCancelled(doc);
  return {
    ...event,
    ...applied,
    isCancelled: cancelled,
    cancellationReason: cancelled ? (doc?.cancellationReason || null) : null,
    hasOccurrenceOverride: overriddenFields.length > 0,
    overriddenFields,
  };
};
