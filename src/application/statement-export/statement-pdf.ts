import { amountText, balanceText, type StatementDocument } from './document';
import {
  cleanText,
  isWinAnsiText,
  measureHelvetica,
  type MeasureText,
  type PdfFont,
} from './helvetica';
import {
  buildPdf,
  hexToRgb,
  mixRgb,
  type PdfInfo,
  type PdfLayout,
  type PdfOp,
  type PdfPage,
  type Rgb,
} from './pdf';
import type { StatementTheme } from './theme';

/** A4 in points. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LEFT = MARGIN;
const RIGHT = MARGIN + CONTENT_WIDTH;
/** Rows stop here so the footer keeps its own space. */
const BODY_BOTTOM = PAGE_HEIGHT - MARGIN - 22;

const CELL_PAD = 10;
const DATE_X = LEFT + CELL_PAD;
const DATE_WIDTH = 58;
const DESCRIPTION_X = DATE_X + DATE_WIDTH + 6;
const AMOUNT_WIDTH = 70;
const BALANCE_WIDTH = 88;
const BALANCE_RIGHT = RIGHT - CELL_PAD;
const CREDIT_RIGHT = BALANCE_RIGHT - BALANCE_WIDTH;
const DEBIT_RIGHT = CREDIT_RIGHT - AMOUNT_WIDTH;
const DESCRIPTION_WIDTH = DEBIT_RIGHT - AMOUNT_WIDTH - 8 - DESCRIPTION_X;

const WHITE: Rgb = [1, 1, 1];
const ELLIPSIS = '\u2026';
const SEPARATOR = ' \u00B7 ';

/** Text fitting that works with whichever way of measuring the renderer uses. */
function textTools(measure: MeasureText) {
  const truncate = (text: string, font: PdfFont, size: number, maxWidth: number): string => {
    const clean = cleanText(text);
    if (measure(clean, font, size) <= maxWidth) return clean;
    const chars = Array.from(clean);
    while (chars.length > 1 && measure(`${chars.join('')}${ELLIPSIS}`, font, size) > maxWidth) {
      chars.pop();
    }
    return `${chars.join('').trimEnd()}${ELLIPSIS}`;
  };

  /** Breaks text into lines at spaces; a single over-long word is split. */
  const wrap = (
    text: string,
    font: PdfFont,
    size: number,
    maxWidth: number,
    maxLines: number,
  ): string[] => {
    const fits = (candidate: string) => measure(candidate, font, size) <= maxWidth;
    const lines: string[] = [];
    let current = '';
    for (const word of cleanText(text).split(' ')) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (fits(candidate)) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = word;
      while (!fits(current) && Array.from(current).length > 1) {
        const chars = Array.from(current);
        let count = chars.length - 1;
        while (count > 1 && !fits(chars.slice(0, count).join(''))) count -= 1;
        lines.push(chars.slice(0, count).join(''));
        current = chars.slice(count).join('');
      }
    }
    if (current) lines.push(current);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    const overflow = lines.slice(maxLines - 1).join(' ');
    kept[maxLines - 1] = truncate(`${overflow}${ELLIPSIS}`, font, size, maxWidth);
    return kept;
  };

  /** The largest size, down to a minimum, at which the text fits. */
  const fitSize = (
    text: string,
    font: PdfFont,
    size: number,
    minSize: number,
    maxWidth: number,
  ): number => {
    let fitted = size;
    while (fitted > minSize && measure(text, font, fitted) > maxWidth) fitted -= 0.5;
    return fitted;
  };

  return { truncate, wrap, fitSize };
}

type TableRow = {
  date: string;
  descriptionLines: string[];
  noteLines: string[];
  debit: string;
  credit: string;
  balance: string;
  muted?: boolean;
};

/**
 * Lays a statement out on A4 pages in the app's style: the blue card, summary
 * tiles, a table of entries with a running balance, totals and the balance in
 * words. The result is a list of drawing steps any renderer can follow.
 */
