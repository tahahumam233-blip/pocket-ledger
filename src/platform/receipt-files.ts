import { Directory, File, Paths } from 'expo-file-system';

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
export const receiptFiles: ReceiptFileStore = {
  async persist(sourceUri, fileName) {
    const destination = new File(receiptsDirectory(), fileName);
    await new File(sourceUri).copy(destination, { overwrite: true });
  },
  async remove(fileName) {
    const file = new File(receiptsDirectory(), fileName);
    if (file.exists) file.delete();
  },
  async resolveUri(fileName) {
    return new File(receiptsDirectory(), fileName).uri;
  },
  async readBase64(fileName) {
    const file = new File(receiptsDirectory(), fileName);
    return file.exists ? file.base64() : null;
  },
  async writeBase64(fileName, base64) {
    const file = new File(receiptsDirectory(), fileName);
    if (file.exists) file.delete();
    file.create();
    await file.write(base64, { encoding: 'base64' });
  },
  async removeAll() {
    const directory = new Directory(Paths.document, RECEIPTS_FOLDER);
    if (directory.exists) directory.delete();
  },
};
