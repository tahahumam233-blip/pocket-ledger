import { StyleSheet } from 'react-native';

import { useTheme } from '@/design';
import { haptics } from '@/platform/haptics';
import { useAmountsHidden, useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type AmountsToggleProps = {
  /** 'hero' sits on the blue Home card; 'plain' matches the round header buttons. */
  variant?: 'hero' | 'plain';
};

/**
 * The eye button. One tap hides every amount in the app behind dots, for showing the
 * screen to someone; another tap shows them again. The choice survives a restart.
 */
export function AmountsToggle({ variant = 'plain' }: AmountsToggleProps) {
  const theme = useTheme();
  const hidden = useAmountsHidden();
  const setAmountsHidden = useLedgerStore((state) => state.setAmountsHidden);
  const hero = variant === 'hero';

  const toggle = () => {
    haptics.tap();
    setAmountsHidden(!hidden).catch(() =>
      showToast('Could not save that setting.', { tone: 'danger' }),
    );
  };

  return (
    <PressableScale
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
      hitSlop={10}
      testID="amounts-toggle"
      style={[
        styles.button,
        hero
          ? { backgroundColor: 'rgba(255,255,255,0.16)' }
          : {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
      ]}
    >
      <Icon
        name={hidden ? 'eye-off' : 'eye'}
        size={hero ? 20 : 22}
        color={hero ? theme.colors.heroText : theme.colors.text}
        outline
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
