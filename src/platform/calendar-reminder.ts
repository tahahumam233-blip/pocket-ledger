import { Platform } from 'react-native';

import { webAssetUrl } from './web-base';

/** The web app cannot schedule notifications, so it offers a calendar alarm instead. */
export const USES_CALENDAR_REMINDER = Platform.OS === 'web';

const pad = (value: number) => String(value).padStart(2, '0');

/** Address of the published calendar file for a reminder time (5-minute steps). */
export function reminderCalendarUrl(hour: number, minute: number): string {
  const total = (hour * 60 + Math.round(minute / 5) * 5) % (24 * 60);
  const slot = `${pad(Math.floor(total / 60))}${pad(total % 60)}`;
  return webAssetUrl(`reminders/pocket-ledger-${slot}.ics`);
}

/** Opens the calendar file; iPhone shows its "Add to Calendar" screen. */
export function openReminderCalendar(hour: number, minute: number): void {
  if (Platform.OS !== 'web') return;
  window.open(reminderCalendarUrl(hour, minute), '_blank');
}
