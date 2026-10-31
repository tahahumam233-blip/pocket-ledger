import { getCurrency } from './currency';
import { minorToDecimalString } from './money';

export type CsvTransactionRow = {
  transactionId: string;
  postedDate: string;
  kind: string;
  account: string;
  category: string;
  currency: string;
  amountMinor: number;
  note: string;
  hasReceipt: boolean;
  createdAt: string;
};

export const CSV_HEADERS = [
  'Date',
  'Type',
  'Account',
  'Category',
  'Currency',
  'Amount',
  'Note',
  'Receipt',
  'Transaction ID',
  'Recorded At',
] as const;

export function escapeCsvCell(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds a UTF-8 CSV (with BOM so spreadsheets detect encoding) of ledger lines. */
export function buildTransactionsCsv(rows: readonly CsvTransactionRow[]): string {
  const lines = [CSV_HEADERS.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    const digits = getCurrency(row.currency).fractionDigits;
    lines.push(
      [
        row.postedDate,
        row.kind,
        row.account,
        row.category,
        row.currency,
        minorToDecimalString(row.amountMinor, digits),
        row.note,
        row.hasReceipt ? 'yes' : 'no',
        row.transactionId,
        row.createdAt,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
