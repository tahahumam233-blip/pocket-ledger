import { utf8 } from './bytes';
import { zipStore } from './zip';

export type XlsxStyle = {
  bold?: boolean;
  /** Font size in points; 10 when omitted. */
  size?: number;
  /** Text colour as #RRGGBB. */
  color?: string;
  /** Solid fill as #RRGGBB. */
  fill?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  /** Excel number format such as "#,##0.00" or "dd mmm yyyy". */
  format?: string;
  /** Thin border in the given #RRGGBB colour. */
  borderTop?: string;
  borderBottom?: string;
};

export type XlsxCell =
  | { type: 'text'; value: string; style?: XlsxStyle }
  /** `value` is an exact decimal such as "1250.50", never a binary float. */
  | { type: 'number'; value: string; formula?: string; style?: XlsxStyle }
  /** `value` is a YYYY-MM-DD date, stored as a real Excel date. */
  | { type: 'date'; value: string; style?: XlsxStyle }
  | { type: 'blank'; style: XlsxStyle }
  | null;

export type XlsxRow = { height?: number; cells: XlsxCell[] };

export type XlsxSheet = {
  name: string;
  /** Column widths in characters. */
  columnWidths: number[];
  rows: XlsxRow[];
  /** Rows kept in view while scrolling, counted from the top. */
  freezeRows?: number;
  /** The row repeated at the top of every printed page (1-based). */
  printTitleRow?: number;
};

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const FONT_NAME = 'Arial';
const DEFAULT_SIZE = 10;
const FIRST_CUSTOM_FORMAT = 164;

/** Escapes text for XML and drops control characters XML 1.0 does not allow. */
export function escapeXml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function argb(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) throw new Error(`Invalid colour ${hex}`);
  return `FF${clean}`;
}

/** Column letters for a zero-based index: 0 is A, 26 is AA. */
export function columnLetters(index: number): string {
  let letters = '';
  let rest = index + 1;
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    letters = String.fromCharCode(65 + digit) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return letters;
}

