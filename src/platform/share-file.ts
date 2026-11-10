import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

const UNIFORM_TYPES: Readonly<Record<string, string>> = {
  'text/csv': 'public.comma-separated-values-text',
  'application/json': 'public.json',
  'application/pdf': 'com.adobe.pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'org.openxmlformats.spreadsheetml.sheet',
};

/**
 * Writes text or bytes to a temporary file and opens the system share sheet.
 * Resolves to false when the person closes the sheet without sharing.
 */
export async function shareFile(
  fileName: string,
  content: string | Uint8Array,
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
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: UNIFORM_TYPES[mimeType] });
  return true;
}

/** Opens the share sheet with plain text, for example a statement for WhatsApp or Mail. */
export async function shareText(title: string, message: string): Promise<boolean> {
  const result = await Share.share({ title, message });
  return result.action === Share.sharedAction;
}
