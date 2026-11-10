/**
 * Helvetica is one of the fonts every PDF viewer provides, so statements use it
 * without embedding a font file. These are its published advance widths (per
 * 1000 units) for the WinAnsi characters 32 to 255, needed to right-align
 * figures and to fit text into its column.
 */
const REGULAR_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  350, 556, 350, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350, 350, 222,
  222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 350, 500, 667, 278, 333, 556, 556, 556,
  556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278,
  333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667,
  667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667,
  667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556,
  556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];

const BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
  350, 556, 350, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350, 350, 278,
  278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 350, 500, 667, 278, 333, 556, 556, 556,
  556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278,
  333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667,
  667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667,
  667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611,
  611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];

/** WinAnsi places these characters in the 0x80 to 0x9F range instead of Latin-1 controls. */
const WIN_ANSI_SPECIALS: Readonly<Record<number, number>> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const FALLBACK_BYTE = 0x3f; // "?"

export type PdfFont = 'regular' | 'bold';

/** Measures text in points. Injected so a canvas can measure when it draws instead. */
export type MeasureText = (text: string, font: PdfFont, size: number) => number;

/** Turns every kind of space and line break into a plain space, so text stays on one line. */
export function cleanText(text: string): string {
  return text.replace(/[\s\u00A0\u2007\u202F]+/g, ' ').trim();
}

/** The WinAnsi byte for a character, or null when Helvetica cannot show it. */
function winAnsiByte(codePoint: number): number | null {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return codePoint;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return codePoint;
  return WIN_ANSI_SPECIALS[codePoint] ?? null;
}

/** True when every character can be drawn with the built-in font. */
export function isWinAnsiText(text: string): boolean {
  for (const char of cleanText(text)) {
    if (winAnsiByte(char.codePointAt(0) ?? 0) === null) return false;
  }
  return true;
}

/** Encodes text for the built-in font; characters it lacks become "?". */
export function encodeWinAnsi(text: string): number[] {
  const bytes: number[] = [];
  for (const char of cleanText(text)) {
    bytes.push(winAnsiByte(char.codePointAt(0) ?? 0) ?? FALLBACK_BYTE);
  }
  return bytes;
}

export const measureHelvetica: MeasureText = (text, font, size) => {
  const widths = font === 'bold' ? BOLD_WIDTHS : REGULAR_WIDTHS;
  let total = 0;
  for (const byte of encodeWinAnsi(text)) total += widths[byte - 32] ?? 556;
  return (total * size) / 1000;
};
