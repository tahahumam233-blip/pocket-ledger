import { type FormatMoneyOptions, formatMoney } from '@/domain';
import type { TypographyVariant } from '@/design';
import { useAmountsHidden } from '@/state/ledger-store';

import { AppText, type AppTextProps, type TextTone } from './app-text';

type MoneyTextProps = Omit<AppTextProps, 'children' | 'variant'> & {
  amountMinor: number;
  currency: string;
  variant?: TypographyVariant;
  /** Colors negatives red and positives green when true. */
  signed?: boolean;
  format?: FormatMoneyOptions;
};

export function MoneyText({
  amountMinor,
  currency,
  variant = 'amount',
  signed = false,
  format,
  tone,
  ...rest
}: MoneyTextProps) {
  const masked = useAmountsHidden();
  let resolvedTone: TextTone | undefined = tone;
  // Hidden amounts keep a neutral colour, so red or green does not reveal the sign.
  if (signed && !tone && !masked) {
    resolvedTone = amountMinor < 0 ? 'expense' : amountMinor > 0 ? 'income' : 'muted';
  }
  return (
    <AppText variant={variant} tone={resolvedTone} {...rest}>
      {formatMoney(amountMinor, currency, {
        sign: signed ? 'always' : 'auto',
        ...format,
        masked,
      })}
    </AppText>
  );
}
