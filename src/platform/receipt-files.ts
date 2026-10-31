import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ReceiptFileStore } from '@/application/ports';

const RECEIPTS_FOLDER = 'receipts';

function receiptsDirectory(): Directory {
  const directory = new Directory(Paths.document, RECEIPTS_FOLDER);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/** Keeps receipt images in the app's private documents folder, referenced by file name only. */
export const nativeReceiptFiles: ReceiptFileStore = {
  async persist(sourceUri, fileName) {
    const destination = new File(receiptsDirectory(), fileName);
    await new File(sourceUri).copy(destination, { overwrite: true });
  },
  async remove(fileName) {
    const file = new File(receiptsDirectory(), fileName);
    if (file.exists) file.delete();
  },
  uriFor(fileName) {
    return new File(receiptsDirectory(), fileName).uri;
  },
};

/** The web preview keeps the picked object URL in memory; web is not a release target. */
const webUris = new Map<string, string>();
export const webReceiptFiles: ReceiptFileStore = {
  async persist(sourceUri, fileName) {
    webUris.set(fileName, sourceUri);
  },
  async remove(fileName) {
    webUris.delete(fileName);
  },
  uriFor(fileName) {
    return webUris.get(fileName) ?? '';
  },
};

export const receiptFiles: ReceiptFileStore =
  Platform.OS === 'web' ? webReceiptFiles : nativeReceiptFiles;

/** Removes every stored receipt image (used by "erase all data"). */
export async function removeAllReceiptFiles(): Promise<void> {
  if (Platform.OS === 'web') {
    webUris.clear();
    return;
  }
  const directory = new Directory(Paths.document, RECEIPTS_FOLDER);
  if (directory.exists) directory.delete();
}
