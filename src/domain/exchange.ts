import { type CurrencyCode, getCurrency } from './currency';
import type { MinorUnits } from './money';

/**
 * An exchange rate as people quote it: one unit of `base` buys `rate` units of
 * `quote`, for example 1 USD = 1,310 IQD. The rate is decimal text, exactly as
 * typed; nothing here uses binary floating point.
 */
export type ExchangeQuote = { base: CurrencyCode; quote: CurrencyCode; rate: string };

/** Most decimals a typed rate may have. */
export const RATE_MAX_DECIMALS = 6;

const TEN = BigInt(10);

function pow10(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}

/** Divides and rounds half up; both numbers must be positive. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}

function toSafeNumber(value: bigint): number | null {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
}

/** A typed rate as a whole number and how many decimal places it carries. */
function parseRate(rate: string): { scaled: bigint; decimals: number } | null {
  const text = rate.replace(/,/g, '').trim();
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(text)) return null;
  const [whole = '', fraction = ''] = text.split('.');
  if (fraction.length > RATE_MAX_DECIMALS) return null;
  const scaled = BigInt(`${whole || '0'}${fraction}`);
  return scaled > BigInt(0) ? { scaled, decimals: fraction.length } : null;
}

/** True when the text is a usable rate: a positive decimal with at most six places. */
export function isValidRate(rate: string): boolean {
  return parseRate(rate) !== null;
}

/**
 * Converts an amount at a typed rate, rounded half up to the target currency's
 * smallest unit. Returns null when the rate is not usable.
 */
export function convertAtRate(
  amountMinor: MinorUnits,
  from: CurrencyCode,
  to: CurrencyCode,
  quote: Pick<ExchangeQuote, 'base' | 'rate'>,
): MinorUnits | null {
  const parsed = parseRate(quote.rate);
  if (!parsed || !Number.isSafeInteger(amountMinor) || amountMinor < 0) return null;
  const amount = BigInt(amountMinor);
  const fromScale = pow10(getCurrency(from).fractionDigits);
  const toScale = pow10(getCurrency(to).fractionDigits);
  const rateScale = pow10(parsed.decimals);
  const converted =
    from === quote.base
      ? divideRounded(amount * parsed.scaled * toScale, fromScale * rateScale)
      : divideRounded(amount * rateScale * toScale, fromScale * parsed.scaled);
  return toSafeNumber(converted);
}

/** Groups the whole part of a decimal in thousands: "1310.5" becomes "1,310.5". */
export function formatRate(rate: string): string {
  const [whole = '0', fraction] = rate.replace(/,/g, '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * The rate two amounts imply, quoted on the given base. Large rates keep two
 * decimals, ordinary ones four and rates below one six, with trailing zeros
 * dropped, so 131,000 IQD for 100 USD reads "1310".
 */
export function impliedRate(
  giveMinor: MinorUnits,
  giveCurrency: CurrencyCode,
  receiveMinor: MinorUnits,
  receiveCurrency: CurrencyCode,
  base: CurrencyCode,
): string | null {
  if (!Number.isSafeInteger(giveMinor) || !Number.isSafeInteger(receiveMinor)) return null;
  if (giveMinor <= 0 || receiveMinor <= 0 || giveCurrency === receiveCurrency) return null;
  const giveIsBase = base === giveCurrency;
  const baseMinor = BigInt(giveIsBase ? giveMinor : receiveMinor);
  const quoteMinor = BigInt(giveIsBase ? receiveMinor : giveMinor);
  const baseDigits = getCurrency(giveIsBase ? giveCurrency : receiveCurrency).fractionDigits;
  const quoteDigits = getCurrency(giveIsBase ? receiveCurrency : giveCurrency).fractionDigits;

  const numerator = quoteMinor * pow10(baseDigits);
  const denominator = baseMinor * pow10(quoteDigits);
  const whole = numerator / denominator;
  const decimals = whole >= BigInt(100) ? 2 : whole >= BigInt(1) ? 4 : RATE_MAX_DECIMALS;
  const scaled = divideRounded(numerator * pow10(decimals), denominator);
  if (scaled <= BigInt(0)) return null;
  const digits = scaled.toString().padStart(decimals + 1, '0');
  const text = `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * The currency to quote a rate on so that it reads as a number above one, as in
 * "1 USD = 1,310 IQD" rather than "1 IQD = 0.000763 USD".
 */
export function preferredRateBase(
  firstMinor: MinorUnits,
  firstCurrency: CurrencyCode,
  secondMinor: MinorUnits,
  secondCurrency: CurrencyCode,
): CurrencyCode {
  const first = BigInt(Math.abs(firstMinor)) * pow10(getCurrency(secondCurrency).fractionDigits);
  const second = BigInt(Math.abs(secondMinor)) * pow10(getCurrency(firstCurrency).fractionDigits);
  return first <= second ? firstCurrency : secondCurrency;
}

/** The rate of an exchange between two amounts, quoted the way people say it. */
export function quoteFromAmounts(
  giveMinor: MinorUnits,
  giveCurrency: CurrencyCode,
  receiveMinor: MinorUnits,
  receiveCurrency: CurrencyCode,
): ExchangeQuote | null {
  const give = Math.abs(giveMinor);
  const receive = Math.abs(receiveMinor);
  const base = preferredRateBase(give, giveCurrency, receive, receiveCurrency);
  const rate = impliedRate(give, giveCurrency, receive, receiveCurrency, base);
  if (!rate) return null;
  return { base, quote: base === giveCurrency ? receiveCurrency : giveCurrency, rate };
}

/** "1 USD = 1,310 IQD". */
export function describeRate(quote: ExchangeQuote): string {
  return `1 ${quote.base} = ${formatRate(quote.rate)} ${quote.quote}`;
}
