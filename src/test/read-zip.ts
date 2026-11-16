import { crc32 } from '@/application/file-formats/zip';

/**
 * Reads a stored (uncompressed) zip back through its central directory, the way
 * an unzip tool would, and checks every file's checksum. Test helper only.
 */
export function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  if (view.getUint32(end, true) !== 0x06054b50) throw new Error('No end of central directory');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Bad directory entry');
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const local = view.getUint32(offset + 42, true);
    const name = Buffer.from(bytes.subarray(offset + 46, offset + 46 + nameLength)).toString(
      'utf8',
    );
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error(`Bad header for ${name}`);
    const dataStart =
      local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    if (crc32(data) !== crc) throw new Error(`Checksum mismatch for ${name}`);
    files.set(name, Buffer.from(data).toString('utf8'));
    offset += 46 + nameLength;
  }
  return files;
}
