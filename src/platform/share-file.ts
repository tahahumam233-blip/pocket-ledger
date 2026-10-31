import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Writes text to a temporary file and opens the system share sheet.
 * Resolves to false when the person closes the sheet without sharing.
 */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle = 'Share',
): Promise<boolean> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle,
    UTI:
      mimeType === 'text/csv'
        ? 'public.comma-separated-values-text'
        : mimeType === 'application/json'
          ? 'public.json'
          : undefined,
  });
  return true;
}
