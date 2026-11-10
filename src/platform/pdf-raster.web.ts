import {
  heroGlow,
  type MeasureText,
  type PdfFont,
  type PdfLayout,
  type PdfOp,
  type PdfPageImage,
  type Rgb,
} from '@/application/statement-export';

import type { PdfRasterizer } from './pdf-raster';

/** Pixels per point: about 216 dpi, sharp on screen and in print. */
const SCALE = 3;
const JPEG_QUALITY = 0.92;
/** Close to the PDF's own font; the browser adds a fallback for other scripts. */
const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function css(rgb: Rgb, alpha = 1): string {
  const channel = (value: number) => Math.round(value * 255);
  return `rgba(${channel(rgb[0])}, ${channel(rgb[1])}, ${channel(rgb[2])}, ${alpha})`;
}

function font(kind: PdfFont, size: number): string {
  return `${kind === 'bold' ? '700' : '400'} ${size}px ${FONT_STACK}`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function draw(context: CanvasRenderingContext2D, op: PdfOp) {
  switch (op.kind) {
    case 'rect':
      roundedRect(context, op.x, op.y, op.width, op.height, op.radius ?? 0);
      context.fillStyle = css(op.fill);
      context.fill();
      break;
    case 'line':
      context.beginPath();
      context.moveTo(op.x1, op.y1);
      context.lineTo(op.x2, op.y2);
      context.strokeStyle = css(op.color);
      context.lineWidth = op.width;
      context.stroke();
      break;
    case 'text':
      context.font = font(op.font, op.size);
      context.fillStyle = css(op.color);
      context.textBaseline = 'alphabetic';
      context.textAlign = 'left';
      context.direction = 'ltr';
      context.fillText(op.text, op.x, op.y);
      break;
    case 'hero': {
      context.save();
      roundedRect(context, op.x, op.y, op.width, op.height, op.radius);
      context.clip();
      const gradient = context.createLinearGradient(op.x, op.y, op.x + op.width, op.y + op.height);
      op.stops.forEach((stop, index) =>
        gradient.addColorStop(op.stops.length > 1 ? index / (op.stops.length - 1) : 0, css(stop)),
      );
      context.fillStyle = gradient;
      context.fillRect(op.x, op.y, op.width, op.height);
      const glow = heroGlow(op);
      context.beginPath();
      context.arc(glow.cx, glow.cy, glow.radius, 0, Math.PI * 2);
      context.fillStyle = css([1, 1, 1], glow.alpha);
      context.fill();
      context.restore();
      break;
    }
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The page could not be drawn.'));
          return;
        }
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Web version: draws pages on a canvas, so the browser's own text engine shapes
 * Arabic and any other script the PDF's built-in font does not cover.
 */
export function getPdfRasterizer(): PdfRasterizer | null {
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;

  const measure: MeasureText = (text, kind, size) => {
    probe.font = font(kind, size);
    return probe.measureText(text).width;
  };

  const render = async (layout: PdfLayout): Promise<PdfPageImage[]> => {
    const images: PdfPageImage[] = [];
    for (const page of layout.pages) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(layout.width * SCALE);
      canvas.height = Math.round(layout.height * SCALE);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The page could not be drawn.');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(SCALE, SCALE);
      for (const op of page.ops) draw(context, op);
      images.push({
        jpeg: await toJpeg(canvas),
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
      });
      // Free the pixels straight away; a page is several megabytes uncompressed.
      canvas.width = 0;
      canvas.height = 0;
    }
    return images;
  };

  return { measure, render };
}
