import { describe, expect, it } from '@jest/globals';

import {
  budgetProgress,
  compareByAttention,
  daysElapsed,
  roundUpNice,
  suggestBudget,
  suggestionWindow,
} from './budgets';

const november = { year: 2026, month: 11 };

describe('budget progress', () => {
  it('counts the days of the month that have passed, including today', () => {
    expect(daysElapsed(november, '2026-10-31')).toBe(0);
    expect(daysElapsed(november, '2026-11-01')).toBe(1);
    expect(daysElapsed(november, '2026-11-17')).toBe(17);
    expect(daysElapsed(november, '2026-12-05')).toBe(30);
    expect(daysElapsed({ year: 2028, month: 2 }, '2028-03-01')).toBe(29);
  });

  it('is on track at or below an even pace', () => {
    // 450,000 for November; by the 17th an even pace is 255,000.
    const progress = budgetProgress(450000, 255000, november, '2026-11-17');
    expect(progress).toMatchObject({
      expectedMinor: 255000,
      status: 'on_track',
      remainingMinor: 195000,
      daysInMonth: 30,
      daysLeft: 14,
      perDayLeftMinor: 13928,
      projectedMinor: 450000,
    });
    expect(progress.ratio).toBeCloseTo(0.5667, 3);
  });

  it('is ahead of pace above an even pace, and over once past the budget', () => {
    expect(budgetProgress(450000, 255001, november, '2026-11-17').status).toBe('ahead');
    expect(budgetProgress(450000, 450000, november, '2026-11-17').status).toBe('ahead');
    const over = budgetProgress(450000, 500000, november, '2026-11-17');
    expect(over).toMatchObject({ status: 'over', remainingMinor: -50000, perDayLeftMinor: 0 });
    expect(over.ratio).toBeCloseTo(1.111, 3);
  });

  it('handles the first and last day, past months and months not started', () => {
    expect(budgetProgress(300000, 0, november, '2026-11-01')).toMatchObject({
      expectedMinor: 10000,
      daysLeft: 30,
      perDayLeftMinor: 10000,
      projectedMinor: 0,
    });
    expect(budgetProgress(300000, 290000, november, '2026-11-30')).toMatchObject({
      daysLeft: 1,
      perDayLeftMinor: 10000,
      status: 'on_track',
    });
    // A finished month: nothing left to spend in, the projection is the result.
    expect(budgetProgress(300000, 320000, { year: 2026, month: 10 }, '2026-11-17')).toMatchObject({
      daysLeft: 0,
      perDayLeftMinor: null,
      projectedMinor: 320000,
      status: 'over',
    });
    expect(budgetProgress(300000, 0, { year: 2026, month: 12 }, '2026-11-17')).toMatchObject({
      daysLeft: 31,
      expectedMinor: 0,
      status: 'on_track',
    });
  });

  it('puts the budgets that need attention first', () => {
    const fine = budgetProgress(100000, 10000, november, '2026-11-17');
    const busy = budgetProgress(100000, 70000, november, '2026-11-17');
    const busier = budgetProgress(100000, 90000, november, '2026-11-17');
    const over = budgetProgress(100000, 120000, november, '2026-11-17');
    expect([fine, busy, over, busier].sort(compareByAttention)).toEqual([over, busier, busy, fine]);
  });
});

describe('budget suggestions', () => {
  it('rounds up to two significant figures of whole units', () => {
    expect(roundUpNice(444977, 0)).toBe(450000);
    expect(roundUpNice(1366999, 0)).toBe(1400000);
    expect(roundUpNice(36000, 0)).toBe(36000);
    expect(roundUpNice(129375, 0)).toBe(130000);
    expect(roundUpNice(7, 0)).toBe(7);
    // 123.45 USD becomes 130.00, and anything under one unit becomes one unit.
    expect(roundUpNice(12345, 2)).toBe(13000);
    expect(roundUpNice(40, 2)).toBe(100);
    expect(roundUpNice(0, 2)).toBe(0);
  });

  it('looks back up to 90 days from the first entry and needs a week of history', () => {
    expect(suggestionWindow('2026-10-30', '2026-11-17')).toEqual({
      from: '2026-10-30',
      to: '2026-11-17',
      days: 19,
    });
    expect(suggestionWindow('2026-01-01', '2026-11-17')).toEqual({
      from: '2026-08-20',
      to: '2026-11-17',
      days: 90,
    });
    expect(suggestionWindow('2026-11-12', '2026-11-17')).toBeNull();
    expect(suggestionWindow(null, '2026-11-17')).toBeNull();
  });

  it('scales the daily average to the month and rounds it up', () => {
    // 237,321 over 16 days is about 444,977 for a 30-day month.
    expect(suggestBudget(237321, 16, 30, 0)).toBe(450000);
    expect(suggestBudget(0, 16, 30, 0)).toBeNull();
    expect(suggestBudget(237321, 5, 30, 0)).toBeNull();
  });
});
