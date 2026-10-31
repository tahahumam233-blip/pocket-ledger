import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AmountKeypad } from '@/components/amount-keypad';
import { AppText } from '@/components/app-text';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { CurrencyToggle } from '@/components/currency-toggle';
import { DateField } from '@/components/date-field';
import { InputRow, SelectRow } from '@/components/form-row';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { AccountPickerSheet, CategoryPickerSheet } from '@/components/picker-sheets';
import { PressableScale } from '@/components/pressable-scale';
import { ReceiptThumbnail } from '@/components/receipt-thumbnail';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import type { Receipt } from '@/data';
import { useTheme } from '@/design';
import {
  type Account,
  type Category,
  draftFromTransaction,
  formatAmountDraft,
  getCurrency,
  LedgerError,
  minorToDecimalString,
  parseAmount,
  todayIsoDate,
  type TransactionDraft,
  type TransactionKind,
  type TransactionWithLines,
} from '@/domain';
import { haptics } from '@/platform/haptics';
import { captureFromCamera, pickFromLibrary } from '@/platform/image-capture';
import { useLedgerStore, useServices } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { KIND_LABELS } from '@/utils/transaction-presenter';

type EditableKind = 'expense' | 'income' | 'transfer';

type TransactionFormProps = {
  mode: 'create' | 'edit';
  initialKind?: EditableKind;
  initialAccountId?: string;
  /** A pending receipt that should be linked when the entry is saved. */
  receiptId?: string;
  transaction?: TransactionWithLines;
  existingReceipts?: Receipt[];
};

