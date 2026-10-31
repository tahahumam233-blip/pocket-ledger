import { Platform } from 'react-native';

/** True inside Safari (or another browser) on an iPhone or iPad, rather than the installed app. */
export function isIosBrowserTab(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !isInstalledWebApp();
}

/** True when opened from the home screen icon. */
export function isInstalledWebApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

const DISMISS_KEY = 'pocket-ledger-install-guide-dismissed';

export function installGuideDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallGuide(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Without session storage the guide simply shows again next time.
  }
}
