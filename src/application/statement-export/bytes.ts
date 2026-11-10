/** Collects bytes for a binary file without knowing its size in advance. */
export class ByteWriter {
  private chunks: Uint8Array[] = [];
  private size = 0;

  /** Bytes written so far, which is also the offset of the next byte. */
  get length(): number {
    return this.size;
  }

  bytes(data: Uint8Array): this {
    this.chunks.push(data);
    this.size += data.length;
    return this;
  }

  /** Writes text whose characters are all below U+0100, one byte each. */
  latin1(text: string): this {
    const data = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      data[index] = text.charCodeAt(index) & 0xff;
    }
    return this.bytes(data);
  }

  u16(value: number): this {
    return this.bytes(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): this {
    return this.bytes(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.size);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

/** Encodes text as UTF-8 without relying on TextEncoder, which some runtimes lack. */
export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}
