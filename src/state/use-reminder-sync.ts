import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { planReminder, syncReminder } from '@/application/reminder';
import { USES_CALENDAR_REMINDER } from '@/platform/calendar-reminder';
import { expoReminderScheduler } from '@/platform/notifications';

import { useLedgerStore } from './ledger-store';

/**
 * Keeps the nightly notification in step with settings and the receipt inbox.
 * Runs after every ledger refresh and whenever the app returns to the foreground.
 */
export function useReminderSync() {
  const services = useLedgerStore((state) => state.services);
  const settings = useLedgerStore((state) => state.settings);
  const pending = useLedgerStore((state) => state.snapshot?.pendingReceipts ?? 0);
  const busy = useRef(false);

  useEffect(() => {
    // The web app cannot schedule notifications; it offers a calendar alarm instead.
    if (USES_CALENDAR_REMINDER) return;
    if (!services || !settings.onboardingCompleted) return;
    let cancelled = false;

    const sync = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const plan = planReminder(settings, pending);
        const result = await syncReminder(expoReminderScheduler, plan, settings.reminderSignature);
        if (cancelled) return;
        if (result.permissionDenied && settings.reminderEnabled) {
          await services.setup.updateSettings({ reminderEnabled: false, reminderSignature: '' });
          await useLedgerStore.getState().refresh();
        } else if (result.signature !== settings.reminderSignature) {
          await services.setup.updateSettings({ reminderSignature: result.signature });
          useLedgerStore.setState({
            settings: { ...settings, reminderSignature: result.signature },
          });
        }
      } catch {
        // Scheduling is best effort; the ledger itself is unaffected.
      } finally {
        busy.current = false;
      }
    };

    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [services, settings, pending]);
}
