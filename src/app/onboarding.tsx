import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { OnboardingAccountInput } from '@/application/setup-service';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectRow, TextField } from '@/components/form-row';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { CurrencyPickerSheet } from '@/components/picker-sheets';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { TimeField } from '@/components/time-field';
import brand from '@/config/brand.json';
import { useTheme, withAlpha } from '@/design';
import {
  type AccountKind,
  DEFAULT_ACCOUNT_TEMPLATES,
  defaultCurrencyPair,
  getCurrency,
  parseAmount,
} from '@/domain';
import { useBackup } from '@/features/backup/use-backup';
import { CalendarReminderCard } from '@/features/reminders/calendar-reminder-card';
import { USES_CALENDAR_REMINDER } from '@/platform/calendar-reminder';
import { deviceCurrencyCode } from '@/platform/device-locale';
import { haptics } from '@/platform/haptics';
import { expoReminderScheduler } from '@/platform/notifications';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

type Step = 'welcome' | 'currencies' | 'accounts' | 'reminder';
const STEPS: Step[] = ['welcome', 'currencies', 'accounts', 'reminder'];

type AccountSetup = { enabled: boolean; balances: Record<string, string> };

const FEATURES = [
  {
    icon: 'cash',
    title: 'Two currencies, kept apart',
    copy: 'Track both without ever mixing them into one misleading total.',
  },
  {
    icon: 'wallet',
    title: 'Safe, pocket and bank',
    copy: 'See exactly how much sits in each place, derived from every entry.',
  },
  {
    icon: 'camera',
    title: 'Snap receipts now, add amounts later',
    copy: 'Invoices wait in an inbox until you have a minute.',
  },
  {
    icon: 'moon',
    title: 'A nightly nudge',
    copy: 'One gentle reminder each evening to record the day.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Private by design',
    copy: 'Everything stays on this phone. No account, no cloud, no ads.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const mutate = useLedgerStore((state) => state.mutate);
  const [step, setStep] = useState<Step>('welcome');
  const defaults = useMemo(() => defaultCurrencyPair(deviceCurrencyCode()), []);
  const [primary, setPrimary] = useState(defaults.primary);
  const [secondary, setSecondary] = useState(defaults.secondary);
  const [picker, setPicker] = useState<'primary' | 'secondary' | null>(null);
  const [userName, setUserName] = useState('');
  const [accounts, setAccounts] = useState<Record<AccountKind, AccountSetup>>({
    safe: { enabled: true, balances: {} },
    pocket: { enabled: true, balances: {} },
    bank: { enabled: true, balances: {} },
    other: { enabled: false, balances: {} },
  });
  const [reminderEnabled, setReminderEnabled] = useState(!USES_CALENDAR_REMINDER);
  const backup = useBackup();
  const [reminderTime, setReminderTime] = useState({ hour: 21, minute: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currencies = [primary, secondary];
  const stepIndex = STEPS.indexOf(step);

  const setBalance = (kind: AccountKind, code: string, value: string) => {
    setAccounts((current) => ({
      ...current,
      [kind]: { ...current[kind], balances: { ...current[kind].balances, [code]: value } },
    }));
  };

  const toggleReminder = async (next: boolean) => {
    if (next) {
      const allowed = await expoReminderScheduler.ensurePermission();
      if (!allowed) {
        showToast('Notifications are off for this app. You can enable them later in Settings.', {
          tone: 'danger',
        });
        setReminderEnabled(false);
        return;
      }
    }
    setReminderEnabled(next);
  };

  const finish = async () => {
    setError(null);
    const selected = DEFAULT_ACCOUNT_TEMPLATES.filter(
      (template) => accounts[template.kind].enabled,
    );
    if (selected.length === 0) {
      setError('Keep at least one account.');
      setStep('accounts');
      return;
    }
    const inputs: OnboardingAccountInput[] = [];
    for (const template of selected) {
      const openingBalances: Record<string, number> = {};
      for (const code of currencies) {
        const raw = accounts[template.kind].balances[code]?.trim() ?? '';
        if (!raw) continue;
        const parsed = parseAmount(raw, getCurrency(code).fractionDigits);
        if (!parsed.ok) {
          setError(`Check the ${code} balance for ${template.name}.`);
          setStep('accounts');
          return;
        }
        openingBalances[code] = parsed.minor;
      }
      inputs.push({
        name: template.name,
        kind: template.kind,
        icon: template.icon,
        color: template.color,
        openingBalances,
      });
    }
    setSaving(true);
    try {
      await mutate((services) =>
        services.setup.completeOnboarding({
          currencies: [primary, secondary],
          userName,
          accounts: inputs,
          reminder: {
            enabled: reminderEnabled,
            hour: reminderTime.hour,
            minute: reminderTime.minute,
          },
        }),
      );
      haptics.success();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Setup could not be saved.');
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 'currencies' && primary === secondary) {
      setError('Choose two different currencies.');
      return;
    }
    setError(null);
    haptics.tap();
    const following = STEPS[stepIndex + 1];
    if (following) setStep(following);
  };

  const back = () => {
    setError(null);
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous);
  };

  return (
    <Screen edges={['top', 'bottom']} keyboard contentStyle={styles.content}>
      <View style={styles.progress}>
        {STEPS.map((item, index) => (
          <View
            key={item}
            style={[
              styles.dot,
              {
                backgroundColor: index <= stepIndex ? theme.colors.primary : theme.colors.border,
                width: index === stepIndex ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {step === 'welcome' ? (
        <View style={styles.stepBody}>
          <LinearGradient
            colors={theme.colors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderRadius: theme.radii.xxl }]}
          >
            <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Icon name="wallet" size={34} color="#FFFFFF" />
            </View>
            <AppText variant="micro" tone="heroMuted">
              Welcome to
            </AppText>
            <AppText variant="display" tone="hero">
              {brand.name}
            </AppText>
            <AppText tone="heroMuted">A calm, private place to see where your money goes.</AppText>
          </LinearGradient>
          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.feature}>
                <IconBadge icon={feature.icon} color={theme.colors.primary} size={40} outline />
                <View style={styles.featureText}>
                  <AppText variant="bodyStrong">{feature.title}</AppText>
                  <AppText variant="caption" tone="muted">
                    {feature.copy}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <PressableScale
            onPress={() => void backup.restoreFromFile()}
            accessibilityRole="button"
            style={styles.restoreLink}
            testID="onboarding-restore"
          >
            <Icon name="refresh" size={16} color={theme.colors.primary} />
            <AppText variant="labelStrong" tone="primary">
              {backup.busy === 'restore' ? 'Restoring…' : 'Restore from a backup instead'}
            </AppText>
          </PressableScale>
        </View>
      ) : null}

      {step === 'currencies' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">Your two currencies</AppText>
          <AppText tone="muted">
            Pick the one you use most as primary. Each account can hold both, and totals are always
            shown separately.
          </AppText>
          <Card padded={false}>
            <SelectRow
              label="Primary"
              value={`${primary} · ${getCurrency(primary).name}`}
              icon="star"
              iconColor={theme.colors.warning}
              onPress={() => setPicker('primary')}
            />
            <SelectRow
              label="Secondary"
              value={`${secondary} · ${getCurrency(secondary).name}`}
              icon="swap-horizontal"
              onPress={() => setPicker('secondary')}
              last
            />
          </Card>
          <View style={styles.nameBlock}>
            <AppText variant="labelStrong">What should we call you? (optional)</AppText>
            <TextField
              value={userName}
              onChangeText={setUserName}
              placeholder="Your first name"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>
      ) : null}

      {step === 'accounts' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">Where your money lives</AppText>
          <AppText tone="muted">
            Turn on the places you use and enter what each holds right now. You can leave balances
            empty and fix them later.
          </AppText>
          {DEFAULT_ACCOUNT_TEMPLATES.map((template) => {
            const setup = accounts[template.kind];
            return (
              <Card key={template.kind} style={!setup.enabled ? styles.disabledCard : undefined}>
                <View style={styles.accountHeader}>
                  <IconBadge icon={template.icon} color={template.color} size={44} solid />
                  <View style={styles.accountText}>
                    <AppText variant="bodyStrong">{template.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {template.description}
                    </AppText>
                  </View>
                  <Switch
                    value={setup.enabled}
                    onValueChange={(value) =>
                      setAccounts((current) => ({
                        ...current,
                        [template.kind]: { ...current[template.kind], enabled: value },
                      }))
                    }
                    trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {setup.enabled ? (
                  <View style={styles.balanceRow}>
                    {currencies.map((code) => (
                      <View key={code} style={styles.balanceField}>
                        <AppText variant="micro" tone="muted">
                          {code} balance
                        </AppText>
                        <TextField
                          value={setup.balances[code] ?? ''}
                          onChangeText={(value) => setBalance(template.kind, code, value)}
                          placeholder="0"
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : null}

      {step === 'reminder' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">A nightly check-in</AppText>
          <AppText tone="muted">
            Recording spending works best as a small daily habit. We can remind you each evening.
          </AppText>
          {USES_CALENDAR_REMINDER ? (
            <CalendarReminderCard
              hour={reminderTime.hour}
              minute={reminderTime.minute}
              added={reminderEnabled}
              onChangeTime={(hour, minute) => setReminderTime({ hour, minute })}
              onAdded={() => setReminderEnabled(true)}
            />
          ) : null}
          {USES_CALENDAR_REMINDER ? null : (
            <Card>
              <View style={styles.reminderRow}>
                <IconBadge icon="notifications" color={theme.colors.primary} size={44} outline />
                <View style={styles.accountText}>
                  <AppText variant="bodyStrong">Daily reminder</AppText>
                  <AppText variant="caption" tone="muted">
                    A single quiet notification, nothing else.
                  </AppText>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={(value) => void toggleReminder(value)}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Card>
          )}
          {reminderEnabled && !USES_CALENDAR_REMINDER ? (
            <TimeField
              hour={reminderTime.hour}
              minute={reminderTime.minute}
              onChange={(hour, minute) => setReminderTime({ hour, minute })}
            />
          ) : null}
          <View
            style={[
              styles.privacyNote,
              {
                backgroundColor: withAlpha(theme.colors.primary, 0.08),
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <Icon name="lock-closed" size={18} color={theme.colors.primary} outline />
            <AppText variant="caption" tone="muted" style={styles.privacyText}>
              Your ledger and receipt photos never leave this phone. There is no sign-up and nothing
              is uploaded.
            </AppText>
          </View>
        </View>
      ) : null}

      {error ? (
        <AppText variant="label" tone="danger" align="center">
          {error}
        </AppText>
      ) : null}

      <View style={styles.footer}>
        {stepIndex > 0 ? (
          <PressableScale
            onPress={back}
            accessibilityRole="button"
            style={styles.backButton}
            hitSlop={8}
          >
            <AppText variant="labelStrong" tone="muted">
              Back
            </AppText>
          </PressableScale>
        ) : (
          <View style={styles.backButton} />
        )}
        {step === 'reminder' ? (
          <Button
            label="Start tracking"
            icon="checkmark"
            onPress={() => void finish()}
            loading={saving}
            size="lg"
            style={styles.nextButton}
          />
        ) : (
          <Button
            label={step === 'welcome' ? 'Get started' : 'Continue'}
            iconRight="arrow-forward"
            onPress={next}
            size="lg"
            style={styles.nextButton}
          />
        )}
      </View>

      <CurrencyPickerSheet
        visible={picker !== null}
        onClose={() => setPicker(null)}
        value={picker === 'primary' ? primary : secondary}
        disabledCodes={picker === 'primary' ? [secondary] : [primary]}
        title={picker === 'primary' ? 'Primary currency' : 'Secondary currency'}
        onSelect={(currency) => {
          if (picker === 'primary') setPrimary(currency.code);
          else setSecondary(currency.code);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepBody: {
    gap: 14,
  },
  heroCard: {
    padding: 24,
    gap: 6,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  features: {
    gap: 14,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  nameBlock: {
    gap: 8,
    marginTop: 8,
  },
  disabledCard: {
    opacity: 0.7,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  balanceField: {
    flex: 1,
    gap: 6,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  privacyText: {
    flex: 1,
  },
  restoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 64,
    paddingVertical: 12,
  },
  nextButton: {
    flex: 1,
  },
});
