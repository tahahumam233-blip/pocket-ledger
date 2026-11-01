import { debtStanding, formatMoney } from '@/domain';

import { AppText, type AppTextProps } from './app-text';

type DebtBalanceTextProps = Omit<AppTextProps, 'children'> & {
  balanceMinor: number;
  currency: string;
  /** Short form ("Owes you $60.00") or with the name ("Ali owes you $60.00"). */
  name?: string;
};

/** Shows a person balance in words, green when they owe you and red when you owe them. */
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
        ? `${name} owes you ${amount}`
        : `Owes you ${amount}`
      : standing === 'you_owe'
        ? name
          ? `You owe ${name} ${amount}`
          : `You owe ${amount}`
        : 'Settled';
  const tone = standing === 'owes_you' ? 'income' : standing === 'you_owe' ? 'expense' : 'subtle';
  return (
    <AppText variant={variant} tone={tone} {...rest}>
      {text}
    </AppText>
  );
}
