import type { MeasureText, PdfLayout, PdfPageImage } from '@/application/statement-export';

/** Draws laid-out pages as pictures, for text the PDF's built-in font cannot show. */
export type PdfRasterizer = {
  measure: MeasureText;
  render: (layout: PdfLayout) => Promise<PdfPageImage[]>;
};

/** The native app has no canvas to draw pages with, so there is no rasterizer here. */
export function getPdfRasterizer(): PdfRasterizer | null {
  return null;
}
