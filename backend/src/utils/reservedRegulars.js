import { toUtcDateKey } from './helpers.js';
import { EVENT_TYPES, TRANSACTION_TYPES } from '../config/constants.js';

export const reservedRegularIds = (eventOrList) => {
  const raw = Array.isArray(eventOrList) ? eventOrList : eventOrList?.reservedRegularUserIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => typeof id === 'string' && id.length > 0);
};

export const occupiedSeatCount = (dropInCount, regularsSource) => {
  const dropIns = Number(dropInCount);
  const safeDropIns = Number.isFinite(dropIns) && dropIns > 0 ? dropIns : 0;
  return safeDropIns + reservedRegularIds(regularsSource).length;
};

export const isRegularsListFull = (regularsSource, maxRegistrations) => {
  const max = Number(maxRegistrations);
  if (!Number.isFinite(max)) return false;
  return reservedRegularIds(regularsSource).length >= max;
};

export const utcWeekday = (dateValue) => {
  const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getUTCDay();
};

export const isEligibleWeeklyClass = (event, now = new Date()) => {
  if (!event || event.isActive === false) return false;
  if (event.eventType !== EVENT_TYPES.SUBSCRIPTION_ONLY) return false;
  if (!event.isRecurring || Number(event.recurringIntervalDays) !== 7) return false;
  if (!event.recurrenceEndDate) return true;
  const endKey = toUtcDateKey(event.recurrenceEndDate);
  const todayKey = toUtcDateKey(now);
  if (!endKey || !todayKey) return true;
  return endKey >= todayKey;
};

export const startOfNextUtcDay = (from = new Date()) =>
  new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1));

/** Last moment of the calendar month after `from` (UTC). */
export const endOfNextCalendarMonth = (from = new Date()) =>
  new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 2, 0, 23, 59, 59, 999));

export const toDateValue = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isMonthlyAccessType = (transactionType) =>
  transactionType === TRANSACTION_TYPES.SUBSCRIPTION ||
  transactionType === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION;

export const accessEndsDateFromTransaction = (transaction) => {
  if (!isMonthlyAccessType(transaction?.transactionType)) return null;

  const periodStart =
    toDateValue(transaction.lastRenewalDate) ||
    toDateValue(transaction.lastPaymentDate) ||
    toDateValue(transaction.purchaseDate);

  if (!periodStart) return null;

  const accessEndsDate = new Date(periodStart);
  accessEndsDate.setMonth(accessEndsDate.getMonth() + 1);
  return accessEndsDate.toISOString();
};

export const holdsReservedSeat = (transaction, now = new Date()) => {
  if (!transaction || transaction.transactionType !== TRANSACTION_TYPES.RESERVED_SUBSCRIPTION) {
    return false;
  }
  if (!transaction.reservedEventId) return false;
  if (transaction.isActive) return true;
  const releaseAt = toDateValue(transaction.reservationReleaseAt);
  return !!(releaseAt && releaseAt.getTime() > now.getTime());
};

export const lockStillHeld = (lock, now = new Date()) => {
  if (!lock?.eventId) return false;
  const releaseAt = toDateValue(lock.reservationReleaseAt);
  if (releaseAt && releaseAt.getTime() <= now.getTime()) return false;
  return true;
};

/**
 * Drop-in reservation decision. Regulars count toward the cap.
 * Auto-close is skipped when the series already has regulars.
 */
export const evaluateDropInCapacity = ({
  dropInCount = 0,
  reservedRegularUserIds = [],
  maxRegistrations,
  enforceAutoClose = false,
  autoCloseClosed = false,
} = {}) => {
  const regulars = reservedRegularIds(reservedRegularUserIds);
  const occupied = occupiedSeatCount(dropInCount, regulars);
  if (enforceAutoClose && regulars.length === 0 && autoCloseClosed) {
    return { ok: false, reason: 'auto_close', occupied };
  }
  const max = Number(maxRegistrations);
  if (Number.isFinite(max) && occupied >= max) {
    return { ok: false, reason: 'full', occupied };
  }
  return { ok: true, reason: 'ok', occupied };
};
