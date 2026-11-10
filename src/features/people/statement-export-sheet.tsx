import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BottomSheet } from '@/components/bottom-sheet';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme } from '@/design';

import type { StatementExportFormat } from './use-statement-export';

type StatementExportSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** What is being exported, such as "Ali · USD · This month". */
  summary: string;
  busy: StatementExportFormat | null;
  onChoose: (format: StatementExportFormat) => void;
};

/** Asks how to export a statement: a PDF to send or print, or an Excel workbook to work on. */
export function StatementExportSheet({
  visible,
  onClose,
  summary,
  busy,
  onChoose,
}: StatementExportSheetProps) {
  const theme = useTheme();

  const option = (
    format: StatementExportFormat,
    icon: string,
    color: string,
    title: string,
    description: string,
  ) => (
    <PressableScale
      onPress={() => onChoose(format)}
      disabled={busy !== null}
      haptic
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      testID={`export-${format}`}
      style={[
        styles.option,
        {
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <IconBadge icon={icon} color={color} size={46} />
      <View style={styles.optionText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      </View>
      {busy === format ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Icon name="chevron-forward" size={18} color={theme.colors.textSubtle} />
      )}
    </PressableScale>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Export statement" scroll={false}>
      <AppText variant="caption" tone="muted" align="center" numberOfLines={1}>
        {summary}
      </AppText>
      {option(
        'pdf',
        'document-text',
        theme.colors.expense,
        'PDF',
        'Ready to send or print. Looks the same on every device.',
      )}
      {option(
        'xlsx',
        'grid',
        theme.colors.income,
        'Excel',
        'Dates and figures you can sort, total and edit.',
      )}
      <PressableScale
        onPress={() => onChoose('text')}
        disabled={busy !== null}
        accessibilityRole="button"
        hitSlop={8}
        testID="export-text"
        style={styles.textLink}
      >
        <AppText variant="label" tone="primary" align="center">
          Send as a text message instead
        </AppText>
      </PressableScale>
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
  textLink: {
    paddingVertical: 8,
  },
});
