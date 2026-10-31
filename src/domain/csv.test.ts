import { describe, expect, it } from '@jest/globals';

import { buildTransactionsCsv, escapeCsvCell } from './csv';

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('writes decimal amounts using each currency fraction digits', () => {
    const csv = buildTransactionsCsv([
      {
        transactionId: 't1',
        postedDate: '2026-10-31',
        kind: 'expense',
        account: 'Pocket',
        category: 'Food & Drink',
        currency: 'USD',
        amountMinor: -1250,
        note: 'Lunch, with friends',
        hasReceipt: true,
        createdAt: '2026-10-31T12:00:00.000Z',
      },
      {
        transactionId: 't2',
        postedDate: '2026-10-30',
        kind: 'income',
        account: 'Bank',
        category: 'Salary',
        currency: 'IQD',
        amountMinor: 1500000,
        note: '',
        hasReceipt: false,
        createdAt: '2026-10-30T12:00:00.000Z',
      },
    ]);
    const [header, first, second] = csv.replace('﻿', '').trim().split('\r\n');
    expect(header).toBe(
      'Date,Type,Account,Category,Currency,Amount,Note,Receipt,Transaction ID,Recorded At',
    );
    expect(first).toBe(
      '2026-10-31,expense,Pocket,Food & Drink,USD,-12.50,"Lunch, with friends",yes,t1,2026-10-31T12:00:00.000Z',
    );
    expect(second).toBe(
      '2026-10-30,income,Bank,Salary,IQD,1500000,,no,t2,2026-10-30T12:00:00.000Z',
    );
  });
});
