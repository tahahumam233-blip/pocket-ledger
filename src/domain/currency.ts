/**
 * Centralized currency metadata.
 *
 * Fraction digits reflect everyday use rather than the strict ISO 4217 minor
 * unit where the two differ (for example IQD is stored and shown without fils,
 * which is how prices are quoted in practice). All money in the app is stored
 * as signed integers of these minor units.
 */
export type CurrencyCode = string;

export type Currency = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  fractionDigits: 0 | 2 | 3;
  /** Where the symbol sits relative to the number. */
  symbolPosition: 'before' | 'after';
  /** Short flag-like label used in pickers. */
  region: string;
};

const before = (
  code: string,
  name: string,
  symbol: string,
  fractionDigits: 0 | 2 | 3,
  region: string,
): Currency => ({ code, name, symbol, fractionDigits, symbolPosition: 'before', region });

const after = (
  code: string,
  name: string,
  fractionDigits: 0 | 2 | 3,
  region: string,
  symbol: string = code,
): Currency => ({ code, name, symbol, fractionDigits, symbolPosition: 'after', region });

export const CURRENCIES: readonly Currency[] = [
  before('USD', 'US Dollar', '$', 2, 'United States'),
  before('EUR', 'Euro', '€', 2, 'Eurozone'),
  before('GBP', 'British Pound', '£', 2, 'United Kingdom'),
  after('IQD', 'Iraqi Dinar', 0, 'Iraq'),
  after('SAR', 'Saudi Riyal', 2, 'Saudi Arabia'),
  after('AED', 'UAE Dirham', 2, 'United Arab Emirates'),
  after('KWD', 'Kuwaiti Dinar', 3, 'Kuwait'),
  after('QAR', 'Qatari Riyal', 2, 'Qatar'),
  after('OMR', 'Omani Rial', 3, 'Oman'),
  after('BHD', 'Bahraini Dinar', 3, 'Bahrain'),
  after('JOD', 'Jordanian Dinar', 3, 'Jordan'),
  after('EGP', 'Egyptian Pound', 2, 'Egypt'),
  before('TRY', 'Turkish Lira', '₺', 2, 'Türkiye'),
  after('IRR', 'Iranian Rial', 0, 'Iran'),
  after('LBP', 'Lebanese Pound', 0, 'Lebanon'),
  after('SYP', 'Syrian Pound', 0, 'Syria'),
  after('MAD', 'Moroccan Dirham', 2, 'Morocco'),
  after('TND', 'Tunisian Dinar', 3, 'Tunisia'),
  after('DZD', 'Algerian Dinar', 2, 'Algeria'),
  before('ILS', 'Israeli New Shekel', '₪', 2, 'Israel'),
  before('INR', 'Indian Rupee', '₹', 2, 'India'),
  after('PKR', 'Pakistani Rupee', 0, 'Pakistan', 'Rs'),
  after('BDT', 'Bangladeshi Taka', 2, 'Bangladesh', '৳'),
  after('LKR', 'Sri Lankan Rupee', 2, 'Sri Lanka', 'Rs'),
  after('NPR', 'Nepalese Rupee', 2, 'Nepal', 'Rs'),
  before('CNY', 'Chinese Yuan', '¥', 2, 'China'),
  before('JPY', 'Japanese Yen', '¥', 0, 'Japan'),
  before('KRW', 'South Korean Won', '₩', 0, 'South Korea'),
  before('HKD', 'Hong Kong Dollar', 'HK$', 2, 'Hong Kong'),
  before('TWD', 'New Taiwan Dollar', 'NT$', 0, 'Taiwan'),
  before('SGD', 'Singapore Dollar', 'S$', 2, 'Singapore'),
  before('MYR', 'Malaysian Ringgit', 'RM', 2, 'Malaysia'),
  after('IDR', 'Indonesian Rupiah', 0, 'Indonesia', 'Rp'),
  before('THB', 'Thai Baht', '฿', 2, 'Thailand'),
  before('PHP', 'Philippine Peso', '₱', 2, 'Philippines'),
  after('VND', 'Vietnamese Dong', 0, 'Vietnam', '₫'),
  before('AUD', 'Australian Dollar', 'A$', 2, 'Australia'),
  before('NZD', 'New Zealand Dollar', 'NZ$', 2, 'New Zealand'),
  before('CAD', 'Canadian Dollar', 'CA$', 2, 'Canada'),
  before('MXN', 'Mexican Peso', 'MX$', 2, 'Mexico'),
  before('BRL', 'Brazilian Real', 'R$', 2, 'Brazil'),
  before('ARS', 'Argentine Peso', 'AR$', 2, 'Argentina'),
  before('CLP', 'Chilean Peso', 'CL$', 0, 'Chile'),
  before('COP', 'Colombian Peso', 'CO$', 0, 'Colombia'),
  after('PEN', 'Peruvian Sol', 2, 'Peru', 'S/'),
  after('CHF', 'Swiss Franc', 2, 'Switzerland'),
  after('SEK', 'Swedish Krona', 2, 'Sweden', 'kr'),
  after('NOK', 'Norwegian Krone', 2, 'Norway', 'kr'),
  after('DKK', 'Danish Krone', 2, 'Denmark', 'kr'),
  after('PLN', 'Polish Zloty', 2, 'Poland', 'zł'),
  after('CZK', 'Czech Koruna', 2, 'Czechia', 'Kč'),
  after('HUF', 'Hungarian Forint', 0, 'Hungary', 'Ft'),
  after('RON', 'Romanian Leu', 2, 'Romania', 'lei'),
  after('RUB', 'Russian Ruble', 2, 'Russia', '₽'),
  after('UAH', 'Ukrainian Hryvnia', 2, 'Ukraine', '₴'),
  after('GEL', 'Georgian Lari', 2, 'Georgia', '₾'),
  after('AZN', 'Azerbaijani Manat', 2, 'Azerbaijan', '₼'),
  after('KZT', 'Kazakhstani Tenge', 2, 'Kazakhstan', '₸'),
  after('UZS', 'Uzbekistani Som', 0, 'Uzbekistan'),
  before('ZAR', 'South African Rand', 'R', 2, 'South Africa'),
  before('NGN', 'Nigerian Naira', '₦', 2, 'Nigeria'),
  after('KES', 'Kenyan Shilling', 0, 'Kenya', 'KSh'),
  after('ETB', 'Ethiopian Birr', 2, 'Ethiopia', 'Br'),
  before('GHS', 'Ghanaian Cedi', 'GH₵', 2, 'Ghana'),
  after('TZS', 'Tanzanian Shilling', 0, 'Tanzania', 'TSh'),
  after('UGX', 'Ugandan Shilling', 0, 'Uganda', 'USh'),
  after('SDG', 'Sudanese Pound', 2, 'Sudan'),
  after('AFN', 'Afghan Afghani', 0, 'Afghanistan', '؋'),
];

