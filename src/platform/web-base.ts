/**
 * The path the web app is served from, such as "/pocket-ledger" on GitHub Pages
 * or "" at a domain root. Inlined at build time from `experiments.baseUrl`.
 */
export const WEB_BASE_URL = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

export function webAssetUrl(path: string): string {
  return `${WEB_BASE_URL}/${path.replace(/^\/+/, '')}`;
}
