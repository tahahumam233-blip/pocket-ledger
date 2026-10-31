import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, withAlpha } from '@/design';
import {
  type Account,
  type Category,
  type CategoryKind,
  type Currency,
  searchCurrencies,
} from '@/domain';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { TextField } from './form-row';
import { Icon } from './icon';
import { IconBadge } from './icon-badge';
import { MoneyText } from './money-text';
import { PressableScale } from './pressable-scale';

type CategoryPickerProps = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  kind: CategoryKind;
  value: string | null;
  onSelect: (category: Category) => void;
  onManage?: () => void;
};

export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  kind,
  value,
  onSelect,
  onManage,
}: CategoryPickerProps) {
  const theme = useTheme();
  const options = categories.filter((category) => category.kind === kind && !category.archivedAt);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={kind === 'income' ? 'Income category' : 'Category'}
      right={
        onManage ? (
          <PressableScale
            onPress={onManage}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Manage categories"
          >
            <Icon name="create" size={22} color={theme.colors.primary} outline />
          </PressableScale>
        ) : undefined
      }
    >
      <View style={styles.grid}>
        {options.map((category) => {
          const selected = category.id === value;
          return (
            <PressableScale
              key={category.id}
              onPress={() => {
                onSelect(category);
                onClose();
              }}
              haptic
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.tile,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: selected
                    ? withAlpha(category.color, theme.isDark ? 0.3 : 0.14)
                    : theme.colors.surface,
                  borderColor: selected ? withAlpha(category.color, 0.6) : theme.colors.border,
                },
              ]}
            >
              <IconBadge
                icon={category.icon}
                color={category.color}
                size={40}
                outline={!selected}
                solid={selected}
              />
              <AppText variant="captionStrong" align="center" numberOfLines={2}>
                {category.name}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

type AccountPickerProps = {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  balances?: Map<string, Partial<Record<string, number>>>;
  currencies?: string[];
  value: string | null;
  excludeId?: string | null;
  title?: string;
  onSelect: (account: Account) => void;
};

export function AccountPickerSheet({
  visible,
  onClose,
  accounts,
  balances,
  currencies = [],
  value,
  excludeId,
  title = 'Account',
  onSelect,
}: AccountPickerProps) {
  const theme = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {accounts
          .filter((account) => !account.archivedAt && account.id !== excludeId)
          .map((account) => {
            const selected = account.id === value;
            const accountBalances = balances?.get(account.id) ?? {};
            return (
              <PressableScale
                key={account.id}
                onPress={() => {
                  onSelect(account);
                  onClose();
                }}
                haptic
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.accountRow,
                  {
                    borderRadius: theme.radii.lg,
                    backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: selected
                      ? withAlpha(theme.colors.primary, 0.5)
                      : theme.colors.border,
                  },
                ]}
              >
                <IconBadge icon={account.icon} color={account.color} size={40} solid />
                <View style={styles.accountText}>
                  <AppText variant="bodyStrong">{account.name}</AppText>
                  {currencies.length > 0 ? (
                    <View style={styles.balanceRow}>
                      {currencies.map((currency) => (
                        <MoneyText
                          key={currency}
                          amountMinor={accountBalances[currency] ?? 0}
                          currency={currency}
                          variant="amountSmall"
                          tone="muted"
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
                {selected ? (
                  <Icon name="checkmark-circle" size={22} color={theme.colors.primary} />
                ) : null}
              </PressableScale>
            );
          })}
      </View>
    </BottomSheet>
  );
}

type CurrencyPickerProps = {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  disabledCodes?: string[];
  onSelect: (currency: Currency) => void;
  title?: string;
};

export function CurrencyPickerSheet({
  visible,
  onClose,
  value,
  disabledCodes = [],
  onSelect,
  title = 'Choose a currency',
}: CurrencyPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCurrencies(query), [query]);
  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={title}
      maxHeight={0.9}
    >
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by code, name or country"
        autoCapitalize="characters"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={styles.list}>
        {results.map((currency) => {
          const selected = currency.code === value;
          const disabled = disabledCodes.includes(currency.code) && !selected;
          return (
            <PressableScale
              key={currency.code}
              disabled={disabled}
              onPress={() => {
                onSelect(currency);
                setQuery('');
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              style={[
                styles.currencyRow,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: selected
                    ? withAlpha(theme.colors.primary, 0.5)
                    : theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.codeBadge,
                  { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
                ]}
              >
                <AppText variant="labelStrong">{currency.code}</AppText>
              </View>
              <View style={styles.accountText}>
                <AppText variant="bodyMedium">{currency.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {currency.region} · {currency.symbol}
                </AppText>
              </View>
              {selected ? (
                <Icon name="checkmark-circle" size={22} color={theme.colors.primary} />
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '30.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  list: {
    gap: 8,
    paddingBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
  },
  codeBadge: {
    width: 56,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