const CURRENCY_BY_CODE: ReadonlyMap<string, Currency> = new Map(
  CURRENCIES.map((currency) => [currency.code, currency]),
);

/** Codes offered first in pickers. */
export const POPULAR_CURRENCY_CODES: readonly CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'IQD',
  'SAR',
  'AED',
  'TRY',
  'EGP',
  'INR',
  'JPY',
];

export function isKnownCurrency(code: string): boolean {
  return CURRENCY_BY_CODE.has(code);
}

export function getCurrency(code: CurrencyCode): Currency {
  const currency = CURRENCY_BY_CODE.get(code);
  if (!currency) {
    throw new Error(`Unknown currency code: ${code}`);
  }
  return currency;
}

export function findCurrency(code: string | null | undefined): Currency | null {
  if (!code) return null;
  return CURRENCY_BY_CODE.get(code.toUpperCase()) ?? null;
}

export function searchCurrencies(query: string): Currency[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...CURRENCIES];
  return CURRENCIES.filter(
    (currency) =>
      currency.code.toLowerCase().includes(needle) ||
      currency.name.toLowerCase().includes(needle) ||
      currency.region.toLowerCase().includes(needle),
  );
}

/**
 * Picks a sensible default pair of currencies for a device region.
 * The primary currency is the device's local currency when it is known;
 * the secondary is USD unless the primary already is USD.
 */
export function defaultCurrencyPair(deviceCurrencyCode: string | null | undefined): {
  primary: CurrencyCode;
  secondary: CurrencyCode;
} {
  const local = findCurrency(deviceCurrencyCode);
  const primary = local?.code ?? 'USD';
  const secondary = primary === 'USD' ? 'EUR' : 'USD';
  return { primary, secondary };
}
