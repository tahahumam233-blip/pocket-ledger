import { escapeCsvCell, getCurrency, type MinorUnits, minorToDecimalString } from '@/domain';

import type { LedgerExportDocument } from './document';

export const LEDGER_CSV_HEADERS = [
  'Entry no.',
  'Date',
  'Type',
  'Description',
  'Account',
  'Account class',
  'Currency',
  'Debit',
  'Credit',
  'Category',
  'Party',
  'Note',
  'Receipts',
  'Recorded at (UTC)',
  'Entry ID',
] as const;

/**
 * The general journal as one flat table: every debit and credit line with its
 * entry's details repeated, so any tool can rebuild balances and reports from
 * this file alone. UTF-8 with a byte order mark so spreadsheets detect it.
 */
export function buildLedgerCsv(document: LedgerExportDocument): string {
  const rows = [LEDGER_CSV_HEADERS.map(escapeCsvCell).join(',')];
  for (const line of document.journal) {
    const digits = getCurrency(line.currency).fractionDigits;
    const amount = (minor: MinorUnits) => (minor ? minorToDecimalString(minor, digits) : '');
    rows.push(
      [
        line.entryNumber,
        line.date,
        line.type,
        line.description,
        line.account,
        line.accountClass,
        line.currency,
        amount(line.debitMinor),
        amount(line.creditMinor),
        line.category,
        line.party,
        line.note,
        line.receipts,
        line.recordedAt,
        line.entryId,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}