export function layoutStatementPdf(
  document: StatementDocument,
  theme: StatementTheme,
  measure: MeasureText = measureHelvetica,
): PdfLayout {
  const { truncate, wrap, fitSize } = textTools(measure);
  const colors = {
    text: hexToRgb(theme.text),
    muted: hexToRgb(theme.textMuted),
    subtle: hexToRgb(theme.textSubtle),
    border: hexToRgb(theme.border),
    surface: hexToRgb(theme.surfaceMuted),
    primary: hexToRgb(theme.primary),
    income: hexToRgb(theme.income),
    incomeSoft: hexToRgb(theme.incomeSoft),
    expense: hexToRgb(theme.expense),
    expenseSoft: hexToRgb(theme.expenseSoft),
  };
  const heroMuted = mixRgb(WHITE, colors.primary, 0.76);
  const tone =
    document.standing === 'receivable'
      ? colors.income
      : document.standing === 'payable'
        ? colors.expense
        : colors.text;
  const toneSoft =
    document.standing === 'receivable'
      ? colors.incomeSoft
      : document.standing === 'payable'
        ? colors.expenseSoft
        : colors.surface;

  const pages: PdfPage[] = [];
  let ops: PdfOp[] = [];
  let y = MARGIN;

  const text = (
    x: number,
    baseline: number,
    content: string,
    font: PdfFont,
    size: number,
    color: Rgb,
  ) => {
    if (content) ops.push({ kind: 'text', x, y: baseline, text: content, font, size, color });
  };
  const textRight = (
    right: number,
    baseline: number,
    content: string,
    font: PdfFont,
    size: number,
    color: Rgb,
  ) => text(right - measure(content, font, size), baseline, content, font, size, color);
  const hairline = (at: number) =>
    ops.push({
      kind: 'line',
      x1: LEFT,
      y1: at,
      x2: RIGHT,
      y2: at,
      color: colors.border,
      width: 0.5,
    });

  const drawHero = () => {
    const height = 120;
    const pad = 22;
    const sideWidth = 190;
    const mainWidth = CONTENT_WIDTH - pad * 2 - sideWidth - 16;
    ops.push({
      kind: 'hero',
      x: LEFT,
      y,
      width: CONTENT_WIDTH,
      height,
      radius: 18,
      stops: theme.heroGradient.map(hexToRgb),
    });
    text(LEFT + pad, y + 30, document.title.toUpperCase(), 'bold', 8, heroMuted);
    const nameSize = fitSize(cleanText(document.partyName), 'bold', 22, 15, mainWidth);
    text(
      LEFT + pad,
      y + 58,
      truncate(document.partyName, 'bold', nameSize, mainWidth),
      'bold',
      nameSize,
      WHITE,
    );
    text(
      LEFT + pad,
      y + 79,
      truncate(document.periodLabel, 'regular', 10, mainWidth),
      'regular',
      10,
      WHITE,
    );
    text(
      LEFT + pad,
      y + 96,
      truncate(
        `${document.currency}${SEPARATOR}${document.preparedLabel}`,
        'regular',
        9,
        mainWidth,
      ),
      'regular',
      9,
      heroMuted,
    );

    const sideRight = RIGHT - pad;
    textRight(sideRight, y + 30, 'CLOSING BALANCE', 'bold', 8, heroMuted);
    const closing = `${document.currency} ${balanceText(document, document.closingMinor)}`;
    const closingSize = fitSize(closing, 'bold', 20, 11, sideWidth);
    textRight(sideRight, y + 58, closing, 'bold', closingSize, WHITE);
    textRight(
      sideRight,
      y + 79,
      truncate(document.standingLabel, 'regular', 10, sideWidth),
      'regular',
      10,
      WHITE,
    );
    y += height + 12;
  };

  const drawSummary = () => {
    const gap = 10;
    const height = 50;
    const width = (CONTENT_WIDTH - gap * 3) / 4;
    const tiles: { label: string; value: string; color: Rgb }[] = [
      {
        label: 'OPENING BALANCE B/F',
        value: balanceText(document, document.openingMinor),
        color: colors.text,
      },
      {
        label: 'TOTAL DEBITS',
        value: amountText(document, document.totalDebitsMinor),
        color: colors.text,
      },
      {
        label: 'TOTAL CREDITS',
        value: amountText(document, document.totalCreditsMinor),
        color: colors.text,
      },
      {
        label: 'CLOSING BALANCE C/F',
        value: balanceText(document, document.closingMinor),
        color: tone,
      },
    ];
    tiles.forEach((tile, index) => {
      const x = LEFT + index * (width + gap);
      ops.push({ kind: 'rect', x, y, width, height, radius: 10, fill: colors.surface });
      text(x + 12, y + 19, tile.label, 'bold', 7, colors.muted);
      const size = fitSize(tile.value, 'bold', 12, 8, width - 24);
      text(x + 12, y + 37, tile.value, 'bold', size, tile.color);
    });
    y += height + 16;
  };

  const drawTableHeader = () => {
    const height = 24;
    ops.push({
      kind: 'rect',
      x: LEFT,
      y,
      width: CONTENT_WIDTH,
      height,
      radius: 6,
      fill: colors.surface,
    });
    const baseline = y + 15.5;
    text(DATE_X, baseline, 'DATE', 'bold', 7, colors.muted);
    text(DESCRIPTION_X, baseline, 'DESCRIPTION', 'bold', 7, colors.muted);
    textRight(DEBIT_RIGHT, baseline, 'DEBIT', 'bold', 7, colors.muted);
    textRight(CREDIT_RIGHT, baseline, 'CREDIT', 'bold', 7, colors.muted);
    textRight(BALANCE_RIGHT, baseline, 'BALANCE', 'bold', 7, colors.muted);
    y += height;
  };

  const startNextPage = () => {
    pages.push({ ops });
    ops = [];
    y = MARGIN;
    const heading = truncate(
      `${document.title}${SEPARATOR}${document.partyName}${SEPARATOR}${document.currency}`,
      'bold',
      9,
      CONTENT_WIDTH - 70,
    );
    text(LEFT, y + 9, heading, 'bold', 9, colors.text);
    textRight(RIGHT, y + 9, 'continued', 'regular', 9, colors.subtle);
    y += 22;
    drawTableHeader();
  };

  const drawRow = (row: TableRow) => {
    const extraDescription = Math.max(row.descriptionLines.length - 1, 0) * 12;
    const notes = row.noteLines.length ? 11.5 + (row.noteLines.length - 1) * 10.5 : 0;
    const height = 17 + extraDescription + notes + 10;
    if (y + height > BODY_BOTTOM) startNextPage();
    const baseline = y + 17;
    const ink = row.muted ? colors.muted : colors.text;
    text(DATE_X, baseline, row.date, 'regular', 9, colors.muted);
    row.descriptionLines.forEach((line, index) =>
      text(DESCRIPTION_X, baseline + index * 12, line, 'regular', 9.5, ink),
    );
    row.noteLines.forEach((line, index) =>
      text(
        DESCRIPTION_X,
        baseline + extraDescription + 11.5 + index * 10.5,
        line,
        'regular',
        8,
        colors.muted,
      ),
    );
    textRight(DEBIT_RIGHT, baseline, row.debit, 'regular', 9.5, colors.text);
    textRight(CREDIT_RIGHT, baseline, row.credit, 'regular', 9.5, colors.text);
    textRight(BALANCE_RIGHT, baseline, row.balance, 'regular', 9.5, ink);
    y += height;
    hairline(y);
  };

  const drawTotals = () => {
    const needed = 30 + 27 + 16 + 46;
    if (y + needed > BODY_BOTTOM) startNextPage();
    ops.push({
      kind: 'rect',
      x: LEFT,
      y: y + 4,
      width: CONTENT_WIDTH,
      height: 26,
      radius: 6,
      fill: colors.surface,
    });
    text(DESCRIPTION_X, y + 21, 'Totals', 'bold', 9.5, colors.text);
    textRight(
      DEBIT_RIGHT,
      y + 21,
      amountText(document, document.totalDebitsMinor),
      'bold',
      9.5,
      colors.text,
    );
    textRight(
      CREDIT_RIGHT,
      y + 21,
      amountText(document, document.totalCreditsMinor),
      'bold',
      9.5,
      colors.text,
    );
    y += 30;

    text(DESCRIPTION_X, y + 17, 'Closing balance c/f', 'bold', 9.5, colors.text);
    textRight(
      BALANCE_RIGHT,
      y + 17,
      balanceText(document, document.closingMinor),
      'bold',
      9.5,
      tone,
    );
    y += 27;
    hairline(y);
    y += 16;

    ops.push({
      kind: 'rect',
      x: LEFT,
      y,
      width: CONTENT_WIDTH,
      height: 46,
      radius: 10,
      fill: toneSoft,
    });
    const sentence =
      document.standing === 'nil'
        ? document.standingLabel
        : `${document.standingLabel}: ${document.currency} ${amountText(document, document.closingMinor)}`;
    text(LEFT + 14, y + 20, truncate(sentence, 'bold', 11, CONTENT_WIDTH - 28), 'bold', 11, tone);
    text(
      LEFT + 14,
      y + 35,
      'Dr is a receivable from the party. Cr is a payable to the party.',
      'regular',
      8,
      colors.muted,
    );
    y += 46;
  };

  drawHero();
  drawSummary();
  drawTableHeader();
  drawRow({
    date: '',
    descriptionLines: ['Opening balance b/f'],
    noteLines: [],
    debit: '',
    credit: '',
    balance: balanceText(document, document.openingMinor),
    muted: true,
  });
  if (document.rows.length === 0) {
    drawRow({
      date: '',
      descriptionLines: ['No entries in this period.'],
      noteLines: [],
      debit: '',
      credit: '',
      balance: '',
      muted: true,
    });
  }
  for (const row of document.rows) {
    drawRow({
      date: row.dateLabel,
      descriptionLines: wrap(row.description, 'regular', 9.5, DESCRIPTION_WIDTH, 2),
      noteLines: row.note ? wrap(row.note, 'regular', 8, DESCRIPTION_WIDTH, 2) : [],
      debit: row.debitMinor ? amountText(document, row.debitMinor) : '',
      credit: row.creditMinor ? amountText(document, row.creditMinor) : '',
      balance: balanceText(document, row.balanceMinor),
    });
  }
  drawTotals();
  pages.push({ ops });

  pages.forEach((page, index) => {
    ops = page.ops;
    const baseline = PAGE_HEIGHT - MARGIN;
    hairline(baseline - 14);
    text(
      LEFT,
      baseline,
      truncate(
        `${document.appName}${SEPARATOR}${document.preparedLabel}`,
        'regular',
        8,
        CONTENT_WIDTH - 90,
      ),
      'regular',
      8,
      colors.subtle,
    );
    textRight(RIGHT, baseline, `Page ${index + 1} of ${pages.length}`, 'regular', 8, colors.subtle);
  });

  return { width: PAGE_WIDTH, height: PAGE_HEIGHT, pages };
}

/** True when every word of the statement can be drawn with the built-in font. */
export function statementFitsBuiltInFont(document: StatementDocument): boolean {
  return [
    document.partyName,
    document.preparedLabel,
    document.appName,
    ...document.rows.flatMap((row) => [row.description, row.note]),
  ].every(isWinAnsiText);
}

export function statementPdfInfo(document: StatementDocument): PdfInfo {
  return {
    title: `${document.title}: ${document.partyName} (${document.currency})`,
    producer: document.appName,
    created: new Date(`${document.preparedOn}T00:00:00Z`),
  };
}

/** The statement as a PDF with real, selectable text. */
export function buildStatementPdf(document: StatementDocument, theme: StatementTheme): Uint8Array {
  return buildPdf(layoutStatementPdf(document, theme), statementPdfInfo(document));
}
