import type { ReminderPlan, ReminderScheduler } from './ports';
import type { AppSettings } from './settings';

export const REMINDER_IDENTIFIER = 'daily-spending-reminder';

/** Builds tonight's reminder from settings; null means no reminder should exist. */
export function planReminder(
  settings: Pick<AppSettings, 'reminderEnabled' | 'reminderHour' | 'reminderMinute' | 'userName'>,
  pendingReceipts: number,
): ReminderPlan | null {
  if (!settings.reminderEnabled) return null;
  const greeting = settings.userName ? `${settings.userName}, h` : 'H';
  const body =
    pendingReceipts > 0
      ? `${greeting}ow did today go? You also have ${pendingReceipts} receipt${pendingReceipts === 1 ? '' : 's'} waiting for an amount.`
      : `${greeting}ow did today go? Take a moment to record what you spent.`;
  return {
    identifier: REMINDER_IDENTIFIER,
    title: "Tonight's spending check-in",
    body,
    hour: settings.reminderHour,
    minute: settings.reminderMinute,
  };
}

export function reminderSignature(plan: ReminderPlan | null): string {
  return plan ? `${plan.hour}:${plan.minute}|${plan.body}` : '';
}

/**
 * Makes the scheduled notification match the desired plan. Returns the new
 * signature so callers can persist it and skip redundant rescheduling.
 */
export async function syncReminder(
  scheduler: ReminderScheduler,
  plan: ReminderPlan | null,
  previousSignature: string,
): Promise<{ signature: string; permissionDenied: boolean }> {
  const signature = reminderSignature(plan);
  if (!plan) {
    await scheduler.cancel(REMINDER_IDENTIFIER);
    return { signature, permissionDenied: false };
  }
  const allowed = await scheduler.ensurePermission();
  if (!allowed) {
    await scheduler.cancel(REMINDER_IDENTIFIER);
    return { signature: '', permissionDenied: true };
  }
  if (signature === previousSignature) return { signature, permissionDenied: false };
  await scheduler.cancel(REMINDER_IDENTIFIER);
  await scheduler.schedule(plan);
  return { signature, permissionDenied: false };
}
