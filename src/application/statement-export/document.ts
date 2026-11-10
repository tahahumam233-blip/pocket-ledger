import {
  type CurrencyCode,
  debtStanding,
  formatNumber,
  formatShortDate,
  getCurrency,
  type IsoDate,
  type MinorUnits,
  minorToDecimalString,
  type Statement,
} from '@/domain';

export type StatementStanding = 'receivable' | 'payable' | 'nil';

export type StatementDocumentRow = {
  date: IsoDate;
  dateLabel: string;
  description: string;
  note: string;
  debitMinor: MinorUnits;
  creditMinor: MinorUnits;
  /** Signed running balance: positive is a debit (receivable) balance. */
  balanceMinor: MinorUnits;
};

/**
 * Everything a statement file shows, worked out once so the PDF and the Excel
 * workbook can never disagree with each other or with the screen.
 */
export type StatementDocument = {
  title: string;
  partyName: string;
  currency: CurrencyCode;
  fractionDigits: 0 | 2 | 3;
  periodLabel: string;
  preparedOn: IsoDate;
  /** For example "Prepared 10 Nov 2026 by Taha". */
  preparedLabel: string;
  appName: string;
  openingMinor: MinorUnits;
  totalDebitsMinor: MinorUnits;
  totalCreditsMinor: MinorUnits;
  closingMinor: MinorUnits;
  standing: StatementStanding;
  /** For example "Receivable from Ali". */
  standingLabel: string;
  rows: StatementDocumentRow[];
  /** File name without its extension. */
  fileBaseName: string;
};

export type StatementDocumentOptions = {
  partyName: string;
  today: IsoDate;
  appName: string;
  /** The ledger owner's name, when they entered one. */
  preparedBy?: string;
};

function describePeriod(statement: Statement, today: IsoDate): string {
  const { from, to } = statement;
  if (from && to) return `${formatShortDate(from)} to ${formatShortDate(to)}`;
  if (from) return `From ${formatShortDate(from)}`;
  if (to) return `Up to ${formatShortDate(to)}`;
  return `All entries up to ${formatShortDate(today)}`;
}

/** Keeps letters and digits of any script, so a name stays readable in a file name. */
function fileSafe(text: string): string {
  const safe = text
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return safe || 'party';
}

export function buildStatementDocument(
  statement: Statement,
  options: StatementDocumentOptions,
): StatementDocument {
  const partyName = options.partyName.trim() || 'Party';
  const preparedBy = options.preparedBy?.trim();
  const standing: StatementStanding =
    debtStanding(statement.closingMinor) === 'owes_you'
      ? 'receivable'
      : debtStanding(statement.closingMinor) === 'you_owe'
        ? 'payable'
        : 'nil';
  const range =
    statement.from && statement.to ? `${statement.from}_to_${statement.to}` : options.today;
  return {
    title: 'Statement of account',
    partyName,
    currency: statement.currency,
    fractionDigits: getCurrency(statement.currency).fractionDigits,
    periodLabel: describePeriod(statement, options.today),
    preparedOn: options.today,
    preparedLabel: `Prepared ${formatShortDate(options.today)}${preparedBy ? ` by ${preparedBy}` : ''}`,
    appName: options.appName,
    openingMinor: statement.openingMinor,
    totalDebitsMinor: statement.totalGaveMinor,
    totalCreditsMinor: statement.totalGotMinor,
    closingMinor: statement.closingMinor,
    standing,
    standingLabel:
      standing === 'receivable'
        ? `Receivable from ${partyName}`
        : standing === 'payable'
          ? `Payable to ${partyName}`
          : `Nil balance with ${partyName}`,
    rows: statement.entries.map((entry) => ({
      date: entry.postedDate,
      dateLabel: formatShortDate(entry.postedDate),
      description: entry.description,
      note: entry.note.trim(),
      debitMinor: entry.gaveMinor,
      creditMinor: entry.gotMinor,
      balanceMinor: entry.balanceMinor,
    })),
    fileBaseName: `Statement-${fileSafe(partyName)}-${statement.currency}-${range}`,
  };
}

/** An amount as printed in a statement column, such as "1,250.50". */
export function amountText(document: StatementDocument, minor: MinorUnits): string {
  return formatNumber(Math.abs(minor), document.fractionDigits);
}

/** "Dr" for a debit balance, "Cr" for a credit balance, nothing for nil. */
export function balanceSide(minor: MinorUnits): 'Dr' | 'Cr' | '' {
  return minor > 0 ? 'Dr' : minor < 0 ? 'Cr' : '';
}

/** A balance as printed in a statement, such as "1,250.50 Dr". */
export function balanceText(document: StatementDocument, minor: MinorUnits): string {
  const side = balanceSide(minor);
  return side ? `${amountText(document, minor)} ${side}` : amountText(document, minor);
}

/** An amount as an exact decimal for a spreadsheet cell, such as "1250.50". */
export function amountDecimal(document: StatementDocument, minor: MinorUnits): string {
  return minorToDecimalString(Math.abs(minor), document.fractionDigits);
}
