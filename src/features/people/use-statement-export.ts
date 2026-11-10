import { useCallback, useState } from 'react';

import {
  buildImagePdf,
  buildStatementDocument,
  buildStatementPdf,
  buildStatementXlsx,
  layoutStatementPdf,
  type StatementDocument,
  statementFitsBuiltInFont,
  statementPdfInfo,
  type StatementTheme,
} from '@/application/statement-export';
import brand from '@/config/brand.json';
import { lightColors } from '@/design';
import { type IsoDate, type Statement, statementToText, todayIsoDate } from '@/domain';
import { haptics } from '@/platform/haptics';
import { getPdfRasterizer } from '@/platform/pdf-raster';
import { shareFile, shareText } from '@/platform/share-file';
import { showToast } from '@/state/toast-store';

export type StatementExportFormat = 'pdf' | 'xlsx' | 'text';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Files are always drawn with the light palette: they are read on white paper. */
const FILE_THEME: StatementTheme = lightColors;

/**
 * The statement as a PDF. Text the PDF's built-in font can show is written as
 * real text; a statement with other scripts (an Arabic name, for example) is
 * drawn by the device as pictures of the same pages.
 */
async function buildPdfBytes(document: StatementDocument): Promise<Uint8Array> {
  if (statementFitsBuiltInFont(document)) return buildStatementPdf(document, FILE_THEME);
  const rasterizer = getPdfRasterizer();
  if (!rasterizer) return buildStatementPdf(document, FILE_THEME);
  const layout = layoutStatementPdf(document, FILE_THEME, rasterizer.measure);
  const images = await rasterizer.render(layout);
  return buildImagePdf(layout, images, statementPdfInfo(document));
}

type StatementExportInput = {
  statement: Statement | null | undefined;
  partyName: string;
  today: IsoDate;
  /** The ledger owner's name, shown as who prepared the statement. */
  preparedBy: string;
  onShared?: () => void;
};

/** Builds a party's statement as a PDF, an Excel workbook or plain text and shares it. */
export function useStatementExport({
  statement,
  partyName,
  today,
  preparedBy,
  onShared,
}: StatementExportInput) {
  const [busy, setBusy] = useState<StatementExportFormat | null>(null);

  const exportAs = useCallback(
    async (format: StatementExportFormat) => {
      if (!statement || busy) return;
      const preparedOn = today || todayIsoDate();
      setBusy(format);
      try {
        let shared: boolean;
        if (format === 'text') {
          shared = await shareText(
            `Statement of account: ${partyName}`,
            statementToText(statement, partyName, { appName: brand.name, today: preparedOn }),
          );
        } else {
          const document = buildStatementDocument(statement, {
            partyName,
            today: preparedOn,
            preparedBy,
            appName: brand.name,
          });
          shared =
            format === 'pdf'
              ? await shareFile(
                  `${document.fileBaseName}.pdf`,
                  await buildPdfBytes(document),
                  'application/pdf',
                  'Statement',
                )
              : await shareFile(
                  `${document.fileBaseName}.xlsx`,
                  buildStatementXlsx(document, FILE_THEME),
                  XLSX_TYPE,
                  'Statement',
                );
        }
        if (shared) {
          haptics.success();
          showToast('Statement ready to send.', { tone: 'success' });
          onShared?.();
        }
      } catch (caught) {
        haptics.error();
        showToast(caught instanceof Error ? caught.message : 'Could not export the statement.', {
          tone: 'danger',
        });
      } finally {
        setBusy(null);
      }
    },
    [statement, busy, partyName, today, preparedBy, onShared],
  );

  return { busy, exportAs };
}