/** The Excel serial number of a calendar date (days since 30 December 1899). */
export function excelDateSerial(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid date ${isoDate}`);
  const days = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
  return Math.round(days) + 25_569;
}

/** Collects distinct values and hands back each one's position. */
class Registry {
  private readonly indexByKey = new Map<string, number>();
  readonly items: string[] = [];

  constructor(initial: readonly string[] = []) {
    for (const item of initial) this.add(item);
  }

  add(xml: string): number {
    const known = this.indexByKey.get(xml);
    if (known !== undefined) return known;
    const index = this.items.length;
    this.items.push(xml);
    this.indexByKey.set(xml, index);
    return index;
  }
}

class StyleBook {
  private readonly fonts = new Registry([fontXml({})]);
  // Excel reserves the first two fills.
  private readonly fills = new Registry([
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ]);
  private readonly borders = new Registry([borderXml({})]);
  private readonly formats = new Registry();
  private readonly xfs = new Registry([
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  ]);

  styleIndex(style: XlsxStyle | undefined): number {
    if (!style) return 0;
    const fontId = this.fonts.add(fontXml(style));
    const fillId = style.fill
      ? this.fills.add(
          `<fill><patternFill patternType="solid"><fgColor rgb="${argb(style.fill)}"/><bgColor indexed="64"/></patternFill></fill>`,
        )
      : 0;
    const borderId = this.borders.add(borderXml(style));
    const numFmtId = style.format
      ? FIRST_CUSTOM_FORMAT + this.formats.add(`formatCode="${escapeXml(style.format)}"`)
      : 0;
    const alignment =
      `<alignment${style.align ? ` horizontal="${style.align}"` : ''} vertical="center"` +
      `${style.wrap ? ' wrapText="1"' : ''}/>`;
    return this.xfs.add(
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
        ` applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignment}</xf>`,
    );
  }

  toXml(): string {
    const numFmts = this.formats.items.length
      ? `<numFmts count="${this.formats.items.length}">${this.formats.items
          .map((item, index) => `<numFmt numFmtId="${FIRST_CUSTOM_FORMAT + index}" ${item}/>`)
          .join('')}</numFmts>`
      : '';
    const group = (tag: string, registry: Registry) =>
      `<${tag} count="${registry.items.length}">${registry.items.join('')}</${tag}>`;
    return (
      `${XML_HEADER}<styleSheet xmlns="${MAIN_NS}">${numFmts}` +
      group('fonts', this.fonts) +
      group('fills', this.fills) +
      group('borders', this.borders) +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      group('cellXfs', this.xfs) +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>'
    );
  }
}

function fontXml(style: XlsxStyle): string {
  return (
    `<font>${style.bold ? '<b/>' : ''}<sz val="${style.size ?? DEFAULT_SIZE}"/>` +
    `${style.color ? `<color rgb="${argb(style.color)}"/>` : ''}` +
    `<name val="${FONT_NAME}"/><family val="2"/></font>`
  );
}

function borderXml(style: XlsxStyle): string {
  const edge = (tag: string, color: string | undefined) =>
    color ? `<${tag} style="thin"><color rgb="${argb(color)}"/></${tag}>` : `<${tag}/>`;
  return `<border><left/><right/>${edge('top', style.borderTop)}${edge('bottom', style.borderBottom)}<diagonal/></border>`;
}

/**
 * Writes a single-sheet Excel workbook (.xlsx): styled cells, real numbers and
 * dates, optional formulas with their values, frozen rows and print settings.
 */
export function buildXlsx(sheet: XlsxSheet, options: { created: Date }): Uint8Array {
  const styles = new StyleBook();
  const strings = new Registry();
  let stringCount = 0;

  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cells = row.cells
        .map((cell, columnIndex) => {
          if (!cell) return '';
          const ref = `${columnLetters(columnIndex)}${rowIndex + 1}`;
          const style = styles.styleIndex(cell.style);
          const attributes = `r="${ref}"${style ? ` s="${style}"` : ''}`;
          switch (cell.type) {
            case 'text': {
              stringCount += 1;
              const index = strings.add(
                `<si><t xml:space="preserve">${escapeXml(cell.value)}</t></si>`,
              );
              return `<c ${attributes} t="s"><v>${index}</v></c>`;
            }
            case 'number': {
              if (!/^-?\d+(\.\d+)?$/.test(cell.value)) {
                throw new Error(`Invalid number ${cell.value}`);
              }
              const formula = cell.formula ? `<f>${escapeXml(cell.formula)}</f>` : '';
              return `<c ${attributes}>${formula}<v>${cell.value}</v></c>`;
            }
            case 'date':
              return `<c ${attributes}><v>${excelDateSerial(cell.value)}</v></c>`;
            case 'blank':
              return `<c ${attributes}/>`;
          }
        })
        .join('');
      const height = row.height ? ` ht="${row.height}" customHeight="1"` : '';
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    })
    .join('');

  const columnCount = Math.max(sheet.columnWidths.length, 1);
  const lastCell = `${columnLetters(columnCount - 1)}${Math.max(sheet.rows.length, 1)}`;
  const frozen = sheet.freezeRows ?? 0;
  const pane = frozen
    ? `<pane ySplit="${frozen}" topLeftCell="A${frozen + 1}" activePane="bottomLeft" state="frozen"/>` +
      `<selection pane="bottomLeft" activeCell="A${frozen + 1}" sqref="A${frozen + 1}"/>`
    : '';
  const cols = sheet.columnWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join('');

  const sheetXml =
    `${XML_HEADER}<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${lastCell}"/>` +
    `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rowsXml}</sheetData>` +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.7" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' +
    '<headerFooter><oddFooter>&amp;CPage &amp;P of &amp;N</oddFooter></headerFooter>' +
    '</worksheet>';

  const sheetName = escapeXml(sheet.name);
  const printTitles = sheet.printTitleRow
    ? `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName}'!$${sheet.printTitleRow}:$${sheet.printTitleRow}</definedName></definedNames>`
    : '';
  const workbookXml =
    `${XML_HEADER}<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    '<bookViews><workbookView/></bookViews>' +
    `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>` +
    printTitles +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
    '</workbook>';

  const sharedStringsXml =
    `${XML_HEADER}<sst xmlns="${MAIN_NS}" count="${stringCount}" uniqueCount="${strings.items.length}">` +
    `${strings.items.join('')}</sst>`;

  const contentTypesXml =
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '</Types>';

  const rootRelsXml =
    `${XML_HEADER}<Relationships xmlns="${PACKAGE_REL_NS}">` +
    `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>';

  const workbookRelsXml =
    `${XML_HEADER}<Relationships xmlns="${PACKAGE_REL_NS}">` +
    `<Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId3" Type="${REL_NS}/sharedStrings" Target="sharedStrings.xml"/>` +
    '</Relationships>';

  return zipStore(
    [
      { name: '[Content_Types].xml', data: utf8(contentTypesXml) },
      { name: '_rels/.rels', data: utf8(rootRelsXml) },
      { name: 'xl/workbook.xml', data: utf8(workbookXml) },
      { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRelsXml) },
      { name: 'xl/styles.xml', data: utf8(styles.toXml()) },
      { name: 'xl/sharedStrings.xml', data: utf8(sharedStringsXml) },
      { name: 'xl/worksheets/sheet1.xml', data: utf8(sheetXml) },
    ],
    options.created,
  );
}
