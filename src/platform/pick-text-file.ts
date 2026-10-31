import { File } from 'expo-file-system';

/** Lets the person choose a file (for example a backup) and returns its text. */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const result = await File.pickFileAsync({ mimeTypes: ['application/json', '*/*'] });
  if (result.canceled) return null;
  const file = result.result;
  return { name: file.name, text: await file.text() };
}
