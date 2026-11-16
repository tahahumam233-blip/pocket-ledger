import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { Icon } from './icon';
import { IconBadge } from './icon-badge';
import { PressableScale } from './pressable-scale';

export type ExportOption<T extends string> = {
  id: T;
  icon: string;
  color: string;
  title: string;
  description: string;
};

type ExportSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** One line saying what is being exported, such as "Ali · USD · This month". */
  summary?: string;
  options: readonly ExportOption<T>[];
  /** The choice being prepared, which shows a spinner and disables the rest. */
  busy: string | null;
  onChoose: (id: T) => void;
  /** A quieter extra choice under the main ones. */
  link?: { label: string; onPress: () => void; testID?: string };
};

/** Asks which kind of file to export, with a short description of each. */
export function ExportSheet<T extends string>({
  visible,
  onClose,
  title,
  summary,
  options,
  busy,
  onChoose,
  link,
}: ExportSheetProps<T>) {
  const theme = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} scroll={false}>
      {summary ? (
        <AppText variant="caption" tone="muted" align="center" numberOfLines={2}>
          {summary}
        </AppText>
      ) : null}
      {options.map((option) => (
        <PressableScale
          key={option.id}
          onPress={() => onChoose(option.id)}
          disabled={busy !== null}
          haptic
          accessibilityRole="button"
          accessibilityLabel={`${option.title}. ${option.description}`}
          testID={`export-${option.id}`}
          style={[
            styles.option,
            {
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <IconBadge icon={option.icon} color={option.color} size={46} />
          <View style={styles.optionText}>
            <AppText variant="bodyStrong">{option.title}</AppText>
            <AppText variant="caption" tone="muted">
              {option.description}
            </AppText>
          </View>
          {busy === option.id ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Icon name="chevron-forward" size={18} color={theme.colors.textSubtle} />
          )}
        </PressableScale>
      ))}
      {link ? (
        <PressableScale
          onPress={link.onPress}
          disabled={busy !== null}
          accessibilityRole="button"
          hitSlop={8}
          testID={link.testID}
          style={styles.link}
        >
          <AppText variant="label" tone="primary" align="center">
            {link.label}
          </AppText>
        </PressableScale>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  link: {
    paddingVertical: 8,
  },
});
