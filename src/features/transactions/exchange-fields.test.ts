import { describe, expect, it } from '@jest/globals';

import {
  applyQuote,
  editGive,
  editRate,
  editReceive,
  type ExchangeSides,
  flipRate,
  rateQuoteCurrency,
  shownRate,
  startExchangeFields,
  swapSides,
} from './exchange-fields';

const usdToIqd: ExchangeSides = { giveCurrency: 'USD', receiveCurrency: 'IQD' };
const iqdToUsd: ExchangeSides = { giveCurrency: 'IQD', receiveCurrency: 'USD' };
const start = (sides = usdToIqd) => startExchangeFields({ sides, primaryCurrency: 'USD' });

describe('exchange form fields', () => {
  it('works out the amount received from a typed rate', () => {
    let fields = editGive(start(), '100', usdToIqd);
    fields = editRate(fields, '1310', usdToIqd);
    expect(fields.receive).toBe('131000');
    expect(shownRate(fields, usdToIqd)).toBe('1310');
    // Changing what is given keeps the typed rate and updates what is received.
    fields = editGive(fields, '250.5', usdToIqd);
    expect(fields.receive).toBe('328155');
    // Typing the rate digit by digit follows along: 250.50 x 13 = 3,256.5, rounded up.
    fields = editRate(fields, '13', usdToIqd);
    expect(fields.receive).toBe('3257');
    // Clearing what is given clears what is received.
    expect(editGive(fields, '', usdToIqd).receive).toBe('');
  });

  it('shows the rate two typed amounts imply', () => {
    let fields = editGive(start(), '100', usdToIqd);
    expect(shownRate(fields, usdToIqd)).toBe('');
    fields = editReceive(fields, '131050', usdToIqd);
    expect(fields.rateTyped).toBe(false);
    expect(shownRate(fields, usdToIqd)).toBe('1310.5');
    // The amount received stays as typed when the amount given changes; the rate moves.
    fields = editGive(fields, '200', usdToIqd);
    expect(fields.receive).toBe('131050');
    expect(shownRate(fields, usdToIqd)).toBe('655.25');
  });

  it('typing the amount received takes over from a typed rate', () => {
    let fields = editRate(editGive(start(), '100', usdToIqd), '1310', usdToIqd);
    fields = editReceive(fields, '130000', usdToIqd);
    expect(shownRate(fields, usdToIqd)).toBe('1300');
    fields = editGive(fields, '50', usdToIqd);
    expect(fields.receive).toBe('130000');
  });

  it('quotes the rate above one by itself, whichever way the exchange goes', () => {
    // Dinars for dollars, with a ledger whose main currency is the dinar.
    let fields = startExchangeFields({ sides: iqdToUsd, primaryCurrency: 'IQD' });
    expect(fields.rateBase).toBe('IQD');
    fields = editReceive(editGive(fields, '131000', iqdToUsd), '100', iqdToUsd);
    expect(fields.rateBase).toBe('USD');
    expect(rateQuoteCurrency(fields, iqdToUsd)).toBe('IQD');
    expect(shownRate(fields, iqdToUsd)).toBe('1310');
  });

  it('divides when the amount given is in the quoted currency', () => {
    let fields = editGive(start(iqdToUsd), '131000', iqdToUsd);
    fields = editRate(fields, '1310', iqdToUsd);
    expect(fields.rateBase).toBe('USD');
    expect(fields.receive).toBe('100');
    fields = editGive(fields, '1000', iqdToUsd);
    expect(fields.receive).toBe('0.76');
  });

  it('starts from the last rate when asked, and ignores a rate for another pair', () => {
    const quote = { base: 'USD', quote: 'IQD', rate: '1320' };
    let fields = startExchangeFields({ sides: usdToIqd, lastRate: quote, primaryCurrency: 'IQD' });
    expect(fields.rateBase).toBe('USD');
    expect(fields.rate).toBe('');
    fields = applyQuote(editGive(fields, '10', usdToIqd), quote, usdToIqd);
    expect(fields.receive).toBe('13200');
    expect(shownRate(fields, usdToIqd)).toBe('1320');
    expect(applyQuote(fields, { base: 'USD', quote: 'EUR', rate: '0.9' }, usdToIqd)).toBe(fields);
  });

  it('flips how the rate is quoted without touching the amounts', () => {
    let fields = editReceive(editGive(start(), '100', usdToIqd), '131000', usdToIqd);
    fields = flipRate(fields, usdToIqd);
    expect(fields.rateBase).toBe('IQD');
    expect(shownRate(fields, usdToIqd)).toBe('0.000763');
    expect([fields.give, fields.receive]).toEqual(['100', '131000']);
    // Once chosen, the quoting stays put while amounts change.
    fields = editReceive(fields, '132000', usdToIqd);
    expect(fields.rateBase).toBe('IQD');
    fields = flipRate(fields, usdToIqd);
    expect(shownRate(fields, usdToIqd)).toBe('1320');
  });

  it('turns the exchange round, keeping amounts and rate', () => {
    let fields = editRate(editGive(start(), '100', usdToIqd), '1310', usdToIqd);
    fields = swapSides(fields, usdToIqd);
    expect([fields.give, fields.receive]).toEqual(['131000', '100']);
    expect(shownRate(fields, iqdToUsd)).toBe('1310');
    expect(fields.rateBase).toBe('USD');
    // The typed rate keeps driving the amount received after the swap.
    fields = editGive(fields, '262000', iqdToUsd);
    expect(fields.receive).toBe('200');
  });

  it('leaves the amount received alone while the rate is incomplete', () => {
    let fields = editReceive(editGive(start(), '100', usdToIqd), '131000', usdToIqd);
    fields = editRate(fields, '', usdToIqd);
    expect(fields.receive).toBe('131000');
    fields = editRate(fields, '0.', usdToIqd);
    expect(fields.receive).toBe('131000');
    expect(editGive(editRate(start(), '1310', usdToIqd), '', usdToIqd).receive).toBe('');
  });
});
