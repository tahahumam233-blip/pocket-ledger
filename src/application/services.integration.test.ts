import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  CURRENT_SCHEMA_VERSION,
  initializeDatabase,
  MIGRATIONS,
  type Repositories,
  type SqlDriver,
} from '@/data';
import { LedgerError } from '@/domain';
import { createNodeSqliteDriver } from '@/test/node-sqlite-driver';
import { createTestSqlJsDriver } from '@/test/sqljs-test-driver';

import { type AppServices, createAppServices } from './index';
import type { ReceiptFileStore, ReminderPlan, ReminderScheduler } from './ports';
import { isBackupDue } from './queries';
import { planReminder, REMINDER_IDENTIFIER, syncReminder } from './reminder';

class FakeFileStore implements ReceiptFileStore {
  files = new Map<string, string>();
  async persist(sourceUri: string, fileName: string) {
    this.files.set(fileName, sourceUri);
  }
  async remove(fileName: string) {
    this.files.delete(fileName);
  }
  async resolveUri(fileName: string) {
    return `file:///receipts/${fileName}`;
  }
  async readBase64(fileName: string) {
    const source = this.files.get(fileName);
    return source === undefined ? null : Buffer.from(source).toString('base64');
  }
  async writeBase64(fileName: string, base64: string) {
    this.files.set(fileName, Buffer.from(base64, 'base64').toString());
  }
  async removeAll() {
    this.files.clear();
  }
}

let counter = 0;
const newId = (prefix: string) => `${prefix}_${String((counter += 1)).padStart(4, '0')}`;
const fixedClock = { now: () => new Date(2026, 9, 31, 20, 15) };

let repos: Repositories;
let services: AppServices;
let files: FakeFileStore;

async function onboard() {
  await services.setup.completeOnboarding({
    currencies: ['USD', 'IQD'],
    userName: 'Taha',
    accounts: [
      {
        name: 'Safe',
        kind: 'safe',
        icon: 'lock-closed',
        color: '#5B5BD6',
        openingBalances: { USD: 90000, IQD: 2000000 },
      },
      {
        name: 'Pocket',
        kind: 'pocket',
        icon: 'wallet',
        color: '#19A89D',
        openingBalances: { USD: 10000 },
      },
      { name: 'Bank', kind: 'bank', icon: 'business', color: '#1F4FD8', openingBalances: {} },
    ],
    reminder: { enabled: true, hour: 21, minute: 30 },
    openingDate: '2026-10-01',
  });
  const accounts = await repos.accounts.list();
  const categories = await repos.categories.list();
  const byName = (name: string) => {
    const account = accounts.find((item) => item.name === name);
    if (!account) throw new Error(`missing account ${name}`);
    return account;
  };
  const categoryNamed = (name: string) => {
    const category = categories.find((item) => item.name === name);
    if (!category) throw new Error(`missing category ${name}`);
    return category;
  };
  return {
    safe: byName('Safe'),
    pocket: byName('Pocket'),
    bank: byName('Bank'),
    food: categoryNamed('Food & Drink'),
    salary: categoryNamed('Salary'),
  };
}

async function balance(accountId: string, currency: string) {
  return services.ledger.getBalance(accountId, currency);
}

const DRIVERS: [string, () => Promise<SqlDriver>][] = [
  ['node:sqlite (native stand-in)', async () => createNodeSqliteDriver()],
  ['sql.js (web)', async () => (await createTestSqlJsDriver()).driver],
];

