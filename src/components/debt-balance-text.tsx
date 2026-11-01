import { debtStanding, formatMoney } from '@/domain';

import { AppText, type AppTextProps } from './app-text';

type DebtBalanceTextProps = Omit<AppTextProps, 'children'> & {
  balanceMinor: number;
  currency: string;
  /** Short form ("Receivable $60.00") or with the party ("Receivable from Ali $60.00"). */
  name?: string;
};

/** Shows a party balance as a receivable (green), a payable (red) or a nil balance. */
export function DebtBalanceText({
  balanceMinor,
  currency,
  name,
  variant = 'amountSmall',
  ...rest
}: DebtBalanceTextProps) {
  const standing = debtStanding(balanceMinor);
  const amount = formatMoney(Math.abs(balanceMinor), currency);
  const text =
    standing === 'owes_you'
      ? name
        ? `Receivable from ${name} ${amount}`
        : `Receivable ${amount}`
      : standing === 'you_owe'
        ? name
          ? `Payable to ${name} ${amount}`
          : `Payable ${amount}`
        : 'Nil balance';
  const tone = standing === 'owes_you' ? 'income' : standing === 'you_owe' ? 'expense' : 'subtle';
  return (
    <AppText variant={variant} tone={tone} {...rest}>
      {text}
    </AppText>
  );
}
