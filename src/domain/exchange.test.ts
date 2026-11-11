import { describe, expect, it } from '@jest/globals';

import {
  convertAtRate,
  describeRate,
  formatRate,
  impliedRate,
  isValidRate,
  preferredRateBase,
  quoteFromAmounts,
} from './exchange';

describe('exchange rates', () => {
  it('accepts positive decimals with up to six places and nothing else', () => {
    for (const rate of ['1310', '1,310', '1310.5', '0.92', '.92', '1.', '0.000763']) {
      expect(isValidRate(rate)).toBe(true);
    }
    for (const rate of ['', '0', '0.0', '-1', 'abc', '1.2.3', '1e3', '0.0000001']) {
      expect(isValidRate(rate)).toBe(false);
    }
  });

  it('converts from the base currency by multiplying, to the smallest unit of the target', () => {
    // 100.00 USD at 1 USD = 1,310 IQD (dinars have no decimals).
    expect(convertAtRate(10000, 'USD', 'IQD', { base: 'USD', rate: '1310' })).toBe(131000);
    expect(convertAtRate(10000, 'USD', 'IQD', { base: 'USD', rate: '1,310.50' })).toBe(131050);
    // 250.00 USD at 1 USD = 0.92 EUR.
    expect(convertAtRate(25000, 'USD', 'EUR', { base: 'USD', rate: '0.92' })).toBe(23000);
    // Three-decimal currency: 100.00 USD at 1 USD = 0.3075 KWD is 30.750 KWD.
    expect(convertAtRate(10000, 'USD', 'KWD', { base: 'USD', rate: '0.3075' })).toBe(30750);
  });

  it('converts towards the base currency by dividing', () => {
    // 131,000 IQD at 1 USD = 1,310 IQD buys 100.00 USD.
    expect(convertAtRate(131000, 'IQD', 'USD', { base: 'USD', rate: '1310' })).toBe(10000);
    // 23.00 EUR at 1 USD = 0.92 EUR buys 25.00 USD.
    expect(convertAtRate(2300, 'EUR', 'USD', { base: 'USD', rate: '0.92' })).toBe(2500);
  });

  it('rounds half up and never drifts, whatever the size', () => {
    // 1.00 USD / 3 = 0.333... and 2.00 / 3 = 0.666...
    expect(convertAtRate(100, 'EUR', 'USD', { base: 'USD', rate: '3' })).toBe(33);
    expect(convertAtRate(200, 'EUR', 'USD', { base: 'USD', rate: '3' })).toBe(67);
    // 0.05 USD at 1,310 is 65.5 dinars, which rounds up to 66.
    expect(convertAtRate(5, 'USD', 'IQD', { base: 'USD', rate: '1310' })).toBe(66);
    // Amounts far beyond what floating point multiplies exactly.
    // 1,234,567,890.12 USD x 1,310.123456, checked with exact decimal arithmetic.
    expect(convertAtRate(123456789012, 'USD', 'IQD', { base: 'USD', rate: '1310.123456' })).toBe(
      1617436350871,
    );
    expect(convertAtRate(0, 'USD', 'IQD', { base: 'USD', rate: '1310' })).toBe(0);
  });

  it('refuses unusable rates and results too large to store', () => {
    expect(convertAtRate(10000, 'USD', 'IQD', { base: 'USD', rate: '' })).toBeNull();
    expect(convertAtRate(10000, 'USD', 'IQD', { base: 'USD', rate: '0' })).toBeNull();
    expect(convertAtRate(-5, 'USD', 'IQD', { base: 'USD', rate: '1310' })).toBeNull();
    expect(
      convertAtRate(Number.MAX_SAFE_INTEGER, 'USD', 'IQD', { base: 'USD', rate: '999999' }),
    ).toBeNull();
  });

  it('works out the rate two amounts imply, on either base', () => {
    expect(impliedRate(10000, 'USD', 131000, 'IQD', 'USD')).toBe('1310');
    expect(impliedRate(131000, 'IQD', 10000, 'USD', 'USD')).toBe('1310');
    expect(impliedRate(10000, 'USD', 131050, 'IQD', 'USD')).toBe('1310.5');
    expect(impliedRate(25000, 'USD', 23000, 'EUR', 'USD')).toBe('0.92');
    expect(impliedRate(25000, 'USD', 23000, 'EUR', 'EUR')).toBe('1.087');
    expect(impliedRate(10000, 'USD', 131000, 'IQD', 'IQD')).toBe('0.000763');
    expect(impliedRate(30000, 'USD', 100000, 'IQD', 'USD')).toBe('333.33');
    expect(impliedRate(0, 'USD', 131000, 'IQD', 'USD')).toBeNull();
    expect(impliedRate(100, 'USD', 100, 'USD', 'USD')).toBeNull();
  });

  it('quotes a rate the way people say it, above one', () => {
    expect(preferredRateBase(10000, 'USD', 131000, 'IQD')).toBe('USD');
    expect(preferredRateBase(131000, 'IQD', 10000, 'USD')).toBe('USD');
    expect(preferredRateBase(25000, 'USD', 23000, 'EUR')).toBe('EUR');
    expect(quoteFromAmounts(-131000, 'IQD', 10000, 'USD')).toEqual({
      base: 'USD',
      quote: 'IQD',
      rate: '1310',
    });
    expect(quoteFromAmounts(0, 'IQD', 10000, 'USD')).toBeNull();
  });

  it('formats rates for reading', () => {
    expect(formatRate('1310')).toBe('1,310');
    expect(formatRate('1310.5')).toBe('1,310.5');
    expect(formatRate('1234567.25')).toBe('1,234,567.25');
    expect(formatRate('0.92')).toBe('0.92');
    expect(describeRate({ base: 'USD', quote: 'IQD', rate: '1310.5' })).toBe('1 USD = 1,310.5 IQD');
  });
});
