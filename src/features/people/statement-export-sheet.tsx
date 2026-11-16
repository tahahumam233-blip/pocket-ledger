import { ExportSheet } from '@/components/export-sheet';
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
  return (
    <ExportSheet<'pdf' | 'xlsx'>
      visible={visible}
      onClose={onClose}
      title="Export statement"
      summary={summary}
      busy={busy}
      onChoose={onChoose}
      options={[
        {
          id: 'pdf',
          icon: 'document-text',
          color: theme.colors.expense,
          title: 'PDF',
          description: 'Ready to send or print. Looks the same on every device.',
        },
        {
          id: 'xlsx',
          icon: 'grid',
          color: theme.colors.income,
          title: 'Excel',
          description: 'Dates and figures you can sort, total and edit.',
        },
      ]}
      link={{
        label: 'Send as a text message instead',
        onPress: () => onChoose('text'),
        testID: 'export-text',
      }}
    />
  );
}
