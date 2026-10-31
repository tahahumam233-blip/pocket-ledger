import { type Currency, getCurrency } from './currency';

/** Signed integer amount in a currency's minor units. */
export type MinorUnits = number;

export const MAX_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export function isMinorUnits(value: unknown): value is MinorUnits {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertMinorUnits(value: number, label = 'amount'): MinorUnits {
  if (!isMinorUnits(value)) {
    throw new RangeError(`${label} must be a safe integer in minor units, received ${value}`);
  }
  return value;
}

export function addMinor(a: MinorUnits, b: MinorUnits): MinorUnits {
  return assertMinorUnits(assertMinorUnits(a) + assertMinorUnits(b), 'sum');
}

export function sumMinor(values: Iterable<MinorUnits>): MinorUnits {
  let total = 0;
  for (const value of values) {
    total = addMinor(total, value);
  }
  return total;
}

export function negateMinor(value: MinorUnits): MinorUnits {
  return assertMinorUnits(value) === 0 ? 0 : -value;
}

export function absMinor(value: MinorUnits): MinorUnits {
  return Math.abs(assertMinorUnits(value));
}

export type ParseAmountResult =
  | { ok: true; minor: MinorUnits }
  | { ok: false; reason: 'empty' | 'invalid' | 'too_many_fraction_digits' | 'too_large' };

const NON_AMOUNT_CHARACTERS = /[^0-9.,-]/g;

/**
 * Parses user-entered text into minor units without floating point.
 * Accepts digits with an optional decimal separator ('.' or ',' when it is the
 * only separator); grouping separators are stripped. Exponents are rejected.
 */
export function parseAmount(
  input: string,
  fractionDigits: Currency['fractionDigits'],
): ParseAmountResult {
  const cleaned = input.replace(NON_AMOUNT_CHARACTERS, '');
  if (cleaned.length === 0) return { ok: false, reason: 'empty' };

  let text = cleaned;
  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }
  if (text.includes('-')) return { ok: false, reason: 'invalid' };

  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  let integerPart = text;
  let fractionPart = '';

  if (lastDot >= 0 && lastComma >= 0) {
    const separatorIndex = Math.max(lastDot, lastComma);
    integerPart = text.slice(0, separatorIndex).replace(/[.,]/g, '');
    fractionPart = text.slice(separatorIndex + 1);
  } else if (lastDot >= 0) {
    if (text.indexOf('.') !== lastDot) return { ok: false, reason: 'invalid' };
    integerPart = text.slice(0, lastDot);
    fractionPart = text.slice(lastDot + 1);
  } else if (lastComma >= 0) {
    const commaCount = text.split(',').length - 1;
    const tail = text.slice(lastComma + 1);
    if (commaCount === 1 && tail.length !== 3) {
      integerPart = text.slice(0, lastComma);
      fractionPart = tail;
    } else {
      integerPart = text.replace(/,/g, '');
    }
  }

  if (fractionPart.includes('.') || fractionPart.includes(',')) {
    return { ok: false, reason: 'invalid' };
  }
  if (integerPart.length === 0 && fractionPart.length === 0) {
    return { ok: false, reason: 'invalid' };
  }
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return { ok: false, reason: 'invalid' };
  }
  if (fractionPart.length > fractionDigits) {
    return { ok: false, reason: 'too_many_fraction_digits' };
  }

  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const paddedFraction = fractionPart.padEnd(fractionDigits, '0');
  const digits = `${normalizedInteger}${paddedFraction}`;
  if (digits.length > 16) return { ok: false, reason: 'too_large' };

  const magnitude = Number(digits);
  if (!Number.isSafeInteger(magnitude)) return { ok: false, reason: 'too_large' };
  return { ok: true, minor: negative ? -magnitude : magnitude };
}

function groupThousands(integerDigits: string): string {
  return integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Splits an absolute minor amount into integer and fraction digit strings. */
export function splitMinor(
  minor: MinorUnits,
  fractionDigits: Currency['fractionDigits'],
): { integer: string; fraction: string } {
  const digits = String(absMinor(minor)).padStart(fractionDigits + 1, '0');
  const integer = digits.slice(0, digits.length - fractionDigits) || '0';
  const fraction = fractionDigits === 0 ? '' : digits.slice(digits.length - fractionDigits);
  return { integer, fraction };
}

/** Plain decimal text such as "1234.50" or "-7" for exports and storage of drafts. */
export function minorToDecimalString(
  minor: MinorUnits,
  fractionDigits: Currency['fractionDigits'],
): string {
  const { integer, fraction } = splitMinor(minor, fractionDigits);
  const sign = minor < 0 ? '-' : '';
  return fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
}

/** Number text with thousands grouping and no symbol, e.g. "1,234.50". */
export function formatNumber(
  minor: MinorUnits,
  fractionDigits: Currency['fractionDigits'],
): string {
  const { integer, fraction } = splitMinor(minor, fractionDigits);
  const grouped = groupThousands(integer);
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export type FormatMoneyOptions = {
  /** 'auto' shows '-' for negatives only; 'always' adds '+' for positives; 'never' hides signs. */
  sign?: 'auto' | 'always' | 'never';
  /** Show the ISO code instead of the symbol. */
  useCode?: boolean;
  /** Hide the symbol and code entirely. */
  bare?: boolean;
};

const NARROW_NO_BREAK_SPACE = ' ';

export function formatMoney(
  minor: MinorUnits,
  currencyOrCode: Currency | string,
  options: FormatMoneyOptions = {},
): string {
  const currency =
    typeof currencyOrCode === 'string' ? getCurrency(currencyOrCode) : currencyOrCode;
  const { sign = 'auto', useCode = false, bare = false } = options;
  const number = formatNumber(minor, currency.fractionDigits);

  let signText = '';
  if (minor < 0 && sign !== 'never') signText = '-';
  if (minor > 0 && sign === 'always') signText = '+';

  if (bare) return `${signText}${number}`;

  const unit = useCode ? currency.code : currency.symbol;
  const unitIsWordLike = useCode || unit.length > 1 || currency.symbolPosition === 'after';
  if (currency.symbolPosition === 'before' && !useCode) {
    return `${signText}${unit}${number}`;
  }
  const separator = unitIsWordLike ? NARROW_NO_BREAK_SPACE : '';
  return `${signText}${number}${separator}${unit}`;
}

/**
 * Formats a draft typed on the in-app keypad (digits plus an optional '.')
 * with grouping while preserving a trailing decimal separator and zeros.
 */
export function formatAmountDraft(draft: string): string {
  if (!draft) return '0';
  const [integerPart = '', fractionPart] = draft.split('.');
  const grouped = groupThousands(integerPart.replace(/^0+(?=\d)/, '') || '0');
  if (fractionPart === undefined) return grouped;
  return `${grouped}.${fractionPart}`;
}
