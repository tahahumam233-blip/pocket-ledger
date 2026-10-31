import { Alert } from 'react-native';

import type { ConfirmOptions } from '@/state/confirm-store';

/** Asks a yes/no question with the platform's native alert. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: options.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel ?? 'OK',
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
