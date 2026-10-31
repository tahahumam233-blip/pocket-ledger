import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { initializeDatabase, type Repositories } from '@/data';
import { LedgerError } from '@/domain';
import { createNodeSqliteDriver } from '@/test/node-sqlite-driver';

import { type AppServices, createAppServices } from './index';
import type { ReceiptFileStore, ReminderPlan, ReminderScheduler } from './ports';
import { planReminder, REMINDER_IDENTIFIER, syncReminder } from './reminder';

class FakeFileStore implements ReceiptFileStore {
  files = new Map<string, string>();
  async persist(sourceUri: string, fileName: string) {
    this.files.set(fileName, sourceUri);
  }
  async remove(fileName: string) {
    this.files.delete(fileName);
  }
  uriFor(fileName: string) {
    return `file:///receipts/${fileName}`;
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

beforeEach(async () => {
  counter = 0;
  repos = await initializeDatabase(createNodeSqliteDriver());
  files = new FakeFileStore();
  services = createAppServices({ repos, files, clock: fixedClock, newId });
});

afterEach(async () => {
  await repos.driver.close();
});

describe('database setup', () => {
  it('migrates once and is idempotent', async () => {
    const version = await repos.driver.get<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(1);
    await initializeDatabase(repos.driver);
    expect(
      (await repos.driver.get<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(1);
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
    expect(report.summary.expenseByCategory[0]).toMatchObject({ categoryId: food.id, total: 2000 });
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
