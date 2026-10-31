import 'fake-indexeddb/auto';

import { describe, expect, it } from '@jest/globals';

import { createAppServices, type ReceiptFileStore } from '@/application';
import { createTestSqlJsDriver } from '@/test/sqljs-test-driver';

import { initializeDatabase } from '../database';
import { createIndexedDbSnapshotStore } from '../web-snapshot-store';

const noFiles: ReceiptFileStore = {
  persist: async () => undefined,
  remove: async () => undefined,
  resolveUri: async (fileName) => fileName,
  readBase64: async () => null,
  writeBase64: async () => undefined,
  removeAll: async () => undefined,
};

async function onboardOn(driverPromise: ReturnType<typeof createTestSqlJsDriver>) {
  const { driver, snapshots } = await driverPromise;
  const repos = await initializeDatabase(driver);
  const services = createAppServices({ repos, files: noFiles });
  await services.setup.completeOnboarding({
    currencies: ['IQD', 'USD'],
    accounts: [
      {
        name: 'Pocket',
        kind: 'pocket',
        icon: 'wallet',
        color: '#19A89D',
        openingBalances: { IQD: 500000 },
      },
    ],
    reminder: { enabled: true, hour: 21, minute: 0 },
    openingDate: '2026-10-01',
  });
  return { repos, services, snapshots };
}

describe('sql.js web driver', () => {
  it('saves a snapshot after every committed write and none for reads', async () => {
    const { repos, services, snapshots } = await onboardOn(createTestSqlJsDriver());
    const before = snapshots.length;
    expect(before).toBeGreaterThan(0);
    await repos.accounts.list();
    await services.queries.home();
    expect(snapshots.length).toBe(before);

    const pocket = (await repos.accounts.list())[0];
    const food = (await repos.categories.list()).find((category) => category.kind === 'expense');
    if (!pocket || !food) throw new Error('fixtures missing');
    await services.ledger.createTransaction({
      kind: 'expense',
      accountId: pocket.id,
      currency: 'IQD',
      amountMinor: 25000,
      categoryId: food.id,
      postedDate: '2026-10-02',
      note: 'Lunch',
    });
    expect(snapshots.length).toBe(before + 1);
  });

  it('reopens from the last snapshot with every balance intact', async () => {
    const { services, snapshots, repos } = await onboardOn(createTestSqlJsDriver());
    const pocket = (await repos.accounts.list())[0];
    const food = (await repos.categories.list()).find((category) => category.kind === 'expense');
    if (!pocket || !food) throw new Error('fixtures missing');
    await services.ledger.createTransaction({
      kind: 'expense',
      accountId: pocket.id,
      currency: 'IQD',
      amountMinor: 25000,
      categoryId: food.id,
      postedDate: '2026-10-02',
      note: '',
    });
    const last = snapshots[snapshots.length - 1];
    if (!last) throw new Error('no snapshot');

    const reopened = await createTestSqlJsDriver(last);
    const reposAgain = await initializeDatabase(reopened.driver);
    const servicesAgain = createAppServices({ repos: reposAgain, files: noFiles });
    expect(await servicesAgain.ledger.getBalance(pocket.id, 'IQD')).toBe(475000);
    expect((await servicesAgain.setup.getSettings()).onboardingCompleted).toBe(true);
    const fk = await reposAgain.driver.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(fk?.foreign_keys).toBe(1);
  });

  it('keeps foreign keys enforced after a snapshot reopens the connection', async () => {
    const { repos } = await onboardOn(createTestSqlJsDriver());
    await expect(
      repos.driver.run(
        "INSERT INTO ledger_lines (id, transaction_id, account_id, currency, amount_minor, role) VALUES ('x', 'missing', 'missing', 'USD', 1, 'main')",
      ),
    ).rejects.toThrow();
  });

  it('rolls back a failed transaction without saving a snapshot', async () => {
    const { repos, snapshots } = await onboardOn(createTestSqlJsDriver());
    const before = snapshots.length;
    const countBefore = await repos.transactions.count();
    await expect(
      repos.driver.transaction(async (tx) => {
        await tx.run(
          "INSERT INTO transactions (id, kind, posted_date, category_id, note, created_at, updated_at, deleted_at) VALUES ('t1', 'expense', '2026-10-02', NULL, '', 'x', 'x', NULL)",
        );
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await repos.transactions.count()).toBe(countBefore);
    expect(snapshots.length).toBe(before);
  });
});

describe('IndexedDB snapshot store', () => {
  it('saves, loads and clears the database file', async () => {
    const store = createIndexedDbSnapshotStore(indexedDB);
    expect(await store.load()).toBeNull();
    await store.save(new Uint8Array([1, 2, 3]));
    expect(Array.from((await store.load()) ?? [])).toEqual([1, 2, 3]);
    await store.save(new Uint8Array([9]));
    expect(Array.from((await store.load()) ?? [])).toEqual([9]);
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
