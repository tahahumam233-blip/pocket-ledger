import { describe, expect, it } from '@jest/globals';

import { getCurrency } from './currency';
import {
  formatAmountDraft,
  formatMoney,
  formatNumber,
  minorToDecimalString,
  parseAmount,
  sumMinor,
} from './money';

describe('parseAmount', () => {
  it('parses whole and fractional amounts into minor units', () => {
    expect(parseAmount('12.50', 2)).toEqual({ ok: true, minor: 1250 });
    expect(parseAmount('12', 2)).toEqual({ ok: true, minor: 1200 });
    expect(parseAmount('0.05', 2)).toEqual({ ok: true, minor: 5 });
    expect(parseAmount('.5', 2)).toEqual({ ok: true, minor: 50 });
    expect(parseAmount('1,250,000', 0)).toEqual({ ok: true, minor: 1250000 });
    expect(parseAmount('3.250', 3)).toEqual({ ok: true, minor: 3250 });
  });

  it('treats a lone comma as a decimal separator unless it groups thousands', () => {
    expect(parseAmount('12,5', 2)).toEqual({ ok: true, minor: 1250 });
    expect(parseAmount('1,250', 2)).toEqual({ ok: true, minor: 125000 });
    expect(parseAmount('1.250,75', 2)).toEqual({ ok: true, minor: 125075 });
  });

  it('rejects malformed input', () => {
    expect(parseAmount('', 2)).toEqual({ ok: false, reason: 'empty' });
    expect(parseAmount('abc', 2)).toEqual({ ok: false, reason: 'empty' });
    expect(parseAmount('1.2.3', 2)).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('1e5', 2)).toEqual({ ok: true, minor: 1500 });
    expect(parseAmount('12.345', 2)).toEqual({ ok: false, reason: 'too_many_fraction_digits' });
    expect(parseAmount('5.1', 0)).toEqual({ ok: false, reason: 'too_many_fraction_digits' });
    expect(parseAmount('99999999999999999', 0)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('never uses floating point for cents', () => {
    expect(parseAmount('0.29', 2)).toEqual({ ok: true, minor: 29 });
    expect(parseAmount('1.10', 2)).toEqual({ ok: true, minor: 110 });
    expect(parseAmount('4.35', 2)).toEqual({ ok: true, minor: 435 });
  });
});

describe('formatMoney', () => {
  it('formats symbol-first currencies', () => {
    expect(formatMoney(125050, 'USD')).toBe('$1,250.50');
    expect(formatMoney(-125050, 'USD')).toBe('-$1,250.50');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(0, 'EUR')).toBe('€0.00');
  });

  it('formats code-after currencies with everyday fraction digits', () => {
    expect(formatMoney(1450000, 'IQD')).toBe('1,450,000 IQD');
    expect(formatMoney(-2500, 'SAR')).toBe('-25.00 SAR');
    expect(formatMoney(1500, 'KWD')).toBe('1.500 KWD');
  });

  it('supports explicit signs, codes and bare numbers', () => {
    expect(formatMoney(1000, 'USD', { sign: 'always' })).toBe('+$10.00');
    expect(formatMoney(-1000, 'USD', { sign: 'never' })).toBe('$10.00');
    expect(formatMoney(1000, 'USD', { useCode: true })).toBe('10.00 USD');
    expect(formatMoney(-1000, 'IQD', { bare: true })).toBe('-1,000');
  });

  it('formats numbers and decimal strings', () => {
    expect(formatNumber(123456789, 2)).toBe('1,234,567.89');
    expect(minorToDecimalString(-1050, 2)).toBe('-10.50');
    expect(minorToDecimalString(7, 0)).toBe('7');
    expect(minorToDecimalString(1234, 3)).toBe('1.234');
  });

  it('formats keypad drafts progressively', () => {
    expect(formatAmountDraft('')).toBe('0');
    expect(formatAmountDraft('1234')).toBe('1,234');
    expect(formatAmountDraft('1234.')).toBe('1,234.');
    expect(formatAmountDraft('1234.50')).toBe('1,234.50');
    expect(formatAmountDraft('0.0')).toBe('0.0');
  });

  it('exposes consistent fraction digits per currency', () => {
    expect(getCurrency('JPY').fractionDigits).toBe(0);
    expect(getCurrency('USD').fractionDigits).toBe(2);
    expect(getCurrency('BHD').fractionDigits).toBe(3);
  });
});

describe('sumMinor', () => {
  it('sums integer amounts and rejects unsafe values', () => {
    expect(sumMinor([100, -40, 15])).toBe(75);
    expect(() => sumMinor([1.5])).toThrow(RangeError);
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
  });
});
