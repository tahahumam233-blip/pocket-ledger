import { describe, expect, it } from '@jest/globals';

import { lightColors } from '@/design/tokens';
import { buildStatement, type StatementSourceLine } from '@/domain';

import { utf8 } from './bytes';
import {
  amountDecimal,
  amountText,
  balanceText,
  buildStatementDocument,
  type StatementDocument,
} from './document';
import { encodeWinAnsi, isWinAnsiText, measureHelvetica } from './helvetica';
import { buildImagePdf, type PdfOp } from './pdf';
import {
  buildStatementPdf,
  layoutStatementPdf,
  statementFitsBuiltInFont,
  statementPdfInfo,
} from './statement-pdf';
import { buildStatementXlsx } from './statement-xlsx';
import { buildXlsx, columnLetters, escapeXml, excelDateSerial } from './xlsx';
import { crc32, zipStore } from './zip';

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

/** Reads back a stored zip through its central directory, as any unzip tool would. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const local = view.getUint32(offset + 42, true);
    const name = Buffer.from(bytes.subarray(offset + 46, offset + 46 + nameLength)).toString(
      'utf8',
    );
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const dataStart =
      local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, Buffer.from(data).toString('utf8'));
    offset += 46 + nameLength;
  }
  return files;
}

/** Checks the cross-reference table: every object must start where the table says. */
function expectValidPdf(bytes: Uint8Array): string {
  const text = latin1(bytes);
  expect(text.startsWith('%PDF-1.4\n')).toBe(true);
  expect(text.endsWith('%%EOF\n')).toBe(true);
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)?.[1]);
  expect(text.slice(startxref, startxref + 5)).toBe('xref\n');
  const size = Number(/^xref\n0 (\d+)\n/.exec(text.slice(startxref))?.[1]);
  const table = text.slice(text.indexOf('\n', startxref + 5) + 1);
  for (let object = 1; object < size; object += 1) {
    const entry = table.slice(object * 20, object * 20 + 20);
    expect(entry).toMatch(/^\d{10} 00000 n \n$/);
    const offset = Number(entry.slice(0, 10));
    expect(text.slice(offset, offset + `${object} 0 obj\n`.length)).toBe(`${object} 0 obj\n`);
  }
  expect(text).toContain(`/Size ${size} `);
  return text;
}

const line = (
  overrides: Partial<StatementSourceLine> & Pick<StatementSourceLine, 'postedDate' | 'amountMinor'>,
): StatementSourceLine => ({
  transactionId: `t-${overrides.postedDate}-${overrides.amountMinor}`,
  createdAt: `${overrides.postedDate}T10:00:00.000Z`,
  kind: 'transfer',
  debtAction: null,
  note: '',
  categoryName: null,
  counterAccountName: null,
  ...overrides,
});

const LINES: StatementSourceLine[] = [
  line({ postedDate: '2026-09-20', amountMinor: 5000, kind: 'opening' }),
  line({
    postedDate: '2026-10-02',
    amountMinor: 10000,
    debtAction: 'lend',
    counterAccountName: 'Pocket',
    note: 'Rent help',
  }),
  line({
    postedDate: '2026-10-10',
    amountMinor: -4000,
    debtAction: 'collect',
    counterAccountName: 'Bank',
  }),
  line({
    postedDate: '2026-10-15',
    amountMinor: -2500,
    kind: 'expense',
    categoryName: 'Food & Drink',
  }),
];

const october = (partyName = 'Ali', preparedBy = 'Taha'): StatementDocument =>
  buildStatementDocument(buildStatement(LINES, 'USD', { from: '2026-10-01', to: '2026-10-31' }), {
    partyName,
    today: '2026-11-10',
    appName: 'Pocket Ledger',
    preparedBy,
  });

