/** Date-only value in local calendar terms, formatted YYYY-MM-DD. */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const SHORT_MONTH_NAMES = MONTH_NAMES.map((name) => name.slice(0, 3));

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const pad2 = (value: number) => String(value).padStart(2, '0');

export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayIsoDate(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function isValidIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function assertIsoDate(value: string): IsoDate {
  if (!isValidIsoDate(value)) {
    throw new RangeError(`Invalid posting date: ${value}`);
  }
  return value;
}

/** Parses an ISO date into a Date at local midnight. */
export function parseIsoDate(iso: IsoDate): Date {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export type YearMonth = { year: number; month: number };

export function yearMonthOf(iso: IsoDate): YearMonth {
  const date = parseIsoDate(iso);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function currentYearMonth(now: Date = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftYearMonth(value: YearMonth, delta: number): YearMonth {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function monthKey(value: YearMonth): string {
  return `${value.year}-${pad2(value.month)}`;
}

/** Inclusive date range covering a calendar month. */
export function monthRange(value: YearMonth): { start: IsoDate; end: IsoDate } {
  const start = `${value.year}-${pad2(value.month)}-01`;
  const end = `${value.year}-${pad2(value.month)}-${pad2(daysInMonth(value.year, value.month))}`;
  return { start, end };
}

export function monthLabel(value: YearMonth, options: { short?: boolean } = {}): string {
  const name = options.short ? SHORT_MONTH_NAMES[value.month - 1] : MONTH_NAMES[value.month - 1];
  return `${name} ${value.year}`;
}

/** Human label such as "Today", "Yesterday", "Tue, 12 Mar" or "12 Mar 2025". */
export function formatDateLabel(iso: IsoDate, today: IsoDate = todayIsoDate()): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  const date = parseIsoDate(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  const weekday = WEEKDAY_NAMES[date.getDay()]?.slice(0, 3) ?? '';
  const month = SHORT_MONTH_NAMES[date.getMonth()] ?? '';
  return sameYear
    ? `${weekday}, ${date.getDate()} ${month}`
    : `${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function formatLongDate(iso: IsoDate): string {
  const date = parseIsoDate(iso);
  const weekday = WEEKDAY_NAMES[date.getDay()] ?? '';
  const month = MONTH_NAMES[date.getMonth()] ?? '';
  return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** UTC timestamp in ISO 8601, used for created/updated/deleted markers. */
export function nowTimestamp(now: Date = new Date()): string {
  return now.toISOString();
}

export function formatClockTime(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${pad2(minute)} ${suffix}`;
}
