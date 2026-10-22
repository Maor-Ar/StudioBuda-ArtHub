import {
  applyOverrideToEvent,
  isOverrideCancelled,
  mapLegacyCancellation,
  mergeOverrideFields,
  sanitizeOverridePatch,
} from '../../../src/utils/occurrenceOverrides.js';

describe('occurrenceOverrides', () => {
  const baseEvent = {
    id: 'evt1',
    title: 'ציור',
    description: 'תיאור',
    startTime: '18:00',
    duration: 90,
    instructorName: 'יערה',
    maxRegistrations: 6,
    eventType: 'subscription_only',
  };

  it('applies only whitelisted override fields', () => {
    const resolved = applyOverrideToEvent(baseEvent, {
      isCancelled: false,
      overrides: {
        title: 'צבע',
        maxRegistrations: 3,
        eventType: 'trial',
        price: 50,
      },
    });

    expect(resolved.title).toBe('צבע');
    expect(resolved.maxRegistrations).toBe(3);
    expect(resolved.eventType).toBe('subscription_only');
    expect(resolved.hasOccurrenceOverride).toBe(true);
    expect(resolved.overriddenFields).toEqual(['title', 'maxRegistrations']);
    expect(resolved.isCancelled).toBe(false);
  });

  it('marks cancellation without treating it as a field override', () => {
    const resolved = applyOverrideToEvent(baseEvent, {
      isCancelled: true,
      cancellationReason: 'מחלה',
      overrides: {},
    });

    expect(resolved.isCancelled).toBe(true);
    expect(resolved.cancellationReason).toBe('מחלה');
    expect(resolved.hasOccurrenceOverride).toBe(false);
    expect(resolved.title).toBe('ציור');
  });

  it('maps legacy cancellation docs', () => {
    const mapped = mapLegacyCancellation({
      eventId: 'evt1',
      dateKey: '2026-10-22',
      reason: 'בוטל',
      isActive: true,
      cancelledBy: 'admin',
    });

    expect(isOverrideCancelled(mapped)).toBe(true);
    expect(mapped.cancellationReason).toBe('בוטל');
    expect(mapped.overrides).toEqual({});
  });

  it('merges and removes override fields', () => {
    const merged = mergeOverrideFields(
      { title: 'ישן', instructorName: 'יערה' },
      { title: 'חדש', instructorName: null, duration: 60 }
    );

    expect(merged).toEqual({ title: 'חדש', duration: 60 });
  });

  it('sanitizes numeric override fields', () => {
    const patch = sanitizeOverridePatch({
      duration: '75',
      maxRegistrations: '4',
      title: '  שיעור  ',
      unknown: 'nope',
    });

    expect(patch).toEqual({
      duration: 75,
      maxRegistrations: 4,
      title: 'שיעור',
    });
  });
});
