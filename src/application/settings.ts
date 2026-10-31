import type { CurrencyCode } from '@/domain';

export type ThemePreference = 'system' | 'light' | 'dark';

export type AppSettings = {
  onboardingCompleted: boolean;
  /** Primary currency first, secondary second. */
  currencies: CurrencyCode[];
  userName: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  theme: ThemePreference;
  appLockEnabled: boolean;
  /** Fingerprint of the last reminder that was scheduled, used to avoid rescheduling needlessly. */
  reminderSignature: string;
  /** UTC timestamp of the last backup file, or an empty string. */
  lastBackupAt: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingCompleted: false,
  currencies: ['USD', 'EUR'],
  userName: '',
  reminderEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
  theme: 'system',
  appLockEnabled: false,
  reminderSignature: '',
  lastBackupAt: '',
};

export const SETTINGS_KEYS = {
  onboardingCompleted: 'onboarding_completed',
  currencies: 'currencies',
  userName: 'user_name',
  reminderEnabled: 'reminder_enabled',
  reminderHour: 'reminder_hour',
  reminderMinute: 'reminder_minute',
  theme: 'theme',
  appLockEnabled: 'app_lock_enabled',
  reminderSignature: 'reminder_signature',
  lastBackupAt: 'last_backup_at',
} as const satisfies Record<keyof AppSettings, string>;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseInteger(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function parseSettings(record: Record<string, string>): AppSettings {
  let currencies = DEFAULT_SETTINGS.currencies;
  const rawCurrencies = record[SETTINGS_KEYS.currencies];
  if (rawCurrencies) {
    try {
      const parsed: unknown = JSON.parse(rawCurrencies);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((code) => typeof code === 'string' && /^[A-Z]{3}$/.test(code))
      ) {
        currencies = parsed as CurrencyCode[];
      }
    } catch {
      // Fall back to defaults when the stored value is unreadable.
    }
  }
  const theme = record[SETTINGS_KEYS.theme];
  return {
    onboardingCompleted: parseBoolean(record[SETTINGS_KEYS.onboardingCompleted], false),
    currencies,
    userName: record[SETTINGS_KEYS.userName] ?? '',
    reminderEnabled: parseBoolean(record[SETTINGS_KEYS.reminderEnabled], false),
    reminderHour: parseInteger(record[SETTINGS_KEYS.reminderHour], 21, 0, 23),
    reminderMinute: parseInteger(record[SETTINGS_KEYS.reminderMinute], 0, 0, 59),
    theme: theme === 'light' || theme === 'dark' ? theme : 'system',
    appLockEnabled: parseBoolean(record[SETTINGS_KEYS.appLockEnabled], false),
    reminderSignature: record[SETTINGS_KEYS.reminderSignature] ?? '',
    lastBackupAt: record[SETTINGS_KEYS.lastBackupAt] ?? '',
  };
}

export function serializeSettings(settings: Partial<AppSettings>): Record<string, string> {
  const out: Record<string, string> = {};
  if (settings.onboardingCompleted !== undefined) {
    out[SETTINGS_KEYS.onboardingCompleted] = String(settings.onboardingCompleted);
  }
  if (settings.currencies !== undefined) {
    out[SETTINGS_KEYS.currencies] = JSON.stringify(settings.currencies);
  }
  if (settings.userName !== undefined) out[SETTINGS_KEYS.userName] = settings.userName;
  if (settings.reminderEnabled !== undefined) {
    out[SETTINGS_KEYS.reminderEnabled] = String(settings.reminderEnabled);
  }
  if (settings.reminderHour !== undefined) {
    out[SETTINGS_KEYS.reminderHour] = String(settings.reminderHour);
  }
  if (settings.reminderMinute !== undefined) {
    out[SETTINGS_KEYS.reminderMinute] = String(settings.reminderMinute);
  }
  if (settings.theme !== undefined) out[SETTINGS_KEYS.theme] = settings.theme;
  if (settings.appLockEnabled !== undefined) {
    out[SETTINGS_KEYS.appLockEnabled] = String(settings.appLockEnabled);
  }
  if (settings.reminderSignature !== undefined) {
    out[SETTINGS_KEYS.reminderSignature] = settings.reminderSignature;
  }
  if (settings.lastBackupAt !== undefined) out[SETTINGS_KEYS.lastBackupAt] = settings.lastBackupAt;
  return out;
}
