import type { ReceiptFileStore } from '@/application/ports';

import { webAssetUrl } from './web-base';

/**
 * Web version: receipt photos are shrunk to a sensible size and kept in the
 * browser's Cache Storage, which belongs to the installed app and works offline.
 */
const CACHE_NAME = 'pocket-ledger-receipts-v1';
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;
const OBJECT_URL_LIMIT = 150;

const objectUrls = new Map<string, string>();

function keyFor(fileName: string): string {
  return new URL(webAssetUrl(`receipt-files/${encodeURIComponent(fileName)}`), location.origin)
    .href;
}

async function openCache(): Promise<Cache> {
  if (typeof caches === 'undefined') {
    throw new Error('Saving photos needs the app to be opened over https.');
  }
  return caches.open(CACHE_NAME);
}

function remember(fileName: string, url: string) {
  const previous = objectUrls.get(fileName);
  if (previous) URL.revokeObjectURL(previous);
  objectUrls.set(fileName, url);
  if (objectUrls.size > OBJECT_URL_LIMIT) {
    const oldest = objectUrls.keys().next().value;
    if (oldest !== undefined) {
      const stale = objectUrls.get(oldest);
      if (stale) URL.revokeObjectURL(stale);
      objectUrls.delete(oldest);
    }
  }
}

function forget(fileName: string) {
  const url = objectUrls.get(fileName);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(fileName);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That picture could not be read.'));
    image.src = src;
  });
}

/** Re-encodes a picked photo as a JPEG no larger than MAX_DIMENSION on its long side. */
async function shrink(source: Blob): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return source;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? source;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

async function store(fileName: string, blob: Blob) {
  const cache = await openCache();
  await cache.put(
    keyFor(fileName),
    new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }),
  );
  remember(fileName, URL.createObjectURL(blob));
}

export const receiptFiles: ReceiptFileStore = {
  async persist(sourceUri, fileName) {
    const response = await fetch(sourceUri);
    const original = await response.blob();
    await store(fileName, await shrink(original));
  },
  async remove(fileName) {
    forget(fileName);
    const cache = await openCache();
    await cache.delete(keyFor(fileName));
  },
  async resolveUri(fileName) {
    const known = objectUrls.get(fileName);
    if (known) return known;
    const cache = await openCache();
    const match = await cache.match(keyFor(fileName));
    if (!match) return '';
    const url = URL.createObjectURL(await match.blob());
    remember(fileName, url);
    return url;
  },
  async readBase64(fileName) {
    const cache = await openCache();
    const match = await cache.match(keyFor(fileName));
    return match ? blobToBase64(await match.blob()) : null;
  },
  async writeBase64(fileName, base64) {
    const type = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    await store(fileName, base64ToBlob(base64, type));
  },
  async removeAll() {
    for (const fileName of [...objectUrls.keys()]) forget(fileName);
    if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
  },
};
