import { ByteWriter } from './bytes';
import { encodeWinAnsi, type PdfFont } from './helvetica';

/** Red, green and blue, each from 0 to 1. */
export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error(`Invalid colour ${hex}`);
  const channel = (start: number) => Number.parseInt(clean.slice(start, start + 2), 16) / 255;
  return [channel(0), channel(2), channel(4)];
}

/** Blends two colours; `share` is how much of the first one to keep. */
export function mixRgb(first: Rgb, second: Rgb, share: number): Rgb {
  const blend = (a: number, b: number) => a * share + b * (1 - share);
  return [blend(first[0], second[0]), blend(first[1], second[1]), blend(first[2], second[2])];
}

/**
 * One drawing step. Positions are in points from the top-left corner of the
 * page, with y growing downwards; text is placed by its baseline.
 */
export type PdfOp =
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
      fill: Rgb;
    }
  /** The app's blue gradient card with its soft highlight circle. */
  | {
      kind: 'hero';
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      stops: readonly Rgb[];
    }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: Rgb; width: number }
  | { kind: 'text'; x: number; y: number; text: string; font: PdfFont; size: number; color: Rgb };

export type PdfPage = { ops: PdfOp[] };
export type PdfLayout = { width: number; height: number; pages: PdfPage[] };
export type PdfInfo = { title: string; producer: string; created: Date };

const HERO_GLOW_ALPHA = 0.1;

/** Where the highlight circle of a hero card sits; shared by every renderer. */
export function heroGlow(op: Extract<PdfOp, { kind: 'hero' }>) {
  return { cx: op.x + op.width - 40, cy: op.y + 26, radius: 108, alpha: HERO_GLOW_ALPHA };
}

const KAPPA = 0.5523;

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function colour(rgb: Rgb): string {
  return rgb.map((channel) => String(Math.round(channel * 1000) / 1000)).join(' ');
}

