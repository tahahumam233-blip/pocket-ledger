import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TransactionRow } from '@/components/transaction-row';
import { useTheme } from '@/design';
import { formatLongDate, formatMoney } from '@/domain';
import { useBackup } from '@/features/backup/use-backup';
import { useQuickCapture } from '@/features/receipts/use-quick-capture';
import { useLedgerStore } from '@/state/ledger-store';
import { buildLookup } from '@/utils/transaction-presenter';

function greetingFor(hour: number, name: string) {
  const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : base;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const loading = useLedgerStore((state) => state.loading);
  const refresh = useLedgerStore((state) => state.refresh);
  const capture = useQuickCapture();
  const backup = useBackup();

  if (!snapshot) return <Screen />;
  const {
    settings,
    accountBalances,
    totals,
    spentToday,
    spentThisMonth,
    recentTransactions,
    pendingReceipts,
    today,
  } = snapshot;
  const [primary, ...others] = settings.currencies;
  const lookup = buildLookup(snapshot.accounts, snapshot.categories);
  const hour = new Date().getHours();
  const suggestBackup = Platform.OS === 'web' && snapshot.backupDue;

  const spendLine = (totalsByCurrency: Partial<Record<string, number>>) => {
    const parts = settings.currencies
      .filter((code) => (totalsByCurrency[code] ?? 0) > 0)
      .map((code) => formatMoney(totalsByCurrency[code] ?? 0, code));
    return parts.length ? parts.join('  ·  ') : 'Nothing yet';
  };

  const quickActions = [
    {
      label: 'Expense',
      icon: 'remove-circle',
      color: theme.colors.expense,
      onPress: () => router.push({ pathname: '/transaction/new', params: { kind: 'expense' } }),
    },
    {
      label: 'Income',
      icon: 'add-circle',
      color: theme.colors.income,
      onPress: () => router.push({ pathname: '/transaction/new', params: { kind: 'income' } }),
    },
    {
      label: 'Transfer',
      icon: 'swap-horizontal',
      color: theme.colors.transfer,
      onPress: () => router.push({ pathname: '/transaction/new', params: { kind: 'transfer' } }),
    },
    {
      label: 'Receipt',
      icon: 'camera',
      color: theme.colors.warning,
      onPress: () => void capture.snap(),
    },
  ];

  return (
    <Screen
      refreshing={loading}
      onRefresh={() => void refresh()}
      bottomInset={theme.layout.tabBarHeight}
    >
      <View style={styles.topRow}>
        <View style={styles.greeting}>
          <AppText variant="caption" tone="muted">
            {formatLongDate(today)}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {greetingFor(hour, settings.userName)}
          </AppText>
        </View>
        <PressableScale
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={[
            styles.gear,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Icon name="settings" size={22} color={theme.colors.text} outline />
        </PressableScale>
      </View>

      <LinearGradient
        colors={theme.colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: theme.radii.xxl }]}
      >
        <View style={styles.heroGlow} />
        <AppText variant="micro" tone="heroMuted">
          Total balance
        </AppText>
        {primary ? (
          <MoneyText
            amountMinor={totals[primary] ?? 0}
            currency={primary}
            variant="amountHero"
            tone="hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          />
        ) : null}
        {others.map((code) => (
          <MoneyText
            key={code}
            amountMinor={totals[code] ?? 0}
            currency={code}
            variant="heading"
            tone="heroMuted"
          />
        ))}
        <View style={[styles.heroStats, { borderTopColor: 'rgba(255,255,255,0.18)' }]}>
          <View style={styles.heroStat}>
            <AppText variant="micro" tone="heroMuted">
              Spent today
            </AppText>
            <AppText variant="captionStrong" tone="hero">
              {spendLine(spentToday)}
            </AppText>
          </View>
          <View style={styles.heroStat}>
            <AppText variant="micro" tone="heroMuted">
              This month
            </AppText>
            <AppText variant="captionStrong" tone="hero">
              {spendLine(spentThisMonth)}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.quickRow}>
        {quickActions.map((action) => (
          <PressableScale
            key={action.label}
            onPress={action.onPress}
            haptic
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.quickAction}
          >
            <IconBadge icon={action.icon} color={action.color} size={52} />
            <AppText variant="label">{action.label}</AppText>
          </PressableScale>
        ))}
      </View>

      {pendingReceipts > 0 ? (
        <Card
          onPress={() => router.push('/receipts')}
          style={{ backgroundColor: theme.colors.warningSoft, borderColor: 'transparent' }}
        >
          <View style={styles.bannerRow}>
            <IconBadge icon="receipt" color={theme.colors.warning} size={40} outline />
            <View style={styles.bannerText}>
              <AppText variant="bodyStrong">
                {pendingReceipts === 1
                  ? '1 receipt needs an amount'
                  : `${pendingReceipts} receipts need amounts`}
              </AppText>
              <AppText variant="caption" tone="muted">
                Tap to finish recording them.
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {suggestBackup ? (
        <Card onPress={() => void backup.backupNow()} accessibilityLabel="Back up now">
          <View style={styles.bannerRow}>
            <IconBadge icon="cloud-upload" color={theme.colors.primary} size={40} outline />
            <View style={styles.bannerText}>
              <AppText variant="bodyStrong">
                {backup.busy === 'backup' ? 'Preparing backup…' : 'Time for a backup'}
              </AppText>
              <AppText variant="caption" tone="muted">
                Save a copy to iCloud Drive in case the app is ever removed.
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Accounts"
          actionLabel="Manage"
          onAction={() => router.push('/settings/accounts')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountsRow}
          style={styles.accountsScroll}
        >
          {accountBalances.map(({ account, balances }) => (
            <AccountCard
              key={account.id}
              account={account}
              balances={balances}
              currencies={settings.currencies}
              onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent"
          actionLabel="See all"
          onAction={() => router.push('/activity')}
        />
        {recentTransactions.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="sparkles"
              title="No spending recorded yet"
              message="Add your first expense with the + button, or snap a receipt to record it later."
              actionLabel="Add an expense"
              onAction={() =>
                router.push({ pathname: '/transaction/new', params: { kind: 'expense' } })
              }
            />
          </Card>
        ) : (
          <Card padded={false}>
            {recentTransactions.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                lookup={lookup}
                last={index === recentTransactions.length - 1}
                onPress={() =>
                  router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })
                }
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 12,
  },
  greeting: {
    flex: 1,
    gap: 2,
  },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: {
    padding: 22,
    gap: 4,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroStat: {
    flex: 1,
    gap: 4,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: 12,
  },
  accountsScroll: {
    marginHorizontal: -20,
  },
  accountsRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
});
