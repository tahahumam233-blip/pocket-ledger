import { getLocales } from 'expo-localization';

/** The device's currency code, when the OS reports one. */
export function deviceCurrencyCode(): string | null {
  try {
    return getLocales()[0]?.currencyCode ?? null;
  } catch {
    return null;
  }
}

export function deviceRegionCode(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}