const KIND_OPTIONS: { value: EditableKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

function trimDraft(decimal: string): string {
  if (!decimal.includes('.')) return decimal;
  return decimal.replace(/0+$/, '').replace(/\.$/, '');
}

function lastUsed<T extends { id: string }>(
  items: T[],
  ids: (string | null | undefined)[],
): T | undefined {
  for (const id of ids) {
    const found = id ? items.find((item) => item.id === id) : undefined;
    if (found) return found;
  }
  return items[0];
}

export function TransactionForm({
  mode,
  initialKind = 'expense',
  initialAccountId,
  receiptId,
  transaction,
  existingReceipts = [],
}: TransactionFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const services = useServices();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);

  const accounts = useMemo(() => snapshot?.accounts ?? [], [snapshot?.accounts]);
  const categories = useMemo(() => snapshot?.categories ?? [], [snapshot?.categories]);
  const currencies = snapshot?.settings.currencies ?? ['USD'];
  const balances = useMemo(
    () =>
      new Map((snapshot?.accountBalances ?? []).map((entry) => [entry.account.id, entry.balances])),
    [snapshot?.accountBalances],
  );
  const recent = snapshot?.recentTransactions ?? [];
  const existingDraft = transaction ? draftFromTransaction(transaction) : null;
  const fixedKind: TransactionKind | null =
    transaction && (transaction.kind === 'opening' || transaction.kind === 'adjustment')
      ? transaction.kind
      : null;

  const [kind, setKind] = useState<EditableKind>(() => {
    if (existingDraft && existingDraft.kind !== 'opening' && existingDraft.kind !== 'adjustment')
      return existingDraft.kind;
    return initialKind;
  });
  const [currency, setCurrency] = useState<string>(
    () => existingDraft?.currency ?? currencies[0] ?? 'USD',
  );
  const digits = getCurrency(currency).fractionDigits;
  const otherCurrency = currencies.find((code) => code !== currency) ?? null;

  const [amountDraft, setAmountDraft] = useState<string>(() =>
    existingDraft
      ? trimDraft(
          minorToDecimalString(
            Math.abs(existingDraft.amountMinor),
            getCurrency(existingDraft.currency).fractionDigits,
          ),
        )
      : '',
  );
  const [exchange, setExchange] = useState<boolean>(() =>
    Boolean(existingDraft?.kind === 'transfer' && existingDraft.toCurrency),
  );
  const [toAmountDraft, setToAmountDraft] = useState<string>(() => {
    if (
      existingDraft?.kind === 'transfer' &&
      existingDraft.toCurrency &&
      existingDraft.toAmountMinor !== undefined
    ) {
      return trimDraft(
        minorToDecimalString(
          existingDraft.toAmountMinor,
          getCurrency(existingDraft.toCurrency).fractionDigits,
        ),
      );
    }
    return '';
  });
  const [activeField, setActiveField] = useState<'main' | 'to'>('main');
  const [signNegative] = useState(() =>
    Boolean(existingDraft && fixedKind && existingDraft.amountMinor < 0),
  );

  const [accountId, setAccountId] = useState<string>(() => {
    if (existingDraft)
      return existingDraft.kind === 'transfer'
        ? existingDraft.fromAccountId
        : existingDraft.accountId;
    const recentAccountIds = recent.map((item) => item.lines[0]?.accountId);
    return initialAccountId ?? lastUsed(accounts, recentAccountIds)?.id ?? '';
  });
  const [toAccountId, setToAccountId] = useState<string>(() => {
    if (existingDraft?.kind === 'transfer') return existingDraft.toAccountId;
    return (
      accounts.find((account) => account.id !== (initialAccountId ?? accounts[0]?.id))?.id ?? ''
    );
  });
  const [categoryIds, setCategoryIds] = useState<Record<'expense' | 'income', string>>(() => {
    const pick = (target: 'expense' | 'income') => {
      if (
        existingDraft &&
        (existingDraft.kind === 'expense' || existingDraft.kind === 'income') &&
        existingDraft.kind === target
      ) {
        return existingDraft.categoryId;
      }
      const ofKind = categories.filter(
        (category) => category.kind === target && !category.archivedAt,
      );
      const recentIds = recent
        .filter((item) => item.kind === target)
        .map((item) => item.categoryId);
      return lastUsed(ofKind, recentIds)?.id ?? '';
    };
    return { expense: pick('expense'), income: pick('income') };
  });
  const [postedDate, setPostedDate] = useState(() => existingDraft?.postedDate ?? todayIsoDate());
  const [note, setNote] = useState(() => existingDraft?.note ?? '');
  const [receipts, setReceipts] = useState<Receipt[]>(existingReceipts);
  const [pendingReceipt, setPendingReceipt] = useState<Receipt | null>(null);
  const [picker, setPicker] = useState<'account' | 'toAccount' | 'category' | 'attach' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!receiptId) return;
    let cancelled = false;
    void services.receipts.get(receiptId).then((receipt) => {
      if (!cancelled && receipt) setPendingReceipt(receipt);
    });
    return () => {
      cancelled = true;
    };
  }, [receiptId, services.receipts]);

  const account = accounts.find((item) => item.id === accountId);
  const toAccount = accounts.find((item) => item.id === toAccountId);
  const categoryKind: 'expense' | 'income' = kind === 'income' ? 'income' : 'expense';
  const category = categories.find((item) => item.id === categoryIds[categoryKind]);
  const effectiveKind: TransactionKind = fixedKind ?? kind;
  const title =
    mode === 'edit'
      ? `Edit ${KIND_LABELS[effectiveKind].toLowerCase()}`
      : `New ${KIND_LABELS[kind].toLowerCase()}`;
  const accent =
    kind === 'income'
      ? theme.colors.income
      : kind === 'transfer'
        ? theme.colors.transfer
        : theme.colors.expense;

  const switchCurrency = (code: string) => {
    if (code === currency) return;
    setCurrency(code);
    setAmountDraft('');
    setToAmountDraft('');
  };

  const attach = async (source: 'camera' | 'library') => {
    setPicker(null);
    const image = source === 'camera' ? await captureFromCamera() : await pickFromLibrary();
    if (!image) return;
    try {
      const receipt = await services.receipts.capture(image);
      setReceipts((current) => [...current, receipt]);
      haptics.light();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'The photo could not be saved.', {
        tone: 'danger',
      });
    }
  };

  const buildDraft = (): TransactionDraft | null => {
    const parsed = parseAmount(amountDraft, digits);
    if (!parsed.ok || parsed.minor <= 0) {
      setError('Enter an amount above zero.');
      return null;
    }
    const base = { postedDate, note: note.trim() };
    if (fixedKind) {
      return {
        kind: fixedKind,
        accountId,
        currency,
        amountMinor: signNegative ? -parsed.minor : parsed.minor,
        ...base,
      };
    }
    if (kind === 'transfer') {
      if (exchange && otherCurrency) {
        const parsedTo = parseAmount(toAmountDraft, getCurrency(otherCurrency).fractionDigits);
        if (!parsedTo.ok || parsedTo.minor <= 0) {
          setError(`Enter the amount received in ${otherCurrency}.`);
          return null;
        }
        return {
          kind,
          fromAccountId: accountId,
          toAccountId,
          currency,
          amountMinor: parsed.minor,
          toCurrency: otherCurrency,
          toAmountMinor: parsedTo.minor,
          ...base,
        };
      }
      return {
        kind,
        fromAccountId: accountId,
        toAccountId,
        currency,
        amountMinor: parsed.minor,
        ...base,
      };
    }
    return {
      kind,
      accountId,
      currency,
      amountMinor: parsed.minor,
      categoryId: categoryIds[categoryKind],
      ...base,
    };
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    const draft = buildDraft();
    if (!draft) {
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      await mutate(async (s) => {
        let saved: TransactionWithLines;
        if (mode === 'edit' && transaction) {
          saved = await s.ledger.updateTransaction(transaction.id, draft);
        } else if (pendingReceipt) {
          saved = await s.receipts.recordTransaction(pendingReceipt.id, draft);
        } else {
          saved = await s.ledger.createTransaction(draft);
        }
        for (const receipt of receipts) {
          if (receipt.transactionId !== saved.id) await s.receipts.attach(receipt.id, saved.id);
        }
      });
      haptics.success();
      showToast(mode === 'edit' ? 'Changes saved.' : `${KIND_LABELS[effectiveKind]} recorded.`, {
        tone: 'success',
      });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (caught) {
      haptics.error();
      setError(
        caught instanceof LedgerError
          ? (caught.errors[0]?.message ?? caught.message)
          : caught instanceof Error
            ? caught.message
            : 'Could not save.',
      );
    } finally {
      setSaving(false);
    }
  };

  const amountDisplay = (
    draft: string,
    code: string,
    active: boolean,
    onPress: () => void,
    label?: string,
  ) => {
    const info = getCurrency(code);
    const text = formatAmountDraft(draft);
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Amount'} ${text} ${code}`}
        style={styles.amountBlock}
        scaleTo={0.99}
      >
        {label ? (
          <AppText variant="micro" tone="muted">
            {label}
          </AppText>
        ) : null}
        <View style={styles.amountRow}>
          {info.symbolPosition === 'before' ? (
            <AppText variant="heading" tone={active ? 'text' : 'subtle'}>
              {info.symbol}
            </AppText>
          ) : null}
          <AppText
            variant="amountHero"
            color={active ? accent : theme.colors.textSubtle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {text}
          </AppText>
          {info.symbolPosition === 'after' ? (
            <AppText variant="heading" tone={active ? 'text' : 'subtle'}>
              {info.code}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
    );
  };

  const allReceipts = pendingReceipt ? [pendingReceipt, ...receipts] : receipts;

  return (
    <Screen
      scroll={false}
      edges={['top', 'bottom']}
      header={{
        title,
        close: true,
        right: (
          <Button
            label={saving ? 'Saving' : 'Save'}
            onPress={() => void save()}
            size="sm"
            loading={saving}
            testID="save-transaction"
          />
        ),
      }}
      contentStyle={styles.content}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!fixedKind && mode === 'create' ? (
          <SegmentedControl
            options={KIND_OPTIONS.map((option) => ({
              ...option,
              color:
                option.value === 'income'
                  ? theme.colors.income
                  : option.value === 'transfer'
                    ? theme.colors.transfer
                    : theme.colors.expense,
            }))}
            value={kind}
            onChange={(next) => {
              setKind(next);
              setError(null);
              setActiveField('main');
            }}
          />
        ) : null}

        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xxl,
            },
          ]}
        >
          {amountDisplay(
            amountDraft,
            currency,
            activeField === 'main',
            () => setActiveField('main'),
            exchange && kind === 'transfer' ? 'You send' : undefined,
          )}
          {exchange && kind === 'transfer' && otherCurrency ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              {amountDisplay(
                toAmountDraft,
                otherCurrency,
                activeField === 'to',
                () => setActiveField('to'),
                'They receive',
              )}
            </>
          ) : null}
          {currencies.length > 1 ? (
            <View style={styles.currencyRow}>
              <CurrencyToggle currencies={currencies} value={currency} onChange={switchCurrency} />
            </View>
          ) : null}
        </View>

        <Card padded={false}>
          <SelectRow
            label={kind === 'transfer' ? 'From' : 'Account'}
            value={account?.name ?? ''}
            leading={
              account ? (
                <IconBadge icon={account.icon} color={account.color} size={28} solid />
              ) : undefined
            }
            icon="wallet"
            onPress={() => setPicker('account')}
          />
          {kind === 'transfer' && !fixedKind ? (
            <SelectRow
              label="To"
              value={toAccount?.name ?? ''}
              leading={
                toAccount ? (
                  <IconBadge icon={toAccount.icon} color={toAccount.color} size={28} solid />
                ) : undefined
              }
              icon="arrow-forward"
              onPress={() => setPicker('toAccount')}
            />
          ) : null}
          {kind !== 'transfer' && !fixedKind ? (
            <SelectRow
              label="Category"
              value={category?.name ?? ''}
              leading={
                category ? (
                  <IconBadge icon={category.icon} color={category.color} size={28} outline />
                ) : undefined
              }
              icon="pricetag"
              onPress={() => setPicker('category')}
            />
          ) : null}
          <InputRow
            label="Note"
            icon="create"
            value={note}
            onChangeText={setNote}
            placeholder="Optional"
            maxLength={500}
            returnKeyType="done"
            last
          />
        </Card>

        <View style={styles.block}>
          <AppText variant="labelStrong">Date</AppText>
          <DateField value={postedDate} onChange={setPostedDate} />
        </View>

        {kind === 'transfer' && !fixedKind && otherCurrency ? (
          <Card muted>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <AppText variant="bodyMedium">Exchange currencies</AppText>
                <AppText variant="caption" tone="muted">
                  Send {currency} and receive {otherCurrency}.
                </AppText>
              </View>
              <Switch
                value={exchange}
                onValueChange={(next) => {
                  setExchange(next);
                  setActiveField(next ? 'to' : 'main');
                }}
                trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        ) : null}

        <View style={styles.block}>
          <View style={styles.receiptHeader}>
            <AppText variant="labelStrong">Receipt</AppText>
            <Chip label="Add photo" icon="camera" size="sm" onPress={() => setPicker('attach')} />
          </View>
          {allReceipts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.receiptRow}
            >
              {allReceipts.map((receipt) => (
                <ReceiptThumbnail
                  key={receipt.id}
                  fileName={receipt.fileName}
                  size={72}
                  onPress={() =>
                    router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <AppText variant="caption" tone="subtle">
              Optional. Attach the invoice or receipt for this entry.
            </AppText>
          )}
        </View>

        {error ? (
          <View
            style={[
              styles.error,
              { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radii.md },
            ]}
          >
            <Icon name="alert-circle" size={18} color={theme.colors.danger} />
            <AppText variant="label" tone="danger" style={styles.errorText}>
              {error}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.keypad,
          { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
        ]}
      >
        <AmountKeypad
          value={activeField === 'to' ? toAmountDraft : amountDraft}
          onChange={(next) => {
            setError(null);
            if (activeField === 'to') setToAmountDraft(next);
            else setAmountDraft(next);
          }}
          fractionDigits={
            activeField === 'to' && otherCurrency
              ? getCurrency(otherCurrency).fractionDigits
              : digits
          }
        />
      </View>

      <AccountPickerSheet
        visible={picker === 'account'}
        onClose={() => setPicker(null)}
        accounts={accounts}
        balances={balances}
        currencies={currencies}
        value={accountId}
        title={kind === 'transfer' ? 'From account' : 'Account'}
        onSelect={(selected: Account) => {
          setAccountId(selected.id);
          if (selected.id === toAccountId)
            setToAccountId(accounts.find((item) => item.id !== selected.id)?.id ?? '');
        }}
      />
      <AccountPickerSheet
        visible={picker === 'toAccount'}
        onClose={() => setPicker(null)}
        accounts={accounts}
        balances={balances}
        currencies={currencies}
        value={toAccountId}
        excludeId={accountId}
        title="To account"
        onSelect={(selected: Account) => setToAccountId(selected.id)}
      />
      <CategoryPickerSheet
        visible={picker === 'category'}
        onClose={() => setPicker(null)}
        categories={categories}
        kind={categoryKind}
        value={categoryIds[categoryKind]}
        onSelect={(selected: Category) =>
          setCategoryIds((current) => ({ ...current, [categoryKind]: selected.id }))
        }
        onManage={() => {
          setPicker(null);
          router.push('/settings/categories');
        }}
      />
      <BottomSheet
        visible={picker === 'attach'}
        onClose={() => setPicker(null)}
        title="Attach a receipt"
        scroll={false}
      >
        <Button
          label="Take a photo"
          icon="camera"
          variant="secondary"
          onPress={() => void attach('camera')}
          fullWidth
        />
        <Button
          label="Choose from photos"
          icon="images"
          variant="secondary"
          onPress={() => void attach('library')}
          fullWidth
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    gap: 0,
    paddingBottom: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 16,
  },
  amountCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  amountBlock: {
    alignItems: 'center',
    gap: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  currencyRow: {
    alignSelf: 'center',
    width: 180,
  },
  block: {
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptRow: {
    gap: 10,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  errorText: {
    flex: 1,
  },
  keypad: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
