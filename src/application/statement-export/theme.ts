/**
 * The colours a statement file is drawn with, as #RRGGBB. The caller passes the
 * app's own light palette, so exported files always match the app.
 */
export type StatementTheme = {
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  surfaceMuted: string;
  primary: string;
  /** The blue gradient of the Home card, darkest first. */
  heroGradient: readonly string[];
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
};
