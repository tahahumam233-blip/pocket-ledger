import { describe, expect, it } from '@jest/globals';

import {
  CURRENCIES,
  defaultCurrencyPair,
  findCurrency,
  getCurrency,
  POPULAR_CURRENCY_CODES,
  searchCurrencies,
} from './currency';

describe('currency table', () => {
  it('has unique uppercase codes with valid fraction digits', () => {
    const codes = new Set<string>();
    for (const currency of CURRENCIES) {
      expect(currency.code).toMatch(/^[A-Z]{3}$/);
      expect(codes.has(currency.code)).toBe(false);
      codes.add(currency.code);
      expect([0, 2, 3]).toContain(currency.fractionDigits);
      expect(currency.symbol.length).toBeGreaterThan(0);
    }
    for (const code of POPULAR_CURRENCY_CODES) expect(codes.has(code)).toBe(true);
  });

  it('finds currencies case-insensitively and searches by name or region', () => {
    expect(findCurrency('usd')?.code).toBe('USD');
    expect(findCurrency('XXX')).toBeNull();
    expect(() => getCurrency('XXX')).toThrow();
    expect(searchCurrencies('iraq').map((c) => c.code)).toEqual(['IQD']);
    expect(searchCurrencies('dinar').length).toBeGreaterThan(3);
  });

  it('chooses a sensible default pair for a region', () => {
    expect(defaultCurrencyPair('IQD')).toEqual({ primary: 'IQD', secondary: 'USD' });
    expect(defaultCurrencyPair('USD')).toEqual({ primary: 'USD', secondary: 'EUR' });
    expect(defaultCurrencyPair(null)).toEqual({ primary: 'USD', secondary: 'EUR' });
    expect(defaultCurrencyPair('ZZZ')).toEqual({ primary: 'USD', secondary: 'EUR' });
  });
});
