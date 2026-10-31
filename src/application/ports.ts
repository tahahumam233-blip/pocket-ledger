/** Small adapters that keep device APIs out of the application layer. */

export type Clock = { now: () => Date };

export const systemClock: Clock = { now: () => new Date() };

export type IdGenerator = (prefix: string) => string;

/** Stores receipt images under stable file names owned by the app. */
export interface ReceiptFileStore {
  /** Copies a picked image (a file:// or blob: uri) into app storage under `fileName`. */
  persist(sourceUri: string, fileName: string): Promise<void>;
  remove(fileName: string): Promise<void>;
  /** A uri an image component can display. */
  resolveUri(fileName: string): Promise<string>;
  /** The stored image as base64, for backups; null when missing. */
  readBase64(fileName: string): Promise<string | null>;
  /** Writes an image restored from a backup. */
  writeBase64(fileName: string, base64: string): Promise<void>;
  /** Deletes every stored receipt image. */
  removeAll(): Promise<void>;
}

export type ReminderPlan = {
  identifier: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
};

export interface ReminderScheduler {
  /** Returns whether notifications may be shown, requesting permission when needed. */
  ensurePermission(): Promise<boolean>;
  schedule(plan: ReminderPlan): Promise<void>;
  cancel(identifier: string): Promise<void>;
}
