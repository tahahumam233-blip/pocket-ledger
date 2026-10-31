/**
 * Stores the web database file in IndexedDB. Kept free of React and Expo so it
 * can be tested in Node with fake-indexeddb.
 */
const DB_NAME = 'pocket-ledger';
const STORE = 'snapshots';
const KEY = 'ledger.sqlite';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function openStore(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Could not open browser storage'));
    open.onblocked = () => reject(new Error('Browser storage is blocked by another tab'));
  });
}

export type SnapshotStore = {
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
  clear(): Promise<void>;
};

export function createIndexedDbSnapshotStore(factory: IDBFactory): SnapshotStore {
  let database: Promise<IDBDatabase> | null = null;
  const db = () => (database ??= openStore(factory));

  const write = async (mode: 'put' | 'delete', bytes?: Uint8Array) => {
    const connection = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = connection.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (mode === 'put') store.put(bytes, KEY);
      else store.delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not save to browser storage'));
      tx.onabort = () => reject(tx.error ?? new Error('Saving to browser storage was aborted'));
    });
  };

  return {
    async load() {
      const connection = await db();
      const value = await request(
        connection.transaction(STORE, 'readonly').objectStore(STORE).get(KEY),
      );
      if (value instanceof Uint8Array) return value;
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      return null;
    },
    save: (bytes) => write('put', bytes),
    clear: () => write('delete'),
  };
}
