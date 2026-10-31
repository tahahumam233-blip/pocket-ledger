import { describe, expect, it } from '@jest/globals';

import { reminderCalendarUrl } from '@/platform/calendar-reminder';

import { allSlots, buildReminderIcs, reminderFileName } from '../../scripts/lib/reminder-ics';

describe('nightly reminder calendar file', () => {
  it('describes a daily floating-time event with an alert at the chosen time', () => {
    const ics = buildReminderIcs(21, 30, { url: 'https://example.com/pocket-ledger/' });
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTART:20260101T213000');
    expect(lines).toContain('RRULE:FREQ=DAILY');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain('URL:https://example.com/pocket-ledger/');
    expect(lines).toContain('UID:nightly-spending-reminder@pocket-ledger');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    for (const line of lines) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
  });

  it('escapes text and folds long lines', () => {
    const ics = buildReminderIcs(9, 0, {
      title: 'Spend, save; repeat',
      description: 'x'.repeat(200),
    });
    expect(ics).toContain('SUMMARY:Spend\\, save\; repeat');
    expect(ics).toContain('\r\n x');
  });

  it('publishes one file per five minutes and rejects other times', () => {
    expect(allSlots()).toHaveLength(288);
    expect(reminderFileName(0, 0)).toBe('pocket-ledger-0000.ics');
    expect(reminderFileName(21, 5)).toBe('pocket-ledger-2105.ics');
    expect(() => buildReminderIcs(21, 7)).toThrow(RangeError);
    expect(() => buildReminderIcs(24, 0)).toThrow(RangeError);
  });

  it('points the app at the matching published file', () => {
    expect(reminderCalendarUrl(21, 0)).toBe('/reminders/pocket-ledger-2100.ics');
    expect(reminderCalendarUrl(7, 58)).toBe('/reminders/pocket-ledger-0800.ics');
    expect(reminderCalendarUrl(23, 59)).toBe('/reminders/pocket-ledger-0000.ics');
    expect(reminderCalendarUrl(7, 2)).toBe('/reminders/pocket-ledger-0700.ics');
  });
});
