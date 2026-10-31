const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export type RandomSource = () => number;

/**
 * Generates a compact, URL-safe identifier that sorts roughly by creation time.
 * Identifiers only need to be unique within one person's local database.
 */
export function createId(
  prefix: string,
  random: RandomSource = Math.random,
  now = Date.now(),
): string {
  const time = now.toString(36);
  let suffix = '';
  for (let index = 0; index < 10; index += 1) {
    suffix += ALPHABET[Math.floor(random() * ALPHABET.length)] ?? 'x';
  }
  return `${prefix}_${time}${suffix}`;
}
