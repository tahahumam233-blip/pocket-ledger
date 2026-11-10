import {
  amountDecimal,
  amountText,
  balanceSide,
  balanceText,
  type StatementDocument,
} from './document';
import type { StatementTheme } from './theme';
import { buildXlsx, type XlsxCell, type XlsxRow, type XlsxStyle } from './xlsx';

/** Columns: Date, Description, Note, Debit, Credit, Balance, Dr/Cr. */
const COLUMN_WIDTHS = [16, 40, 30, 15, 15, 15, 7];
const DATE_FORMAT = 'd mmm yyyy';

function numberFormat(fractionDigits: number): string {
  return fractionDigits > 0 ? `#,##0.${'0'.repeat(fractionDigits)}` : '#,##0';
}

/**
 * The statement as an Excel workbook: a short heading, then one row per entry
 * with real dates and numbers so the figures can be sorted, summed and edited.
 */
export function buildStatementXlsx(document: StatementDocument, theme: StatementTheme): Uint8Array {
  const money = numberFormat(document.fractionDigits);
  const tone =
    document.standing === 'receivable'
      ? theme.income
      : document.standing === 'payable'
        ? theme.expense
        : theme.text;

  const label: XlsxStyle = { color: theme.textMuted };
  const value: XlsxStyle = { color: theme.text };
  const head: XlsxStyle = { bold: true, color: '#FFFFFF', fill: theme.primary };
  const body: XlsxStyle = { color: theme.text, borderBottom: theme.border };
  const bodyWrap: XlsxStyle = { ...body, wrap: true };
  const bodyMuted: XlsxStyle = { ...bodyWrap, color: theme.textMuted };
  const bodyMoney: XlsxStyle = { ...body, format: money, align: 'right' };
  const bodySide: XlsxStyle = { ...body, color: theme.textMuted };
  const total: XlsxStyle = { bold: true, color: theme.text, fill: theme.surfaceMuted };
  const totalMoney: XlsxStyle = { ...total, format: money, align: 'right' };
  const closing: XlsxStyle = { bold: true, color: theme.text, borderBottom: theme.border };

  const text = (content: string, style?: XlsxStyle): XlsxCell => ({
    type: 'text',
    value: content,
    style,
  });
  const amount = (minor: number, style: XlsxStyle): XlsxCell =>
    minor === 0
      ? { type: 'blank', style }
      : { type: 'number', value: amountDecimal(document, minor), style };
  const balance = (minor: number, style: XlsxStyle): XlsxCell => ({
    type: 'number',
    value: amountDecimal(document, minor),
    style,
  });

  const rows: XlsxRow[] = [
    {
      height: 26,
      cells: [text(document.title, { bold: true, size: 16, color: theme.primary })],
    },
    { height: 20, cells: [text(document.partyName, { bold: true, size: 13, color: theme.text })] },
    { cells: [] },
    { cells: [text('Period', label), text(document.periodLabel, value)] },
    { cells: [text('Currency', label), text(document.currency, value)] },
    {
      cells: [
        text('Prepared', label),
        text(document.preparedLabel.replace(/^Prepared /, ''), value),
      ],
    },
    {
      cells: [
        text('Closing balance', label),
        text(
          `${document.currency} ${balanceText(document, document.closingMinor)}  (${document.standingLabel})`,
          { bold: true, color: tone },
        ),
      ],
    },
    { cells: [] },
  ];

  const headerRow = rows.length + 1;
  rows.push({
    height: 22,
    cells: [
      text('Date', head),
      text('Description', head),
      text('Note', head),
      text('Debit', { ...head, align: 'right' }),
      text('Credit', { ...head, align: 'right' }),
      text('Balance', { ...head, align: 'right' }),
      text('Dr/Cr', head),
    ],
  });

  rows.push({
    cells: [
      { type: 'blank', style: body },
      text('Opening balance b/f', body),
      { type: 'blank', style: body },
      { type: 'blank', style: body },
      { type: 'blank', style: body },
      balance(document.openingMinor, bodyMoney),
      text(balanceSide(document.openingMinor), bodySide),
    ],
  });

  const firstEntryRow = rows.length + 1;
  for (const row of document.rows) {
    rows.push({
      cells: [
        { type: 'date', value: row.date, style: { ...body, format: DATE_FORMAT, align: 'left' } },
        text(row.description, bodyWrap),
        row.note ? text(row.note, bodyMuted) : { type: 'blank', style: body },
        amount(row.debitMinor, bodyMoney),
        amount(row.creditMinor, bodyMoney),
        balance(row.balanceMinor, bodyMoney),
        text(balanceSide(row.balanceMinor), bodySide),
      ],
    });
  }
  const lastEntryRow = rows.length;

  // Totals are formulas so they follow edits, with the values stored too so
  // previews that do not calculate still show them.
  const sum = (column: string, minor: number): XlsxCell => ({
    type: 'number',
    value: amountDecimal(document, minor),
    formula:
      lastEntryRow >= firstEntryRow
        ? `SUM(${column}${firstEntryRow}:${column}${lastEntryRow})`
        : undefined,
    style: totalMoney,
  });
  rows.push({
    height: 20,
    cells: [
      { type: 'blank', style: total },
      text('Totals', total),
      { type: 'blank', style: total },
      sum('D', document.totalDebitsMinor),
      sum('E', document.totalCreditsMinor),
      { type: 'blank', style: total },
      { type: 'blank', style: total },
    ],
  });
  rows.push({
    height: 20,
    cells: [
      { type: 'blank', style: closing },
      text('Closing balance c/f', closing),
      { type: 'blank', style: closing },
      { type: 'blank', style: closing },
      { type: 'blank', style: closing },
      balance(document.closingMinor, { ...closing, color: tone, format: money, align: 'right' }),
      text(balanceSide(document.closingMinor), { ...closing, color: tone }),
    ],
  });
  rows.push({ cells: [] });
  rows.push({
    cells: [
      null,
      text(
        document.standing === 'nil'
          ? document.standingLabel
          : `${document.standingLabel}: ${document.currency} ${amountText(document, document.closingMinor)}`,
        { bold: true, color: tone },
      ),
    ],
  });
  rows.push({
    cells: [null, text('Dr is a receivable from the party. Cr is a payable to the party.', label)],
  });
  rows.push({
    cells: [null, text(`Prepared with ${document.appName}`, { color: theme.textSubtle })],
  });

  return buildXlsx(
    {
      name: 'Statement',
      columnWidths: COLUMN_WIDTHS,
      rows,
      freezeRows: headerRow,
      printTitleRow: headerRow,
    },
    { created: new Date(`${document.preparedOn}T00:00:00Z`) },
  );
}
