import {
  convertAtRate,
  type CurrencyCode,
  type ExchangeQuote,
  getCurrency,
  impliedRate,
  isValidRate,
  minorToDecimalString,
  parseAmount,
  preferredRateBase,
} from '@/domain';

/**
 * The three linked boxes of the exchange form. Type any two and the third
 * follows: a typed rate works out the amount received, and two typed amounts
 * show the rate they imply.
 */
export type ExchangeFields = {
  /** Amount given, as typed. */
  give: string;
  /** Amount received, as typed or worked out from the rate. */
  receive: string;
  /** The rate as typed; used only while `rateTyped` is true. */
  rate: string;
  /** The currency the rate is quoted on: "1 base = rate of the other". */
  rateBase: CurrencyCode;
  /** True when the rate was typed, so the amount received follows it. */
  rateTyped: boolean;
  /** True once the way the rate is quoted was chosen, so it stops turning itself round. */
  baseLocked: boolean;
};

export type ExchangeSides = { giveCurrency: CurrencyCode; receiveCurrency: CurrencyCode };

function minorOf(draft: string, currency: CurrencyCode): number {
  const parsed = parseAmount(draft, getCurrency(currency).fractionDigits);
  return parsed.ok ? parsed.minor : 0;
}

function draftOf(minor: number, currency: CurrencyCode): string {
  const text = minorToDecimalString(minor, getCurrency(currency).fractionDigits);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

/** Brings the dependent box up to date after an edit. */
function settle(fields: ExchangeFields, sides: ExchangeSides): ExchangeFields {
  const give = minorOf(fields.give, sides.giveCurrency);
  if (fields.rateTyped) {
    if (!isValidRate(fields.rate)) return fields;
    // Nothing given means nothing received; a stale figure would be misleading.
    if (give <= 0) return { ...fields, receive: '' };
    const received = convertAtRate(give, sides.giveCurrency, sides.receiveCurrency, {
      base: fields.rateBase,
      rate: fields.rate,
    });
    return received === null
      ? fields
      : { ...fields, receive: received > 0 ? draftOf(received, sides.receiveCurrency) : '' };
  }
  const receive = minorOf(fields.receive, sides.receiveCurrency);
  if (fields.baseLocked || give <= 0 || receive <= 0) return fields;
  return {
    ...fields,
    rateBase: preferredRateBase(give, sides.giveCurrency, receive, sides.receiveCurrency),
  };
}

export function startExchangeFields(input: {
  sides: ExchangeSides;
  give?: string;
  receive?: string;
  /** The rate of the last exchange, which decides how a new rate is quoted. */
  lastRate?: ExchangeQuote | null;
  /** The ledger's main currency, the fallback to quote on. */
  primaryCurrency?: CurrencyCode;
}): ExchangeFields {
  const { sides, lastRate, primaryCurrency } = input;
  const inPair = (code: CurrencyCode | undefined) =>
    code === sides.giveCurrency || code === sides.receiveCurrency ? code : undefined;
  return settle(
    {
      give: input.give ?? '',
      receive: input.receive ?? '',
      rate: '',
      rateBase: inPair(lastRate?.base) ?? inPair(primaryCurrency) ?? sides.giveCurrency,
      rateTyped: false,
      baseLocked: false,
    },
    sides,
  );
}

export function editGive(fields: ExchangeFields, next: string, sides: ExchangeSides) {
  return settle({ ...fields, give: next }, sides);
}

export function editReceive(fields: ExchangeFields, next: string, sides: ExchangeSides) {
  return settle({ ...fields, receive: next, rateTyped: false }, sides);
}

export function editRate(fields: ExchangeFields, next: string, sides: ExchangeSides) {
  return settle({ ...fields, rate: next, rateTyped: true, baseLocked: true }, sides);
}

/** Uses a known rate, such as the one from the last exchange. */
export function applyQuote(fields: ExchangeFields, quote: ExchangeQuote, sides: ExchangeSides) {
  const matches =
    (quote.base === sides.giveCurrency && quote.quote === sides.receiveCurrency) ||
    (quote.base === sides.receiveCurrency && quote.quote === sides.giveCurrency);
  if (!matches) return fields;
  return settle(
    { ...fields, rate: quote.rate, rateBase: quote.base, rateTyped: true, baseLocked: true },
    sides,
  );
}

/** The rate to show: the typed one, or the one the two amounts imply. */
export function shownRate(fields: ExchangeFields, sides: ExchangeSides): string {
  if (fields.rateTyped) return fields.rate;
  return (
    impliedRate(
      minorOf(fields.give, sides.giveCurrency),
      sides.giveCurrency,
      minorOf(fields.receive, sides.receiveCurrency),
      sides.receiveCurrency,
      fields.rateBase,
    ) ?? ''
  );
}

/** Quotes the rate the other way round ("1 IQD = ..." instead of "1 USD = ..."). */
export function flipRate(fields: ExchangeFields, sides: ExchangeSides): ExchangeFields {
  const rateBase =
    fields.rateBase === sides.giveCurrency ? sides.receiveCurrency : sides.giveCurrency;
  // The amounts stay exactly as they are; the rate is shown from them on the new base.
  return { ...fields, rateBase, rate: '', rateTyped: false, baseLocked: true };
}

/**
 * Turns the exchange round: what was received is now given. The caller swaps
 * the two currencies; the amounts and the rate stay as they were.
 */
export function swapSides(fields: ExchangeFields, sides: ExchangeSides): ExchangeFields {
  const rate = shownRate(fields, sides);
  return {
    ...fields,
    give: fields.receive,
    receive: fields.give,
    rate,
    rateTyped: fields.rateTyped && rate !== '',
    baseLocked: fields.baseLocked || rate !== '',
  };
}

/** The currency on the other side of the rate from its base. */
export function rateQuoteCurrency(fields: ExchangeFields, sides: ExchangeSides): CurrencyCode {
  return fields.rateBase === sides.giveCurrency ? sides.receiveCurrency : sides.giveCurrency;
}