/** A PDF literal string in the built-in font's encoding. */
function literal(text: string): string {
  let out = '(';
  for (const byte of encodeWinAnsi(text)) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += `\\${String.fromCharCode(byte)}`;
    else if (byte < 0x20 || byte > 0x7e) out += `\\${byte.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(byte);
  }
  return `${out})`;
}

/** A PDF text string that may hold any script, for the document's properties. */
function unicodeString(text: string): string {
  let hex = 'FEFF';
  for (let index = 0; index < text.length; index += 1) {
    hex += text.charCodeAt(index).toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

function pdfDate(date: Date): string {
  const part = (value: number, length = 2) => String(value).padStart(length, '0');
  return (
    `(D:${part(date.getUTCFullYear(), 4)}${part(date.getUTCMonth() + 1)}${part(date.getUTCDate())}` +
    `${part(date.getUTCHours())}${part(date.getUTCMinutes())}${part(date.getUTCSeconds())}Z)`
  );
}

/** Path for a rectangle with rounded corners, in PDF coordinates (y grows upwards). */
function roundedRectPath(x0: number, y0: number, x1: number, y1: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2));
  if (r === 0) return `${num(x0)} ${num(y0)} ${num(x1 - x0)} ${num(y1 - y0)} re`;
  const k = r * KAPPA;
  return [
    `${num(x0 + r)} ${num(y0)} m`,
    `${num(x1 - r)} ${num(y0)} l`,
    `${num(x1 - r + k)} ${num(y0)} ${num(x1)} ${num(y0 + r - k)} ${num(x1)} ${num(y0 + r)} c`,
    `${num(x1)} ${num(y1 - r)} l`,
    `${num(x1)} ${num(y1 - r + k)} ${num(x1 - r + k)} ${num(y1)} ${num(x1 - r)} ${num(y1)} c`,
    `${num(x0 + r)} ${num(y1)} l`,
    `${num(x0 + r - k)} ${num(y1)} ${num(x0)} ${num(y1 - r + k)} ${num(x0)} ${num(y1 - r)} c`,
    `${num(x0)} ${num(y0 + r)} l`,
    `${num(x0)} ${num(y0 + r - k)} ${num(x0 + r - k)} ${num(y0)} ${num(x0 + r)} ${num(y0)} c`,
    'h',
  ].join('\n');
}

function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA;
  return [
    `${num(cx + r)} ${num(cy)} m`,
    `${num(cx + r)} ${num(cy + k)} ${num(cx + k)} ${num(cy + r)} ${num(cx)} ${num(cy + r)} c`,
    `${num(cx - k)} ${num(cy + r)} ${num(cx - r)} ${num(cy + k)} ${num(cx - r)} ${num(cy)} c`,
    `${num(cx - r)} ${num(cy - k)} ${num(cx - k)} ${num(cy - r)} ${num(cx)} ${num(cy - r)} c`,
    `${num(cx + k)} ${num(cy - r)} ${num(cx + r)} ${num(cy - k)} ${num(cx + r)} ${num(cy)} c`,
    'h',
  ].join('\n');
}

/** A smooth blend through the given colours, as a PDF function. */
function gradientFunction(stops: readonly Rgb[]): string {
  const segment = (from: Rgb, to: Rgb) =>
    `<< /FunctionType 2 /Domain [0 1] /C0 [${colour(from)}] /C1 [${colour(to)}] /N 1 >>`;
  const first = stops[0] ?? [0, 0, 0];
  if (stops.length < 2) return segment(first, first);
  const segments: string[] = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    segments.push(segment(stops[index] ?? first, stops[index + 1] ?? first));
  }
  if (segments.length === 1) return segments[0] ?? '';
  const bounds = segments.slice(1).map((_, index) => num((index + 1) / segments.length));
  return (
    `<< /FunctionType 3 /Domain [0 1] /Functions [${segments.join(' ')}]` +
    ` /Bounds [${bounds.join(' ')}] /Encode [${segments.map(() => '0 1').join(' ')}] >>`
  );
}

/** Assembles numbered objects into a PDF file with its cross-reference table. */
class PdfFile {
  private readonly bodies: (Uint8Array | null)[] = [];

  reserve(): number {
    this.bodies.push(null);
    return this.bodies.length;
  }

  set(id: number, body: string | Uint8Array): void {
    this.bodies[id - 1] =
      typeof body === 'string' ? new ByteWriter().latin1(body).toUint8Array() : body;
  }

  add(body: string | Uint8Array): number {
    const id = this.reserve();
    this.set(id, body);
    return id;
  }

  addStream(dictionary: string, data: Uint8Array): number {
    return this.add(
      new ByteWriter()
        .latin1(`<< ${dictionary} /Length ${data.length} >>\nstream\n`)
        .bytes(data)
        .latin1('\nendstream')
        .toUint8Array(),
    );
  }

  toBytes(catalogId: number, infoId: number): Uint8Array {
    const out = new ByteWriter();
    out.latin1('%PDF-1.4\n').bytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    const offsets: number[] = [];
    this.bodies.forEach((body, index) => {
      if (!body) throw new Error(`PDF object ${index + 1} was never written`);
      offsets.push(out.length);
      out
        .latin1(`${index + 1} 0 obj\n`)
        .bytes(body)
        .latin1('\nendobj\n');
    });
    const xrefOffset = out.length;
    out.latin1(`xref\n0 ${this.bodies.length + 1}\n0000000000 65535 f \n`);
    for (const offset of offsets) out.latin1(`${String(offset).padStart(10, '0')} 00000 n \n`);
    out.latin1(
      `trailer\n<< /Size ${this.bodies.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`,
    );
    return out.toUint8Array();
  }
}

function infoDictionary(info: PdfInfo): string {
  return (
    `<< /Title ${unicodeString(info.title)} /Producer ${unicodeString(info.producer)}` +
    ` /Creator ${unicodeString(info.producer)} /CreationDate ${pdfDate(info.created)} >>`
  );
}

/**
 * Writes a PDF with real text and shapes: sharp at any zoom, small, and with
 * text that can be selected and searched.
 */
export function buildPdf(layout: PdfLayout, info: PdfInfo): Uint8Array {
  const file = new PdfFile();
  const catalogId = file.reserve();
  const pagesId = file.reserve();
  const regularId = file.add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );
  const boldId = file.add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );
  const glowStateId = file.add(`<< /Type /ExtGState /ca ${HERO_GLOW_ALPHA} >>`);
  const infoId = file.add(infoDictionary(info));
  const flip = (y: number) => layout.height - y;

  const pageIds = layout.pages.map((page) => {
    const shadings: { name: string; id: number }[] = [];
    const content: string[] = [];
    for (const op of page.ops) {
      switch (op.kind) {
        case 'rect':
          content.push(
            `${colour(op.fill)} rg`,
            roundedRectPath(
              op.x,
              flip(op.y + op.height),
              op.x + op.width,
              flip(op.y),
              op.radius ?? 0,
            ),
            'f',
          );
          break;
        case 'line':
          content.push(
            `${colour(op.color)} RG`,
            `${num(op.width)} w`,
            `${num(op.x1)} ${num(flip(op.y1))} m`,
            `${num(op.x2)} ${num(flip(op.y2))} l`,
            'S',
          );
          break;
        case 'text':
          content.push(
            'BT',
            `/${op.font === 'bold' ? 'F2' : 'F1'} ${num(op.size)} Tf`,
            `${colour(op.color)} rg`,
            `${num(op.x)} ${num(flip(op.y))} Td`,
            `${literal(op.text)} Tj`,
            'ET',
          );
          break;
        case 'hero': {
          const name = `Sh${shadings.length + 1}`;
          const id = file.add(
            `<< /ShadingType 2 /ColorSpace /DeviceRGB /Extend [true true]` +
              ` /Coords [${num(op.x)} ${num(flip(op.y))} ${num(op.x + op.width)} ${num(flip(op.y + op.height))}]` +
              ` /Function ${gradientFunction(op.stops)} >>`,
          );
          shadings.push({ name, id });
          const glow = heroGlow(op);
          content.push(
            'q',
            roundedRectPath(op.x, flip(op.y + op.height), op.x + op.width, flip(op.y), op.radius),
            'W n',
            `/${name} sh`,
            '/GS1 gs',
            '1 1 1 rg',
            circlePath(glow.cx, flip(glow.cy), glow.radius),
            'f',
            'Q',
          );
          break;
        }
      }
    }
    const contentId = file.addStream(
      '',
      new ByteWriter().latin1(content.join('\n')).toUint8Array(),
    );
    const shadingResources = shadings.length
      ? ` /Shading << ${shadings.map((item) => `/${item.name} ${item.id} 0 R`).join(' ')} >>`
      : '';
    return file.add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(layout.width)} ${num(layout.height)}]` +
        ` /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >>` +
        ` /ExtGState << /GS1 ${glowStateId} 0 R >>${shadingResources} >>` +
        ` /Contents ${contentId} 0 R >>`,
    );
  });

  file.set(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  );
  file.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  return file.toBytes(catalogId, infoId);
}

export type PdfPageImage = { jpeg: Uint8Array; pixelWidth: number; pixelHeight: number };

/**
 * Writes a PDF whose pages are pictures. Used when a statement contains text
 * the built-in font cannot show (Arabic, for example) and the pages were
 * drawn by the device instead.
 */
export function buildImagePdf(
  size: { width: number; height: number },
  images: readonly PdfPageImage[],
  info: PdfInfo,
): Uint8Array {
  const file = new PdfFile();
  const catalogId = file.reserve();
  const pagesId = file.reserve();
  const infoId = file.add(infoDictionary(info));
  const pageIds = images.map((image) => {
    const imageId = file.addStream(
      `/Type /XObject /Subtype /Image /Width ${image.pixelWidth} /Height ${image.pixelHeight}` +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
      image.jpeg,
    );
    const contentId = file.addStream(
      '',
      new ByteWriter()
        .latin1(`q\n${num(size.width)} 0 0 ${num(size.height)} 0 0 cm\n/Im1 Do\nQ`)
        .toUint8Array(),
    );
    return file.add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(size.width)} ${num(size.height)}]` +
        ` /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });
  file.set(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  );
  file.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  return file.toBytes(catalogId, infoId);
}
