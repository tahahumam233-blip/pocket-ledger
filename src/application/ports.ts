/** Small adapters that keep device APIs out of the application layer. */

export type Clock = { now: () => Date };

export const systemClock: Clock = { now: () => new Date() };

export type IdGenerator = (prefix: string) => string;

/** Stores receipt images under stable file names owned by the app. */
export interface ReceiptFileStore {
  /** Copies a picked image (file:// uri) into app storage under `fileName`. */
  persist(sourceUri: string, fileName: string): Promise<void>;
  remove(fileName: string): Promise<void>;
  uriFor(fileName: string): string;
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
