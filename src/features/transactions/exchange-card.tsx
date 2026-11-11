import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme } from '@/design';
import { describeRate, type ExchangeQuote, formatAmountDraft, formatRate } from '@/domain';

export type ExchangeField = 'give' | 'receive' | 'rate';

type ExchangeCardProps = {
  giveCurrency: string;
  receiveCurrency: string;
  giveDraft: string;
  receiveDraft: string;
  /** The rate as typed, or the one the two amounts imply. */
  rate: string;
  rateBase: string;
  rateQuote: string;
  /** The box the keypad is typing into. */
  active: ExchangeField | null;
  onFocus: (field: ExchangeField) => void;
  /** Turns the exchange round: what was received is now given. */
  onSwap: () => void;
  /** Quotes the rate the other way round. */
  onFlipRate: () => void;
  /** The rate of the last exchange, offered as a shortcut. */
  lastRate: ExchangeQuote | null;
  onUseLastRate: () => void;
};

/**
 * The amounts of a currency exchange: what you give, what you receive and the
 * rate between them. Typing any two fills in the third.
 */
export function ExchangeCard({
  giveCurrency,
  receiveCurrency,
  giveDraft,
  receiveDraft,
  rate,
  rateBase,
  rateQuote,
  active,
  onFocus,
  onSwap,
  onFlipRate,
  lastRate,
  onUseLastRate,
}: ExchangeCardProps) {
  const theme = useTheme();
  const accent = theme.colors.transfer;

  const amount = (field: 'give' | 'receive', label: string, draft: string, currency: string) => {
    const focused = active === field;
    const text = formatAmountDraft(draft);
    return (
      <PressableScale
        onPress={() => onFocus(field)}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${text} ${currency}`}
        aria-selected={focused}
        testID={`exchange-${field}`}
        style={[
          styles.amount,
          {
            borderRadius: theme.radii.lg,
            borderColor: focused ? accent : 'transparent',
            backgroundColor: focused ? theme.colors.transferSoft : 'transparent',
          },
        ]}
      >
        <View style={styles.amountText}>
          <AppText variant="micro" tone="muted">
            {label}
          </AppText>
          <AppText
            variant="amountLarge"
            color={draft ? theme.colors.text : theme.colors.textSubtle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {text}
          </AppText>
        </View>
        <View
          style={[
            styles.currency,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.pill },
          ]}
        >
          <AppText variant="labelStrong">{currency}</AppText>
        </View>
      </PressableScale>
    );
  };

  const rateFocused = active === 'rate';
  const showLastRate = lastRate !== null && !(rateBase === lastRate.base && rate === lastRate.rate);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xxl,
        },
      ]}
    >
      {amount('give', 'You give', giveDraft, giveCurrency)}
      <View style={styles.swapRow}>
        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
        <PressableScale
          onPress={onSwap}
          haptic
          accessibilityRole="button"
          accessibilityLabel={`Swap: give ${receiveCurrency} and receive ${giveCurrency}`}
          hitSlop={8}
          testID="exchange-swap"
          style={[
            styles.swap,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong },
          ]}
        >
          <Icon name="swap-vertical" size={18} color={accent} />
        </PressableScale>
        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
      </View>
      {amount('receive', 'You receive', receiveDraft, receiveCurrency)}

      <View
        style={[
          styles.rateRow,
          {
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted,
          },
        ]}
      >
        <AppText variant="label" tone="muted">
          Rate
        </AppText>
        <AppText variant="label" tone="muted">
          1 {rateBase} =
        </AppText>
        <PressableScale
          onPress={() => onFocus('rate')}
          accessibilityRole="button"
          accessibilityLabel={`Rate: 1 ${rateBase} equals ${rate || 'not set'} ${rateQuote}`}
          aria-selected={rateFocused}
          testID="exchange-rate"
          style={[
            styles.rateBox,
            {
              borderRadius: theme.radii.md,
              borderColor: rateFocused ? accent : theme.colors.border,
              borderWidth: rateFocused ? 2 : StyleSheet.hairlineWidth,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <AppText
            variant="amountSmall"
            tone={rate ? 'text' : 'subtle'}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {rate ? formatRate(rate) : '0'}
          </AppText>
        </PressableScale>
        <AppText variant="label" tone="muted">
          {rateQuote}
        </AppText>
        <PressableScale
          onPress={onFlipRate}
          accessibilityRole="button"
          accessibilityLabel={`Quote the rate per ${rateQuote} instead`}
          hitSlop={10}
          testID="exchange-flip-rate"
        >
          <Icon name="repeat" size={18} color={theme.colors.textMuted} />
        </PressableScale>
      </View>

      {showLastRate && lastRate ? (
        <View style={styles.lastRate}>
          <Chip
            label={`Use last rate: ${describeRate(lastRate)}`}
            icon="time"
            size="sm"
            onPress={onUseLastRate}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
  },
  amountText: {
    flex: 1,
    gap: 2,
  },
  currency: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  swap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  rateBox: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lastRate: {
    flexDirection: 'row',
    paddingTop: 2,
  },
});
