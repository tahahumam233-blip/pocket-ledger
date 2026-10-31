import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  compareYearMonth,
  formatClockTime,
  formatDateLabel,
  isValidIsoDate,
  monthLabel,
  monthRange,
  shiftYearMonth,
  toIsoDate,
  yearMonthOf,
} from './dates';

describe('dates', () => {
  it('validates ISO dates including month lengths and leap years', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-1-01')).toBe(false);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
  });

  it('uses the local calendar for date-only values', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('works with months', () => {
    expect(monthRange({ year: 2026, month: 2 })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
    expect(shiftYearMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftYearMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(compareYearMonth({ year: 2026, month: 3 }, { year: 2026, month: 2 })).toBe(1);
    expect(yearMonthOf('2026-07-14')).toEqual({ year: 2026, month: 7 });
    expect(monthLabel({ year: 2026, month: 10 })).toBe('October 2026');
    expect(monthLabel({ year: 2026, month: 10 }, { short: true })).toBe('Oct 2026');
  });

  it('labels dates relative to today', () => {
    const today = '2026-10-31';
    expect(formatDateLabel('2026-10-31', today)).toBe('Today');
    expect(formatDateLabel('2026-10-30', today)).toBe('Yesterday');
    expect(formatDateLabel('2026-10-28', today)).toBe('Wed, 28 Oct');
    expect(formatDateLabel('2025-12-25', today)).toBe('25 Dec 2025');
  });

  it('formats clock times', () => {
    expect(formatClockTime(21, 0)).toBe('9:00 PM');
    expect(formatClockTime(0, 5)).toBe('12:05 AM');
    expect(formatClockTime(12, 30)).toBe('12:30 PM');
  });
});
