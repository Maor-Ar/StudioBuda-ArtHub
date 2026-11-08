import { isRegistrationClosedForNoSignups } from '../../../src/utils/helpers.js';
import {
  accessEndsDateFromTransaction,
  endOfNextCalendarMonth,
  evaluateDropInCapacity,
  holdsReservedSeat,
  isEligibleWeeklyClass,
  isRegularsListFull,
  occupiedSeatCount,
  startOfNextUtcDay,
  utcWeekday,
} from '../../../src/utils/reservedRegulars.js';

describe('reserved regular capacity', () => {
  it('counts drop-ins plus the regulars list, without double-counting', () => {
    expect(occupiedSeatCount(3, ['a', 'b'])).toBe(5);
    expect(occupiedSeatCount(0, [])).toBe(0);
    expect(occupiedSeatCount(4, { reservedRegularUserIds: ['a'] })).toBe(5);
  });

  it('lets a date display above max while still rejecting a new drop-in', () => {
    const decision = evaluateDropInCapacity({
      dropInCount: 4,
      reservedRegularUserIds: ['a', 'b', 'c'],
      maxRegistrations: 6,
    });
    expect(decision.occupied).toBe(7);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe('full');
  });

  it('does not auto-close a class that has only regulars', () => {
    expect(
      isRegistrationClosedForNoSignups({
        dateValue: new Date(),
        startTime: '00:00',
        registeredCount: occupiedSeatCount(0, ['regular-1']),
      })
    ).toBe(false);

    const decision = evaluateDropInCapacity({
      dropInCount: 0,
      reservedRegularUserIds: ['regular-1'],
      maxRegistrations: 6,
      enforceAutoClose: true,
      autoCloseClosed: true,
    });
    expect(decision.ok).toBe(true);
  });

  it('still auto-closes an empty class with no regulars', () => {
    const decision = evaluateDropInCapacity({
      dropInCount: 0,
      reservedRegularUserIds: [],
      maxRegistrations: 6,
      enforceAutoClose: true,
      autoCloseClosed: true,
    });
    expect(decision.reason).toBe('auto_close');
  });

  it('grays a class only when the regulars list itself is full', () => {
    expect(isRegularsListFull(['a', 'b'], 2)).toBe(true);
    expect(isRegularsListFull(['a'], 6)).toBe(false);
  });

  it('lists Sunday as weekday 0 and keeps an ongoing weekly subscription class', () => {
    expect(utcWeekday(new Date('2026-11-08T00:00:00.000Z'))).toBe(0);
    expect(
      isEligibleWeeklyClass({
        isActive: true,
        isRecurring: true,
        recurringIntervalDays: 7,
        eventType: 'subscription_only',
        recurrenceEndDate: null,
      })
    ).toBe(true);
    expect(
      isEligibleWeeklyClass({
        isActive: true,
        isRecurring: true,
        recurringIntervalDays: 7,
        eventType: 'trial',
      })
    ).toBe(false);
  });

  it('holds a cancelled seat only until reservationReleaseAt', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(
      holdsReservedSeat({
        transactionType: 'reserved_subscription',
        reservedEventId: 'evt',
        isActive: false,
        reservationReleaseAt: future,
      })
    ).toBe(true);
    expect(
      holdsReservedSeat({
        transactionType: 'reserved_subscription',
        reservedEventId: 'evt',
        isActive: false,
        reservationReleaseAt: past,
      })
    ).toBe(false);
  });

  it('scans from the next day through the end of the next calendar month', () => {
    const from = new Date('2026-11-08T15:00:00.000Z');
    expect(startOfNextUtcDay(from).toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(endOfNextCalendarMonth(from).toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('gives reserved subscriptions the same one-month access end and no entrance counter', () => {
    const iso = accessEndsDateFromTransaction({
      transactionType: 'reserved_subscription',
      lastRenewalDate: '2026-11-08T10:00:00.000Z',
    });
    expect(iso.startsWith('2026-12-08')).toBe(true);
    expect(accessEndsDateFromTransaction({ transactionType: 'punch_card' })).toBeNull();
  });
});
