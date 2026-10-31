import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { authenticate } from '@/platform/app-lock';

/**
 * Locks the ledger at cold start and whenever the app returns from the
 * background while the lock is enabled. Toggling the setting on never locks
 * the person who just turned it on.
 */
export function useAppLock(enabled: boolean) {
  const [lockedState, setLocked] = useState(enabled);
  const locked = enabled && lockedState;
  const [checking, setChecking] = useState(false);
  const enabledRef = useRef(enabled);
  const authenticating = useRef(false);
  const wentToBackground = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (!enabledRef.current || authenticating.current) return;
      if (next === 'background') wentToBackground.current = true;
      if (next === 'active' && wentToBackground.current) {
        wentToBackground.current = false;
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setChecking(true);
    try {
      const ok = await authenticate('Unlock Pocket Ledger');
      if (ok) setLocked(false);
    } finally {
      authenticating.current = false;
      setChecking(false);
    }
  }, []);

  return { locked, checking, unlock };
}
