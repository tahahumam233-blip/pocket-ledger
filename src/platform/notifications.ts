import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderPlan, ReminderScheduler } from '@/application/ports';

export const REMINDER_TAP_ROUTE = '/transaction/new?kind=expense&source=reminder';

const supported = Platform.OS !== 'web';
let configured = false;

/** Shows reminders even while the app is open. */
export async function configureNotifications(): Promise<void> {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unsupported'
> {
  if (!supported) return 'unsupported';
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export const expoReminderScheduler: ReminderScheduler = {
  async ensurePermission() {
    if (!supported) return false;
    await configureNotifications();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  },
  async schedule(plan: ReminderPlan) {
    if (!supported) return;
    await configureNotifications();
    await Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: plan.title,
        body: plan.body,
        sound: 'default',
        data: { url: REMINDER_TAP_ROUTE },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: plan.hour,
        minute: plan.minute,
      },
    });
  },
  async cancel(identifier: string) {
    if (!supported) return;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  },
};

/** Reads a route stored on a tapped notification, if any. */
export function routeFromNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined,
): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' ? url : null;
}

const useLastResponse: () => Notifications.NotificationResponse | null | undefined = supported
  ? Notifications.useLastNotificationResponse
  : () => null;

/** The route stored on the notification that opened the app, once known. */
export function useLastNotificationRoute(): string | null {
  const response = useLastResponse();
  return routeFromNotificationResponse(response);
}

export function clearLastNotification(): void {
  if (!supported) return;
  Notifications.clearLastNotificationResponse();
}
