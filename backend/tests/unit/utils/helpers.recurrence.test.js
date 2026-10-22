import {
  generateRecurringInstances,
  shouldSplitRecurringSeries,
  subtractOneUtcDayKey,
  toUtcDateKey,
} from '../../../src/utils/helpers.js';

describe('recurring event helpers', () => {
  const baseEvent = {
    id: 'evt1',
    isRecurring: true,
    recurringIntervalDays: 7,
    date: { toDate: () => new Date('2026-01-07T00:00:00.000Z') },
    title: 'ציור',
  };

  it('stops generating instances after recurrenceEndDate', () => {
    const instances = generateRecurringInstances(
      {
        ...baseEvent,
        recurrenceEndDate: new Date('2026-01-21T00:00:00.000Z'),
      },
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z')
    );

    expect(instances.map((item) => item.id)).toEqual([
      'evt1_2026-01-07',
      'evt1_2026-01-14',
      'evt1_2026-01-21',
    ]);
  });

  it('generates endlessly within the requested window when no end date is set', () => {
    const instances = generateRecurringInstances(
      baseEvent,
      new Date('2026-01-07T00:00:00.000Z'),
      new Date('2026-01-28T00:00:00.000Z')
    );

    expect(instances).toHaveLength(4);
  });

  it('computes the previous UTC day for series splits', () => {
    expect(subtractOneUtcDayKey('2026-10-22')).toBe('2026-10-21');
    expect(subtractOneUtcDayKey('2026-03-01')).toBe('2026-02-28');
  });

  it('splits only when the selected date is after the series start', () => {
    expect(shouldSplitRecurringSeries(baseEvent, '2026-01-14')).toBe(true);
    expect(shouldSplitRecurringSeries(baseEvent, '2026-01-07')).toBe(false);
    expect(shouldSplitRecurringSeries({ ...baseEvent, isRecurring: false }, '2026-01-14')).toBe(false);
  });

  it('reads UTC date keys from timestamps and dates', () => {
    expect(toUtcDateKey(new Date('2026-10-22T00:00:00.000Z'))).toBe('2026-10-22');
    expect(toUtcDateKey({ toDate: () => new Date('2026-10-22T00:00:00.000Z') })).toBe('2026-10-22');
  });
});
