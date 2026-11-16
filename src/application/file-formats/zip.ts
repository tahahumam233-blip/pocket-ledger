import { ByteWriter, utf8 } from './bytes';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as used by zip files. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Uint8Array };

/**
 * Builds a zip archive with every file stored uncompressed. That is all an Excel
 * workbook needs, and it keeps the writer small enough to audit.
 */
export function zipStore(entries: readonly ZipEntry[], modified: Date): Uint8Array {
  const dosTime =
    (modified.getUTCHours() << 11) |
    (modified.getUTCMinutes() << 5) |
    (modified.getUTCSeconds() >> 1);
  const dosDate =
    (Math.max(modified.getUTCFullYear() - 1980, 0) << 9) |
    ((modified.getUTCMonth() + 1) << 5) |
    modified.getUTCDate();
  const UTF8_NAMES = 0x0800;

  const out = new ByteWriter();
  const directory = new ByteWriter();
  for (const entry of entries) {
    const name = utf8(entry.name);
    const crc = crc32(entry.data);
    const offset = out.length;
    out
      .u32(0x04034b50)
      .u16(20)
      .u16(UTF8_NAMES)
      .u16(0)
      .u16(dosTime)
      .u16(dosDate)
      .u32(crc)
      .u32(entry.data.length)
      .u32(entry.data.length)
      .u16(name.length)
      .u16(0)
      .bytes(name)
      .bytes(entry.data);
    directory
      .u32(0x02014b50)
      .u16(20)
      .u16(20)
      .u16(UTF8_NAMES)
      .u16(0)
      .u16(dosTime)
      .u16(dosDate)
      .u32(crc)
      .u32(entry.data.length)
      .u32(entry.data.length)
      .u16(name.length)
      .u16(0)
      .u16(0)
      .u16(0)
      .u16(0)
      .u32(0)
      .u32(offset)
      .bytes(name);
  }
  const directoryOffset = out.length;
  const directoryBytes = directory.toUint8Array();
  out
    .bytes(directoryBytes)
    .u32(0x06054b50)
    .u16(0)
    .u16(0)
    .u16(entries.length)
    .u16(entries.length)
    .u32(directoryBytes.length)
    .u32(directoryOffset)
    .u16(0);
  return out.toUint8Array();
}