const manyRows = (count: number): StatementDocument =>
  buildStatementDocument(
    buildStatement(
      Array.from({ length: count }, (_, index) =>
        line({
          postedDate: `2026-${String(1 + Math.floor(index / 28)).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
          amountMinor: index % 3 === 0 ? -(1500 + index) : 2000 + index,
          debtAction: index % 3 === 0 ? 'borrow' : 'repay',
          counterAccountName: 'Bank',
          note:
            index % 4 === 0 ? 'A note long enough to need a second line under the description' : '',
        }),
      ),
      'USD',
    ),
    { partyName: 'Sara', today: '2026-11-10', appName: 'Pocket Ledger' },
  );

describe('zip container', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(utf8('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('stores files that read back byte for byte', () => {
    const archive = zipStore(
      [
        { name: 'a.txt', data: utf8('hello') },
        { name: 'folder/ب.xml', data: utf8('<x>ünï</x>') },
      ],
      new Date('2026-11-10T12:30:40Z'),
    );
    expect(latin1(archive.subarray(0, 2))).toBe('PK');
    const files = unzip(archive);
    expect([...files.keys()]).toEqual(['a.txt', 'folder/ب.xml']);
    expect(files.get('folder/ب.xml')).toBe('<x>ünï</x>');
  });
});

describe('workbook writer', () => {
  it('names columns, converts dates and escapes text safely', () => {
    expect(columnLetters(0)).toBe('A');
    expect(columnLetters(25)).toBe('Z');
    expect(columnLetters(26)).toBe('AA');
    expect(excelDateSerial('2026-10-12')).toBe(46307);
    expect(excelDateSerial('1900-03-01')).toBe(61);
    expect(escapeXml('Food & <Drink> "x"\u0001')).toBe('Food &amp; &lt;Drink&gt; &quot;x&quot;');
  });

  it('refuses numbers that are not exact decimals', () => {
    const build = (value: string) =>
      buildXlsx(
        { name: 'S', columnWidths: [10], rows: [{ cells: [{ type: 'number', value }] }] },
        { created: new Date('2026-01-01T00:00:00Z') },
      );
    expect(() => build('1e5')).toThrow('Invalid number');
    expect(() => build('12.5.0')).toThrow('Invalid number');
    expect(unzip(build('1250.50')).get('xl/worksheets/sheet1.xml')).toContain('<v>1250.50</v>');
  });
});

describe('statement document', () => {
  it('carries the same figures as the statement, with document labels', () => {
    const document = october();
    expect(document.partyName).toBe('Ali');
    expect(document.periodLabel).toBe('1 Oct 2026 to 31 Oct 2026');
    expect(document.preparedLabel).toBe('Prepared 10 Nov 2026 by Taha');
    expect(document.openingMinor).toBe(5000);
    expect(document.totalDebitsMinor).toBe(10000);
    expect(document.totalCreditsMinor).toBe(6500);
    expect(document.closingMinor).toBe(8500);
    expect(document.openingMinor + document.totalDebitsMinor - document.totalCreditsMinor).toBe(
      document.closingMinor,
    );
    expect(document.standing).toBe('receivable');
    expect(document.standingLabel).toBe('Receivable from Ali');
    expect(document.rows.map((row) => row.dateLabel)).toEqual([
      '2 Oct 2026',
      '10 Oct 2026',
      '15 Oct 2026',
    ]);
    expect(document.rows[0]).toMatchObject({
      description: 'Loan given from Pocket',
      note: 'Rent help',
      debitMinor: 10000,
      creditMinor: 0,
      balanceMinor: 15000,
    });
    expect(document.fileBaseName).toBe('Statement-Ali-USD-2026-10-01_to_2026-10-31');
    expect(amountText(document, -125050)).toBe('1,250.50');
    expect(balanceText(document, 8500)).toBe('85.00 Dr');
    expect(balanceText(document, -8500)).toBe('85.00 Cr');
    expect(balanceText(document, 0)).toBe('0.00');
    expect(amountDecimal(document, -125050)).toBe('1250.50');
  });

  it('describes open-ended periods and payable or nil balances', () => {
    const build = (range: { from?: string; to?: string }, lines = LINES) =>
      buildStatementDocument(buildStatement(lines, 'USD', range), {
        partyName: '  ',
        today: '2026-11-10',
        appName: 'Pocket Ledger',
      });
    expect(build({}).periodLabel).toBe('All entries up to 10 Nov 2026');
    expect(build({ from: '2026-10-01' }).periodLabel).toBe('From 1 Oct 2026');
    expect(build({ to: '2026-10-31' }).periodLabel).toBe('Up to 31 Oct 2026');
    expect(build({}).preparedLabel).toBe('Prepared 10 Nov 2026');
    expect(build({}).partyName).toBe('Party');
    expect(build({}).fileBaseName).toBe('Statement-Party-USD-2026-11-10');

    const payable = build({}, [line({ postedDate: '2026-10-05', amountMinor: -4000 })]);
    expect(payable.standing).toBe('payable');
    expect(payable.standingLabel).toBe('Payable to Party');
    expect(build({}, []).standing).toBe('nil');
  });

  it('keeps names in any script readable in the file name', () => {
    expect(october('علي حسن').fileBaseName).toBe('Statement-علي-حسن-USD-2026-10-01_to_2026-10-31');
    expect(october('A/B: "C"').fileBaseName).toBe('Statement-A-B-C-USD-2026-10-01_to_2026-10-31');
  });
});

describe('statement workbook', () => {
  it('writes real dates and exact numbers with totals as formulas', () => {
    const files = unzip(buildStatementXlsx(october(), lightColors));
    expect([...files.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/sharedStrings.xml',
      'xl/worksheets/sheet1.xml',
    ]);
    const sheet = files.get('xl/worksheets/sheet1.xml') ?? '';
    const strings = files.get('xl/sharedStrings.xml') ?? '';
    for (const expected of [
      'Statement of account',
      'Ali',
      '1 Oct 2026 to 31 Oct 2026',
      'USD 85.00 Dr  (Receivable from Ali)',
      'Opening balance b/f',
      'Loan given from Pocket',
      'Rent help',
      'Expense paid on your behalf: Food &amp; Drink',
      'Closing balance c/f',
      'Receivable from Ali: USD 85.00',
    ]) {
      expect(strings).toContain(`>${expected}</t>`);
    }
    // 2 Oct 2026 as an Excel date, then the debit and the running balance.
    expect(sheet).toMatch(/<c r="A11" s="\d+"><v>46297<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="D11" s="\d+"><v>100\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="F11" s="\d+"><v>150\.00<\/v><\/c>/);
    // An entry with no debit leaves the cell empty rather than zero.
    expect(sheet).toMatch(/<c r="D12" s="\d+"\/>/);
    expect(sheet).toMatch(/<c r="E12" s="\d+"><v>40\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="D14" s="\d+"><f>SUM\(D11:D13\)<\/f><v>100\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="E14" s="\d+"><f>SUM\(E11:E13\)<\/f><v>65\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="F15" s="\d+"><v>85\.00<\/v><\/c>/);
    expect(sheet).toContain('<pane ySplit="9" topLeftCell="A10"');
    expect(files.get('xl/workbook.xml')).toContain("'Statement'!$9:$9");
    const styles = files.get('xl/styles.xml') ?? '';
    expect(styles).toContain('formatCode="#,##0.00"');
    expect(styles).toContain('formatCode="d mmm yyyy"');
    expect(styles).toContain(`<fgColor rgb="FF${lightColors.primary.slice(1)}"/>`);
  });

  it('follows the currency for decimals and leaves out formulas when there are no entries', () => {
    const empty = buildStatementDocument(buildStatement([], 'IQD'), {
      partyName: 'Omar',
      today: '2026-11-10',
      appName: 'Pocket Ledger',
    });
    const files = unzip(buildStatementXlsx(empty, lightColors));
    expect(files.get('xl/styles.xml')).toContain('formatCode="#,##0"');
    expect(files.get('xl/styles.xml')).not.toContain('#,##0.00');
    expect(files.get('xl/worksheets/sheet1.xml')).not.toContain('<f>');
    expect(files.get('xl/sharedStrings.xml')).toContain('>Nil balance with Omar</t>');
  });
});

describe('built-in font', () => {
  it('knows which text it can draw', () => {
    expect(isWinAnsiText('José & Søren – “quoted”… €5')).toBe(true);
    expect(isWinAnsiText('1,450,000\u202FIQD')).toBe(true);
    expect(isWinAnsiText('علي')).toBe(false);
    expect(isWinAnsiText('日本')).toBe(false);
    expect(encodeWinAnsi('€–é')).toEqual([0x80, 0x96, 0xe9]);
    expect(encodeWinAnsi('a\n b\tc')).toEqual([0x61, 0x20, 0x62, 0x20, 0x63]);
    expect(encodeWinAnsi('ع')).toEqual([0x3f]);
  });

  it('measures with the published Helvetica widths', () => {
    expect(measureHelvetica('0', 'regular', 10)).toBeCloseTo(5.56);
    expect(measureHelvetica('1,250.50', 'regular', 10)).toBeCloseTo(38.92);
    // T 611 + o 611 + t 333 + a 556 + l 278 + s 556 = 2945 units.
    expect(measureHelvetica('Totals', 'bold', 10)).toBeCloseTo(29.45);
  });
});

describe('statement PDF', () => {
  it('is a well-formed one-page PDF with the statement as real text', () => {
    const text = expectValidPdf(buildStatementPdf(october(), lightColors));
    expect(text).toContain('/Count 1 ');
    expect(text).toContain('/BaseFont /Helvetica-Bold');
    expect(text).toContain('/ShadingType 2');
    for (const expected of [
      '(STATEMENT OF ACCOUNT) Tj',
      '(Ali) Tj',
      '(1 Oct 2026 to 31 Oct 2026) Tj',
      '(USD 85.00 Dr) Tj',
      '(Receivable from Ali) Tj',
      '(Opening balance b/f) Tj',
      '(2 Oct 2026) Tj',
      '(Loan given from Pocket) Tj',
      '(Rent help) Tj',
      '(100.00) Tj',
      '(150.00 Dr) Tj',
      '(Totals) Tj',
      '(Closing balance c/f) Tj',
      '(Receivable from Ali: USD 85.00) Tj',
      '(Page 1 of 1) Tj',
    ]) {
      expect(text).toContain(expected);
    }
    // The separator dot is outside ASCII and must be written as an octal escape.
    expect(text).toContain('(USD \\267 Prepared 10 Nov 2026 by Taha) Tj');
  });

  it('escapes PDF syntax characters in names', () => {
    const text = expectValidPdf(buildStatementPdf(october('A (B) \\ C'), lightColors));
    expect(text).toContain('(A \\(B\\) \\\\ C) Tj');
  });

  it('flows long statements over several pages and repeats the table heading', () => {
    const document = manyRows(90);
    const layout = layoutStatementPdf(document, lightColors);
    expect(layout.pages.length).toBeGreaterThan(2);
    const texts = (ops: PdfOp[]) => ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []));
    layout.pages.forEach((page, index) => {
      expect(texts(page.ops)).toContain('DATE');
      expect(texts(page.ops)).toContain(`Page ${index + 1} of ${layout.pages.length}`);
      expect(texts(page.ops).includes('continued')).toBe(index > 0);
    });
    const all = layout.pages.flatMap((page) => texts(page.ops));
    expect(all.filter((text) => text === 'Totals')).toHaveLength(1);
    expect(all.filter((text) => text === 'Closing balance c/f')).toHaveLength(1);
    // Every entry appears exactly once.
    expect(all.filter((text) => /^\d{1,2} \w{3} 2026$/.test(text))).toHaveLength(90);

    const pdf = expectValidPdf(buildStatementPdf(document, lightColors));
    expect(pdf).toContain(`/Count ${layout.pages.length} `);
  });

  it('keeps everything inside the page and figures right-aligned in their columns', () => {
    const document = buildStatementDocument(
      buildStatement(
        [
          line({
            postedDate: '2026-10-02',
            amountMinor: 123456789,
            debtAction: 'lend',
            counterAccountName:
              'An account with an extraordinarily long name that cannot possibly fit on one line of the table',
            note: 'Supercalifragilisticexpialidocious-and-then-some-more-without-any-spaces-at-all-to-break-on',
          }),
          line({ postedDate: '2026-10-03', amountMinor: -5, debtAction: 'collect' }),
        ],
        'USD',
      ),
      {
        partyName: 'A party whose name is far too long to fit in the header card at any size',
        today: '2026-11-10',
        appName: 'Pocket Ledger',
      },
    );
    const layout = layoutStatementPdf(document, lightColors);
    const ops = layout.pages.flatMap((page) => page.ops);
    const textOps = ops.flatMap((op) => (op.kind === 'text' ? [op] : []));
    const right = (op: (typeof textOps)[number]) =>
      op.x + measureHelvetica(op.text, op.font, op.size);
    const header = (label: string) => {
      const op = textOps.find((item) => item.text === label);
      if (!op) throw new Error(`missing ${label}`);
      return op;
    };

    for (const op of textOps) {
      expect(op.x).toBeGreaterThanOrEqual(40);
      expect(right(op)).toBeLessThanOrEqual(layout.width - 40 + 0.01);
      expect(op.y).toBeLessThanOrEqual(layout.height - 40 + 0.01);
    }
    // Descriptions and notes wrap or shorten before they reach the Debit column.
    const descriptionX = header('DESCRIPTION').x;
    const debitRight = right(header('DEBIT'));
    const inDescription = textOps.filter((op) => op.x === descriptionX && op.size < 10);
    expect(inDescription.length).toBeGreaterThanOrEqual(6);
    for (const op of inDescription) expect(right(op)).toBeLessThanOrEqual(debitRight - 70);
    expect(inDescription.some((op) => op.text.endsWith('\u2026'))).toBe(true);
    // Amounts in the table rows end exactly at their column's right edge.
    const inRow = (label: string) => {
      const op = textOps.find(
        (item) => item.text === label && item.font === 'regular' && item.size === 9.5,
      );
      if (!op) throw new Error(`missing row figure ${label}`);
      return op;
    };
    expect(right(inRow('1,234,567.89'))).toBeCloseTo(debitRight);
    expect(right(inRow('0.05'))).toBeCloseTo(right(header('CREDIT')));
    expect(right(inRow('1,234,567.89 Dr'))).toBeCloseTo(right(header('BALANCE')));
  });

  it('says when a statement needs the device to draw it, and degrades to "?" without one', () => {
    expect(statementFitsBuiltInFont(october())).toBe(true);
    expect(statementFitsBuiltInFont(october('علي'))).toBe(false);
    expect(statementFitsBuiltInFont(october('Ali', 'طه'))).toBe(false);
    const text = expectValidPdf(buildStatementPdf(october('علي'), lightColors));
    expect(text).toContain('(???) Tj');
  });

  it('wraps drawn pages as pictures in a well-formed PDF', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const document = october('علي');
    const text = expectValidPdf(
      buildImagePdf(
        { width: 595.28, height: 841.89 },
        [
          { jpeg, pixelWidth: 1786, pixelHeight: 2526 },
          { jpeg, pixelWidth: 1786, pixelHeight: 2526 },
        ],
        statementPdfInfo(document),
      ),
    );
    expect(text).toContain('/Count 2 ');
    expect(text).toContain('/Filter /DCTDecode /Length 9 ');
    expect(text).toContain('/Width 1786 /Height 2526');
    expect(text).toContain(`stream\n${latin1(jpeg)}\nendstream`);
    // The title is stored as Unicode so an Arabic name survives in the file's properties.
    expect(text).toContain('/Title <FEFF0053');
    expect(text).toContain('0639064406CA'.slice(0, 8));
  });
});
