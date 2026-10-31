import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import brand from '@/config/brand.json';
import { useTheme } from '@/design';

const STEPS = [
  {
    icon: 'share',
    title: 'Tap the Share button',
    copy: 'In Safari it is the square with an arrow. If you do not see it, tap ••• first.',
  },
  {
    icon: 'add-circle',
    title: 'Choose “Add to Home Screen”',
    copy: 'Scroll down the list if needed. Keep “Open as Web App” switched on, then tap Add.',
  },
  {
    icon: 'apps',
    title: 'Open Ledger from your Home Screen',
    copy: 'It opens full screen, works offline and keeps your entries private on this iPhone.',
  },
];

type InstallGuideProps = {
  onContinue: () => void;
};

/** Shown in Safari before setup, because the installed app keeps its own separate storage. */
export function InstallGuide({ onContinue }: InstallGuideProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <LinearGradient
        colors={theme.colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: theme.radii.xxl }]}
      >
        <View style={styles.logo}>
          <Icon name="wallet" size={30} color="#FFFFFF" />
        </View>
        <AppText variant="title" tone="hero">
          Add {brand.name} to your Home Screen
        </AppText>
        <AppText tone="heroMuted">
          Installed, it works like any other app: its own icon, full screen and no browser bars.
        </AppText>
      </LinearGradient>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <View style={styles.step}>
              <IconBadge icon={step.icon} color={theme.colors.primary} size={44} outline />
              <View style={styles.stepText}>
                <AppText variant="micro" tone="primary">
                  Step {index + 1}
                </AppText>
                <AppText variant="bodyStrong">{step.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {step.copy}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View
        style={[
          styles.warning,
          { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radii.lg },
        ]}
      >
        <Icon name="information-circle" size={20} color={theme.colors.warning} />
        <AppText variant="caption" tone="muted" style={styles.stepText}>
          The Home Screen app and this Safari tab keep separate data. Set up and record your
          spending in the installed app so nothing ends up in the wrong place.
        </AppText>
      </View>

      <Button label="Continue in Safari for now" variant="ghost" onPress={onContinue} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 16,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: {
    padding: 22,
    gap: 8,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 4,
  },
  steps: {
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    alignItems: 'flex-start',
  },
});