describe.each(DRIVERS)('with %s', (_name, makeDriver) => {
  beforeEach(async () => {
    counter = 0;
    repos = await initializeDatabase(await makeDriver());
    files = new FakeFileStore();
    services = createAppServices({ repos, files, clock: fixedClock, newId });
  });

  afterEach(async () => {
    await repos.driver.close();
  });

  describe('database setup', () => {
    it('migrates once and is idempotent', async () => {
      const version = await repos.driver.get<{ user_version: number }>('PRAGMA user_version');
      expect(version?.user_version).toBe(CURRENT_SCHEMA_VERSION);
      await initializeDatabase(repos.driver);
      expect(
        (await repos.driver.get<{ user_version: number }>('PRAGMA user_version'))?.user_version,
      ).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('onboarding', () => {
    it('creates accounts, seeds categories, records opening balances and saves settings', async () => {
      const { safe, pocket, bank } = await onboard();
      expect(await balance(safe.id, 'USD')).toBe(90000);
      expect(await balance(safe.id, 'IQD')).toBe(2000000);
      expect(await balance(pocket.id, 'USD')).toBe(10000);
      expect(await balance(bank.id, 'USD')).toBe(0);

      const settings = await services.setup.getSettings();
      expect(settings.onboardingCompleted).toBe(true);
      expect(settings.currencies).toEqual(['USD', 'IQD']);
      expect(settings.reminderEnabled).toBe(true);
      expect(settings.reminderHour).toBe(21);
      expect(settings.userName).toBe('Taha');

      const categories = await repos.categories.list();
      expect(categories.length).toBeGreaterThan(15);
      expect(categories.some((category) => category.kind === 'income')).toBe(true);

      const openings = await repos.transactions.list({ kinds: ['opening'] });
      expect(openings).toHaveLength(3);
      const home = await services.queries.home();
      expect(home.totals).toEqual({ USD: 100000, IQD: 2000000 });
      expect(home.spentThisMonth).toEqual({});
    });

    it('rejects identical currencies', async () => {
      await expect(
        services.setup.completeOnboarding({
          currencies: ['USD', 'USD'],
          accounts: [
            { name: 'Pocket', kind: 'pocket', icon: 'wallet', color: '#000', openingBalances: {} },
          ],
          reminder: { enabled: false, hour: 21, minute: 0 },
        }),
      ).rejects.toThrow('two different currencies');
    });
  });

  describe('ledger regression scenario', () => {
    it('keeps balances and reports consistent through expense, transfer and income', async () => {
      const { pocket, bank, food, salary } = await onboard();
      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 2000,
        categoryId: food.id,
        postedDate: '2026-10-05',
        note: 'Lunch',
      });
      expect(await balance(pocket.id, 'USD')).toBe(8000);

      await services.ledger.createTransaction({
        kind: 'transfer',
        fromAccountId: bank.id,
        toAccountId: pocket.id,
        currency: 'USD',
        amountMinor: 10000,
        postedDate: '2026-10-06',
        note: 'ATM',
      });
      expect(await balance(bank.id, 'USD')).toBe(-10000);
      expect(await balance(pocket.id, 'USD')).toBe(18000);

      await services.ledger.createTransaction({
        kind: 'income',
        accountId: bank.id,
        currency: 'USD',
        amountMinor: 20000,
        categoryId: salary.id,
        postedDate: '2026-10-07',
        note: 'Salary',
      });
      expect(await balance(bank.id, 'USD')).toBe(10000);

      const report = await services.queries.monthReport({ year: 2026, month: 10 }, 'USD');
      expect(report.summary.expense).toBe(2000);
      expect(report.summary.income).toBe(20000);
      expect(report.summary.expenseByCategory[0]).toMatchObject({
        categoryId: food.id,
        total: 2000,
      });
      const home = await services.queries.home();
      expect(home.totals.USD).toBe(118000);
      expect(home.spentThisMonth.USD).toBe(2000);
    });

    it('writes nothing when a draft is invalid', async () => {
      const { pocket, salary } = await onboard();
      const before = await repos.transactions.count();
      await expect(
        services.ledger.createTransaction({
          kind: 'expense',
          accountId: pocket.id,
          currency: 'USD',
          amountMinor: 500,
          categoryId: salary.id,
          postedDate: '2026-10-05',
          note: '',
        }),
      ).rejects.toBeInstanceOf(LedgerError);
      expect(await repos.transactions.count()).toBe(before);
    });
  });

  describe('transfers and exchanges', () => {
    it('stores same-currency transfers as linked zero-sum lines', async () => {
      const { safe, pocket } = await onboard();
      const transfer = await services.ledger.createTransaction({
        kind: 'transfer',
        fromAccountId: safe.id,
        toAccountId: pocket.id,
        currency: 'IQD',
        amountMinor: 250000,
        postedDate: '2026-10-10',
        note: '',
      });
      expect(transfer.lines.map((line) => line.amountMinor).reduce((a, b) => a + b, 0)).toBe(0);
      expect(await balance(safe.id, 'IQD')).toBe(1750000);
      expect(await balance(pocket.id, 'IQD')).toBe(250000);
      const home = await services.queries.home();
      expect(home.totals.IQD).toBe(2000000);
    });

    it('records exchanges between currencies without mixing them', async () => {
      const { safe, pocket } = await onboard();
      await services.ledger.createTransaction({
        kind: 'transfer',
        fromAccountId: safe.id,
        toAccountId: pocket.id,
        currency: 'USD',
        amountMinor: 10000,
        toCurrency: 'IQD',
        toAmountMinor: 131000,
        postedDate: '2026-10-10',
        note: 'Exchange office',
      });
      expect(await balance(safe.id, 'USD')).toBe(80000);
      expect(await balance(pocket.id, 'IQD')).toBe(131000);
      const usd = await services.queries.monthReport({ year: 2026, month: 10 }, 'USD');
      const iqd = await services.queries.monthReport({ year: 2026, month: 10 }, 'IQD');
      expect(usd.summary.expense).toBe(0);
      expect(iqd.summary.income).toBe(0);
    });
  });

  describe('editing, deleting and restoring', () => {
    it('replaces all lines on edit and keeps balances explainable', async () => {
      const { pocket, bank, food } = await onboard();
      const created = await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 1500,
        categoryId: food.id,
        postedDate: '2026-10-05',
        note: 'Coffee',
      });
      await services.ledger.updateTransaction(created.id, {
        kind: 'expense',
        accountId: bank.id,
        currency: 'USD',
        amountMinor: 2500,
        categoryId: food.id,
        postedDate: '2026-10-06',
        note: 'Dinner',
      });
      expect(await balance(pocket.id, 'USD')).toBe(10000);
      expect(await balance(bank.id, 'USD')).toBe(-2500);
      const stored = await services.ledger.getTransaction(created.id);
      expect(stored?.lines).toHaveLength(1);
      expect(stored?.note).toBe('Dinner');
      expect(stored?.postedDate).toBe('2026-10-06');
    });

    it('soft deletion removes entries from balances and reports until restored', async () => {
      const { pocket, food } = await onboard();
      const created = await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 1500,
        categoryId: food.id,
        postedDate: '2026-10-05',
        note: '',
      });
      await services.ledger.deleteTransaction(created.id);
      expect(await balance(pocket.id, 'USD')).toBe(10000);
      expect(
        (await services.queries.monthReport({ year: 2026, month: 10 }, 'USD')).summary.expense,
      ).toBe(0);
      expect(await repos.transactions.list()).not.toContainEqual(
        expect.objectContaining({ id: created.id }),
      );

      await services.ledger.restoreTransaction(created.id);
      expect(await balance(pocket.id, 'USD')).toBe(8500);
      expect(
        (await services.queries.monthReport({ year: 2026, month: 10 }, 'USD')).summary.expense,
      ).toBe(1500);
    });

    it('refuses to restore when the category has since been archived', async () => {
      const { pocket, food } = await onboard();
      const created = await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 1500,
        categoryId: food.id,
        postedDate: '2026-10-05',
        note: '',
      });
      await services.ledger.deleteTransaction(created.id);
      expect(await services.setup.removeCategory(food.id)).toBe('archived');
      await expect(services.ledger.restoreTransaction(created.id)).rejects.toBeInstanceOf(
        LedgerError,
      );
      expect(await balance(pocket.id, 'USD')).toBe(10000);
    });
  });

  describe('reconciliation', () => {
    it('appends an adjustment for the difference and never rewrites history', async () => {
      const { pocket } = await onboard();
      const result = await services.ledger.adjustBalance({
        accountId: pocket.id,
        currency: 'USD',
        actualMinor: 9250,
        postedDate: '2026-10-20',
      });
      expect(result.difference).toBe(-750);
      expect(result.transaction?.note).toBe('Reconciliation adjustment');
      expect(await balance(pocket.id, 'USD')).toBe(9250);
      const again = await services.ledger.adjustBalance({
        accountId: pocket.id,
        currency: 'USD',
        actualMinor: 9250,
        postedDate: '2026-10-20',
      });
      expect(again.transaction).toBeNull();
      const report = await services.queries.monthReport({ year: 2026, month: 10 }, 'USD');
      expect(report.summary.expense).toBe(0);
      expect(report.summary.income).toBe(0);
      expect(await repos.transactions.count({ kinds: ['adjustment'] })).toBe(1);
    });
  });

  describe('receipts inbox', () => {
    it('captures first and records the amount later', async () => {
      const { pocket, food } = await onboard();
      const receipt = await services.receipts.capture({
        uri: 'file:///cache/IMG_001.JPG',
        width: 1200,
        height: 1600,
        fileName: 'IMG_001.JPG',
      });
      expect(receipt.fileName).toMatch(/^rcpt_\d+\.jpg$/);
      expect(files.files.get(receipt.fileName)).toBe('file:///cache/IMG_001.JPG');
      expect(await services.receipts.countPending()).toBe(1);
      expect((await services.queries.home()).pendingReceipts).toBe(1);

      const transaction = await services.receipts.recordTransaction(receipt.id, {
        kind: 'expense',
        accountId: pocket.id,
        currency: 'IQD',
        amountMinor: 45000,
        categoryId: food.id,
        postedDate: '2026-10-31',
        note: 'Restaurant',
      });
      expect(await services.receipts.countPending()).toBe(0);
      const inbox = await services.queries.receiptsInbox();
      expect(inbox.done.map((item) => item.id)).toEqual([receipt.id]);
      expect(await services.receipts.forTransaction(transaction.id)).toHaveLength(1);

      await services.ledger.deleteTransaction(transaction.id);
      expect((await services.queries.receiptsInbox()).done).toHaveLength(0);

      await services.receipts.remove(receipt.id);
      expect(files.files.size).toBe(0);
      expect(await services.receipts.get(receipt.id)).toBeNull();
    });

    it('rolls back the file when the database insert fails', async () => {
      await onboard();
      await repos.driver.exec('DROP TABLE receipts');
      await expect(
        services.receipts.capture({ uri: 'file:///cache/x.png', fileName: 'x.png' }),
      ).rejects.toThrow();
      expect(files.files.size).toBe(0);
    });
  });

  describe('accounts, categories and currencies', () => {
    it('archives accounts with history and deletes unused ones, keeping at least one', async () => {
      const { safe, bank } = await onboard();
      expect(await services.setup.removeAccount(bank.id)).toBe('deleted');
      expect(await services.setup.removeAccount(safe.id)).toBe('archived');
      const remaining = await repos.accounts.list();
      expect(remaining.map((account) => account.name)).toEqual(['Pocket']);
      const pocket = remaining[0];
      if (!pocket) throw new Error('missing pocket');
      await expect(services.setup.removeAccount(pocket.id)).rejects.toThrow('at least one');
      await services.setup.restoreAccount(safe.id);
      expect((await repos.accounts.list()).map((account) => account.name)).toEqual([
        'Safe',
        'Pocket',
      ]);
    });

    it('blocks replacing a currency that has history and allows swapping an unused one', async () => {
      await onboard();
      await expect(services.setup.replaceCurrency('USD', 'EUR')).rejects.toThrow(
        'cannot be replaced',
      );
      await services.setup.updateSettings({ currencies: ['USD', 'SAR'] });
      const updated = await services.setup.replaceCurrency('SAR', 'AED');
      expect(updated.currencies).toEqual(['USD', 'AED']);
      const primary = await services.setup.setPrimaryCurrency('AED');
      expect(primary.currencies).toEqual(['AED', 'USD']);
    });

    it('exports every active line as CSV', async () => {
      const { pocket, food } = await onboard();
      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 1234,
        categoryId: food.id,
        postedDate: '2026-10-31',
        note: 'Lunch, downtown',
      });
      const csv = await services.exporter.transactionsCsv();
      expect(csv.fileName).toBe('pocket-ledger-2026-10-31.csv');
      expect(csv.rows).toBe(4);
      expect(csv.content).toContain(
        '2026-10-31,expense,Pocket,Food & Drink,USD,-12.34,"Lunch, downtown",no,',
      );
    });

    it('erases everything so onboarding can start again', async () => {
      await onboard();
      await services.setup.eraseAllData();
      expect(await repos.accounts.list({ includeArchived: true })).toHaveLength(0);
      expect(await repos.transactions.count({ includeDeleted: true })).toBe(0);
      expect((await services.setup.getSettings()).onboardingCompleted).toBe(false);
    });
  });

  describe('backup and restore', () => {
    it('round-trips every table and photo into a fresh database', async () => {
      const { pocket, bank, food } = await onboard();
      const receipt = await services.receipts.capture({
        uri: 'file:///cache/a.jpg',
        fileName: 'a.jpg',
      });
      await services.receipts.recordTransaction(receipt.id, {
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 1250,
        categoryId: food.id,
        postedDate: '2026-10-05',
        note: 'Lunch',
      });
      const transfer = await services.ledger.createTransaction({
        kind: 'transfer',
        fromAccountId: bank.id,
        toAccountId: pocket.id,
        currency: 'USD',
        amountMinor: 5000,
        toCurrency: 'IQD',
        toAmountMinor: 65000,
        postedDate: '2026-10-06',
        note: 'Exchange',
      });
      await services.ledger.deleteTransaction(transfer.id);

      const backup = await services.backup.create();
      expect(backup.fileName).toBe('pocket-ledger-backup-2026-10-31.json');
      expect(backup.summary).toEqual({
        transactions: 4,
        accounts: 3,
        receipts: 1,
        missingFiles: 0,
      });
      expect((await services.setup.getSettings()).lastBackupAt).toBe('');
      await services.backup.markSaved(backup.exportedAt);
      expect((await services.setup.getSettings()).lastBackupAt).toBe(backup.exportedAt);

      const otherFiles = new FakeFileStore();
      const otherRepos = await initializeDatabase(await makeDriver());
      const other = createAppServices({
        repos: otherRepos,
        files: otherFiles,
        clock: fixedClock,
        newId,
      });
      const summary = await other.backup.restore(backup.content);
      expect(summary).toEqual({ transactions: 4, accounts: 3, receipts: 1, missingFiles: 0 });

      expect(await other.ledger.getBalance(pocket.id, 'USD')).toBe(8750);
      expect(await other.ledger.getBalance(bank.id, 'USD')).toBe(0);
      expect(await other.ledger.getBalance(pocket.id, 'IQD')).toBe(0);
      const restoredTransfer = await other.ledger.getTransaction(transfer.id);
      expect(restoredTransfer?.deletedAt).not.toBeNull();
      expect(restoredTransfer?.lines).toHaveLength(2);
      expect(otherFiles.files.get(receipt.fileName)).toBe('file:///cache/a.jpg');
      expect((await other.setup.getSettings()).onboardingCompleted).toBe(true);
      expect((await other.setup.getSettings()).reminderSignature).toBe('');
      await otherRepos.driver.close();
    });

    it('replaces what was there before', async () => {
      await onboard();
      const backup = await services.backup.create();
      const { pocket, food } = await (async () => {
        const accounts = await repos.accounts.list();
        const categories = await repos.categories.list();
        return { pocket: accounts[1], food: categories[0] };
      })();
      if (!pocket || !food) throw new Error('fixtures missing');
      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 999,
        categoryId: food.id,
        postedDate: '2026-10-07',
        note: 'After backup',
      });
      await services.backup.restore(backup.content);
      expect(await repos.transactions.count({ search: 'After backup' })).toBe(0);
      expect(await services.ledger.getBalance(pocket.id, 'USD')).toBe(10000);
    });

    it('rejects damaged or foreign files without touching the ledger', async () => {
      const { pocket } = await onboard();
      const good = JSON.parse((await services.backup.create()).content);
      const attempts = [
        'not json',
        JSON.stringify({ hello: 'world' }),
        JSON.stringify({ ...good, version: 99 }),
        JSON.stringify({ ...good, schemaVersion: 999 }),
        JSON.stringify({ ...good, tables: { ...good.tables, ledger_lines: [{ id: 'x' }] } }),
        JSON.stringify({
          ...good,
          tables: {
            ...good.tables,
            ledger_lines: [
              ...good.tables.ledger_lines,
              {
                id: 'bad',
                transaction_id: 'missing',
                account_id: pocket.id,
                currency: 'USD',
                amount_minor: 5,
                role: 'main',
              },
            ],
          },
        }),
        JSON.stringify({ ...good, files: { '../escape.jpg': 'AAAA' } }),
      ];
      for (const attempt of attempts) {
        await expect(services.backup.restore(attempt)).rejects.toThrow();
        expect(await services.ledger.getBalance(pocket.id, 'USD')).toBe(10000);
      }
    });
  });

  describe('people and debts', () => {
    async function withPeople() {
      const base = await onboard();
      const ali = await services.setup.createPerson({ name: 'Ali', note: 'Cousin' });
      const sara = await services.setup.createPerson({
        name: 'Sara',
        dueDate: '2026-11-15',
        startingBalance: { currency: 'USD', amountMinor: -5000, postedDate: '2026-09-01' },
      });
      return { ...base, ali, sara };
    }
    const debt = (
      action: 'lend' | 'borrow' | 'collect' | 'repay',
      personId: string,
      accountId: string,
      amountMinor: number,
      postedDate: string,
      currency = 'USD',
      note = '',
    ) =>
      services.ledger.createTransaction({
        kind: 'debt',
        action,
        personId,
        accountId,
        currency,
        amountMinor,
        postedDate,
        note,
      });

    it('lending and collecting move money between your account and the person', async () => {
      const { pocket, bank, ali } = await withPeople();
      await debt('lend', ali.id, pocket.id, 6000, '2026-10-02', 'USD', 'Rent help');
      expect(await balance(pocket.id, 'USD')).toBe(4000);
      expect(await balance(ali.id, 'USD')).toBe(6000);
      await debt('collect', ali.id, bank.id, 2500, '2026-10-10');
      expect(await balance(ali.id, 'USD')).toBe(3500);
      expect(await balance(bank.id, 'USD')).toBe(2500);

      const home = await services.queries.home();
      expect(home.totals.USD).toBe(96500);
      expect(home.debts.owedToYou).toEqual({ USD: 3500 });
      expect(home.debts.youOwe).toEqual({ USD: 5000 });
      expect(home.accounts.map((account) => account.name)).toEqual(['Safe', 'Pocket', 'Bank']);
      expect(home.people.map((person) => person.name)).toEqual(['Ali', 'Sara']);
    });

    it('borrowing and paying back track what you owe', async () => {
      const { safe, sara } = await withPeople();
      expect(await balance(sara.id, 'USD')).toBe(-5000);
      await debt('borrow', sara.id, safe.id, 20000, '2026-10-05');
      expect(await balance(sara.id, 'USD')).toBe(-25000);
      expect(await balance(safe.id, 'USD')).toBe(110000);
      await debt('repay', sara.id, safe.id, 25000, '2026-10-20');
      expect(await balance(sara.id, 'USD')).toBe(0);
      expect((await services.queries.home()).debts.youOwe).toEqual({});
    });

    it('keeps debts out of income and spending, but counts expenses others paid for you', async () => {
      const { pocket, ali, food } = await withPeople();
      await debt('lend', ali.id, pocket.id, 6000, '2026-10-02');
      await debt('collect', ali.id, pocket.id, 1000, '2026-10-03');
      let report = await services.queries.monthReport({ year: 2026, month: 10 }, 'USD');
      expect(report.summary.expense).toBe(0);
      expect(report.summary.income).toBe(0);

      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: ali.id,
        currency: 'USD',
        amountMinor: 1500,
        categoryId: food.id,
        postedDate: '2026-10-04',
        note: 'Ali paid for lunch',
      });
      report = await services.queries.monthReport({ year: 2026, month: 10 }, 'USD');
      expect(report.summary.expense).toBe(1500);
      expect(await balance(ali.id, 'USD')).toBe(3500);
      expect(await balance(pocket.id, 'USD')).toBe(5000);
    });

    it('debts stay in their own currency and never mix', async () => {
      const { safe, ali } = await withPeople();
      await debt('lend', ali.id, safe.id, 250000, '2026-10-02', 'IQD');
      await debt('lend', ali.id, safe.id, 1000, '2026-10-02', 'USD');
      expect(await balance(ali.id, 'IQD')).toBe(250000);
      expect(await balance(ali.id, 'USD')).toBe(1000);
      const home = await services.queries.home();
      expect(home.debts.owedToYou).toEqual({ IQD: 250000, USD: 1000 });
      expect(home.totals.IQD).toBe(1750000);
    });

    it('builds a statement of account with an opening balance and running balance', async () => {
      const { pocket, bank, ali, food } = await withPeople();
      await debt('lend', ali.id, pocket.id, 5000, '2026-09-20');
      await debt('lend', ali.id, pocket.id, 10000, '2026-10-02', 'USD', 'Car repair');
      await debt('collect', ali.id, bank.id, 4000, '2026-10-10');
      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: ali.id,
        currency: 'USD',
        amountMinor: 2500,
        categoryId: food.id,
        postedDate: '2026-10-15',
        note: '',
      });
      const statement = await services.queries.personStatement(ali.id, 'USD', {
        from: '2026-10-01',
        to: '2026-10-31',
      });
      expect(statement.openingMinor).toBe(5000);
      expect(statement.entries.map((entry) => [entry.description, entry.balanceMinor])).toEqual([
        ['Loan given from Pocket', 15000],
        ['Repayment received into Bank', 11000],
        ['Expense paid on your behalf: Food & Drink', 8500],
      ]);
      expect(statement.closingMinor).toBe(8500);
      expect(statement.closingMinor).toBe(await balance(ali.id, 'USD'));

      const all = await services.queries.personStatement(ali.id, 'USD');
      expect(all.entries).toHaveLength(4);
    });

    it('soft deletion removes a debt from balances and statements until restored', async () => {
      const { pocket, ali } = await withPeople();
      const loan = await debt('lend', ali.id, pocket.id, 3000, '2026-10-02');
      await services.ledger.deleteTransaction(loan.id);
      expect(await balance(ali.id, 'USD')).toBe(0);
      expect(await balance(pocket.id, 'USD')).toBe(10000);
      expect((await services.queries.personStatement(ali.id, 'USD')).entries).toHaveLength(0);
      await services.ledger.restoreTransaction(loan.id);
      expect(await balance(ali.id, 'USD')).toBe(3000);
    });

    it('edits a debt atomically and can change its action', async () => {
      const { pocket, bank, ali } = await withPeople();
      const loan = await debt('lend', ali.id, pocket.id, 3000, '2026-10-02');
      await services.ledger.updateTransaction(loan.id, {
        kind: 'debt',
        action: 'borrow',
        personId: ali.id,
        accountId: bank.id,
        currency: 'USD',
        amountMinor: 4000,
        postedDate: '2026-10-03',
        note: 'Actually borrowed',
      });
      expect(await balance(pocket.id, 'USD')).toBe(10000);
      expect(await balance(bank.id, 'USD')).toBe(4000);
      expect(await balance(ali.id, 'USD')).toBe(-4000);
      const stored = await services.ledger.getTransaction(loan.id);
      expect(stored?.debtAction).toBe('borrow');
      expect(stored?.lines.map((line) => line.amountMinor).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('rejects debts with your own account as the person and transfers to people', async () => {
      const { pocket, bank, ali } = await withPeople();
      await expect(debt('lend', bank.id, pocket.id, 100, '2026-10-02')).rejects.toBeInstanceOf(
        LedgerError,
      );
      await expect(
        services.ledger.createTransaction({
          kind: 'transfer',
          fromAccountId: pocket.id,
          toAccountId: ali.id,
          currency: 'USD',
          amountMinor: 100,
          postedDate: '2026-10-02',
          note: '',
        }),
      ).rejects.toBeInstanceOf(LedgerError);
    });

    it('manages people: duplicates, editing, archiving and deleting unused ones', async () => {
      const { pocket, ali, sara } = await withPeople();
      await expect(services.setup.createPerson({ name: ' ali ' })).rejects.toThrow('already');
      await services.setup.updatePerson(ali.id, {
        name: 'Ali Hassan',
        dueDate: '2026-12-01',
        note: 'Work',
      });
      const updated = await repos.accounts.getById(ali.id);
      expect(updated).toMatchObject({
        name: 'Ali Hassan',
        dueDate: '2026-12-01',
        note: 'Work',
        accountClass: 'person',
      });
      expect(await services.setup.removeAccount(ali.id)).toBe('deleted');
      expect(await services.setup.removeAccount(sara.id)).toBe('archived');
      expect((await services.queries.home()).people).toHaveLength(0);
      expect(
        (await services.queries.people({ includeArchived: true })).map(
          (entry) => entry.account.name,
        ),
      ).toEqual(['Sara']);
      expect(await services.setup.removeAccount(pocket.id)).toBe('archived');
    });

    it('searches activity by person name and filters debts', async () => {
      const { pocket, ali, food } = await withPeople();
      await debt('lend', ali.id, pocket.id, 3000, '2026-10-02');
      await services.ledger.createTransaction({
        kind: 'expense',
        accountId: pocket.id,
        currency: 'USD',
        amountMinor: 100,
        categoryId: food.id,
        postedDate: '2026-10-02',
        note: '',
      });
      expect(await repos.transactions.count({ search: 'ali' })).toBe(1);
      expect(await repos.transactions.count({ debts: 'only' })).toBe(1);
      expect(await repos.transactions.count({ kinds: ['transfer'], debts: 'exclude' })).toBe(0);
    });

    it('exports debts with their action as the type', async () => {
      const { pocket, ali } = await withPeople();
      await debt('lend', ali.id, pocket.id, 3000, '2026-10-02');
      const csv = await services.exporter.transactionsCsv();
      expect(csv.content).toContain('2026-10-02,lend,Pocket,,USD,-30.00');
      expect(csv.content).toContain('2026-10-02,lend,Ali,,USD,30.00');
    });

    it('backs up and restores people and debts', async () => {
      const { pocket, ali, sara } = await withPeople();
      await debt('lend', ali.id, pocket.id, 3000, '2026-10-02');
      const backup = await services.backup.create();
      const otherRepos = await initializeDatabase(await makeDriver());
      const other = createAppServices({
        repos: otherRepos,
        files: new FakeFileStore(),
        clock: fixedClock,
        newId,
      });
      await other.backup.restore(backup.content);
      expect(await other.ledger.getBalance(ali.id, 'USD')).toBe(3000);
      expect(await other.ledger.getBalance(sara.id, 'USD')).toBe(-5000);
      expect(
        (
          await other.ledger.getTransaction(
            (await other.queries.transactions({ debts: 'only' }))[0]?.id ?? '',
          )
        )?.debtAction,
      ).toBe('lend');
      const restoredSara = await otherRepos.accounts.getById(sara.id);
      expect(restoredSara).toMatchObject({ accountClass: 'person', dueDate: '2026-11-15' });
      await otherRepos.driver.close();
    });
  });

  describe('upgrading an existing ledger', () => {
    it('migrates a version 1 database without losing anything', async () => {
      const driver = await makeDriver();
      const first = MIGRATIONS[0];
      if (!first) throw new Error('missing migration');
      await driver.exec('PRAGMA foreign_keys = ON');
      await driver.transaction(async (tx) => {
        for (const statement of first.statements) await tx.exec(statement);
        await tx.exec('PRAGMA user_version = 1');
        await tx.run(
          "INSERT INTO accounts (id, name, kind, icon, color, sort_order, created_at, archived_at) VALUES ('a1', 'Pocket', 'pocket', 'wallet', '#000', 0, '2026-01-01T00:00:00.000Z', NULL)",
        );
        await tx.run(
          "INSERT INTO transactions (id, kind, posted_date, category_id, note, created_at, updated_at, deleted_at) VALUES ('t1', 'opening', '2026-01-01', NULL, '', 'x', 'x', NULL)",
        );
        await tx.run(
          "INSERT INTO ledger_lines (id, transaction_id, account_id, currency, amount_minor, role) VALUES ('l1', 't1', 'a1', 'USD', 4200, 'main')",
        );
      });
      const upgraded = await initializeDatabase(driver);
      const version = await driver.get<{ user_version: number }>('PRAGMA user_version');
      expect(version?.user_version).toBe(CURRENT_SCHEMA_VERSION);
      const account = await upgraded.accounts.getById('a1');
      expect(account).toMatchObject({ accountClass: 'money', note: '', dueDate: null });
      expect((await upgraded.transactions.getById('t1'))?.debtAction).toBeNull();
      expect(await upgraded.reports.balances()).toEqual([
        { accountId: 'a1', currency: 'USD', balanceMinor: 4200 },
      ]);
      await driver.close();
    });

    it('restores a backup made before people existed', async () => {
      await onboard();
      const legacy = JSON.parse((await services.backup.create()).content);
      legacy.schemaVersion = 1;
      for (const row of legacy.tables.accounts) {
        delete row.account_class;
        delete row.note;
        delete row.due_date;
      }
      for (const row of legacy.tables.transactions) delete row.debt_action;
      await services.backup.restore(JSON.stringify(legacy));
      const accounts = await repos.accounts.list();
      expect(accounts.every((account) => account.accountClass === 'money')).toBe(true);
      expect((await services.queries.home()).totals.USD).toBe(100000);
    });
  });

  describe('reminder planning', () => {
    class FakeScheduler implements ReminderScheduler {
      scheduled: ReminderPlan[] = [];
      cancelled: string[] = [];
      granted = true;
      async ensurePermission() {
        return this.granted;
      }
      async schedule(plan: ReminderPlan) {
        this.scheduled.push(plan);
      }
      async cancel(identifier: string) {
        this.cancelled.push(identifier);
      }
    }

    it('plans a nightly reminder that mentions waiting receipts', () => {
      const plan = planReminder(
        { reminderEnabled: true, reminderHour: 21, reminderMinute: 30, userName: '' },
        2,
      );
      expect(plan).toMatchObject({ identifier: REMINDER_IDENTIFIER, hour: 21, minute: 30 });
      expect(plan?.body).toContain('2 receipts');
      expect(
        planReminder(
          { reminderEnabled: false, reminderHour: 21, reminderMinute: 0, userName: '' },
          0,
        ),
      ).toBeNull();
    });

    it('schedules only when the plan changed and cancels when disabled or denied', async () => {
      const scheduler = new FakeScheduler();
      const plan = planReminder(
        { reminderEnabled: true, reminderHour: 20, reminderMinute: 0, userName: 'Taha' },
        0,
      );
      const first = await syncReminder(scheduler, plan, '');
      expect(scheduler.scheduled).toHaveLength(1);
      expect(first.signature).not.toBe('');

      await syncReminder(scheduler, plan, first.signature);
      expect(scheduler.scheduled).toHaveLength(1);

      await syncReminder(scheduler, null, first.signature);
      expect(scheduler.cancelled).toContain(REMINDER_IDENTIFIER);

      scheduler.granted = false;
      const denied = await syncReminder(scheduler, plan, '');
      expect(denied.permissionDenied).toBe(true);
      expect(scheduler.scheduled).toHaveLength(1);
    });
  });
});

describe('backup reminder', () => {
  it('is due only after a week of use and a month without a backup', () => {
    const account = {
      id: 'a',
      name: 'Pocket',
      kind: 'pocket' as const,
      accountClass: 'money' as const,
      icon: 'wallet',
      color: '#000',
      sortOrder: 0,
      note: '',
      dueDate: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      archivedAt: null,
    };
    expect(isBackupDue([], '', new Date('2026-12-01T00:00:00Z'))).toBe(false);
    expect(isBackupDue([account], '', new Date('2026-10-05T00:00:00Z'))).toBe(false);
    expect(isBackupDue([account], '', new Date('2026-10-09T00:00:00Z'))).toBe(true);
    expect(
      isBackupDue([account], '2026-10-20T00:00:00.000Z', new Date('2026-11-10T00:00:00Z')),
    ).toBe(false);
    expect(
      isBackupDue([account], '2026-10-20T00:00:00.000Z', new Date('2026-11-25T00:00:00Z')),
    ).toBe(true);
  });
});
