import type { Repositories } from '@/data';
import {
  type Account,
  type AccountKind,
  type Category,
  type CategoryKind,
  createId,
  type CurrencyCode,
  DEFAULT_CATEGORY_TEMPLATES,
  type IsoDate,
  type MinorUnits,
  nowTimestamp,
  todayIsoDate,
} from '@/domain';

import type { LedgerService } from './ledger-service';
import type { Clock, IdGenerator } from './ports';
import { type AppSettings, parseSettings, serializeSettings } from './settings';

export type OnboardingAccountInput = {
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  /** Opening balance per currency; omitted or zero means nothing is recorded. */
  openingBalances: Partial<Record<CurrencyCode, MinorUnits>>;
};

export type OnboardingInput = {
  currencies: [CurrencyCode, CurrencyCode];
  userName?: string;
  accounts: OnboardingAccountInput[];
  reminder: { enabled: boolean; hour: number; minute: number };
  openingDate?: IsoDate;
};

export function createSetupService(deps: {
  repos: Repositories;
  ledger: LedgerService;
  clock?: Clock;
  newId?: IdGenerator;
}) {
  const { repos, ledger } = deps;
  const now = () => deps.clock?.now() ?? new Date();
  const id = deps.newId ?? ((prefix: string) => createId(prefix));

  async function seedCategoriesIfEmpty(): Promise<void> {
    if ((await repos.categories.count()) > 0) return;
    await repos.driver.transaction(async (tx) => {
      let order = 0;
      for (const template of DEFAULT_CATEGORY_TEMPLATES) {
        const category: Category = {
          id: id('cat'),
          name: template.name,
          kind: template.kind,
          icon: template.icon,
          color: template.color,
          sortOrder: order,
          isSystem: template.key.startsWith('other'),
          archivedAt: null,
        };
        order += 1;
        await repos.categories.insert(category, tx);
      }
    });
  }

  return {
    seedCategoriesIfEmpty,

    async getSettings(): Promise<AppSettings> {
      return parseSettings(await repos.settings.getAll());
    },

    async updateSettings(changes: Partial<AppSettings>): Promise<AppSettings> {
      await repos.settings.setMany(serializeSettings(changes));
      return this.getSettings();
    },

    /** Creates accounts, seeds categories, records opening balances and saves preferences. */
    async completeOnboarding(input: OnboardingInput): Promise<void> {
      if (input.accounts.length === 0) throw new Error('Add at least one account.');
      const [primary, secondary] = input.currencies;
      if (primary === secondary) throw new Error('Choose two different currencies.');
      await seedCategoriesIfEmpty();

      const timestamp = nowTimestamp(now());
      const accounts: Account[] = input.accounts.map((account, index) => ({
        id: id('acct'),
        name: account.name.trim() || account.kind,
        kind: account.kind,
        icon: account.icon,
        color: account.color,
        sortOrder: index,
        createdAt: timestamp,
        archivedAt: null,
      }));

      await repos.driver.transaction(async (tx) => {
        for (const account of accounts) await repos.accounts.insert(account, tx);
        await repos.settings.setMany(
          serializeSettings({
            currencies: [primary, secondary],
            userName: input.userName?.trim() ?? '',
            reminderEnabled: input.reminder.enabled,
            reminderHour: input.reminder.hour,
            reminderMinute: input.reminder.minute,
          }),
          tx,
        );
      });

      const context = await ledger.loadContext();
      const openingDate = input.openingDate ?? todayIsoDate(now());
      for (const [index, account] of accounts.entries()) {
        const balances = input.accounts[index]?.openingBalances ?? {};
        for (const currency of input.currencies) {
          const amount = balances[currency] ?? 0;
          if (amount === 0) continue;
          await ledger.setOpeningBalance({
            accountId: account.id,
            currency,
            amountMinor: amount,
            postedDate: openingDate,
            context,
          });
        }
      }

      await repos.settings.setMany(serializeSettings({ onboardingCompleted: true }));
    },

    async createAccount(input: {
      name: string;
      kind: AccountKind;
      icon: string;
      color: string;
    }): Promise<Account> {
      const existing = await repos.accounts.list({ includeArchived: true });
      const account: Account = {
        id: id('acct'),
        name: input.name.trim(),
        kind: input.kind,
        icon: input.icon,
        color: input.color,
        sortOrder: existing.length,
        createdAt: nowTimestamp(now()),
        archivedAt: null,
      };
      if (!account.name) throw new Error('Give the account a name.');
      await repos.accounts.insert(account);
      return account;
    },

    async updateAccount(
      accountId: string,
      changes: Partial<Pick<Account, 'name' | 'kind' | 'icon' | 'color' | 'sortOrder'>>,
    ): Promise<void> {
      if (changes.name !== undefined && !changes.name.trim()) {
        throw new Error('Give the account a name.');
      }
      await repos.accounts.update(accountId, {
        ...changes,
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      });
    },

    /** Accounts with history are archived (kept for reports); unused ones are removed. */
    async removeAccount(accountId: string): Promise<'deleted' | 'archived'> {
      const active = (await repos.accounts.list()).filter((account) => account.id !== accountId);
      if (active.length === 0) throw new Error('Keep at least one account.');
      if (await repos.accounts.deleteIfUnused(accountId)) return 'deleted';
      await repos.accounts.setArchived(accountId, nowTimestamp(now()));
      return 'archived';
    },

    async restoreAccount(accountId: string): Promise<void> {
      await repos.accounts.setArchived(accountId, null);
    },

    async createCategory(input: {
      name: string;
      kind: CategoryKind;
      icon: string;
      color: string;
    }): Promise<Category> {
      const existing = await repos.categories.list({ includeArchived: true });
      const category: Category = {
        id: id('cat'),
        name: input.name.trim(),
        kind: input.kind,
        icon: input.icon,
        color: input.color,
        sortOrder: existing.length,
        isSystem: false,
        archivedAt: null,
      };
      if (!category.name) throw new Error('Give the category a name.');
      await repos.categories.insert(category);
      return category;
    },

    async updateCategory(
      categoryId: string,
      changes: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sortOrder'>>,
    ): Promise<void> {
      if (changes.name !== undefined && !changes.name.trim()) {
        throw new Error('Give the category a name.');
      }
      await repos.categories.update(categoryId, {
        ...changes,
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      });
    },

    async removeCategory(categoryId: string): Promise<'deleted' | 'archived'> {
      if (await repos.categories.deleteIfUnused(categoryId)) return 'deleted';
      await repos.categories.setArchived(categoryId, nowTimestamp(now()));
      return 'archived';
    },

    async restoreCategory(categoryId: string): Promise<void> {
      await repos.categories.setArchived(categoryId, null);
    },

    /**
     * Swaps one of the two currencies. A currency that already appears in the
     * ledger cannot be replaced, because that would orphan history.
     */
    async replaceCurrency(previous: CurrencyCode, next: CurrencyCode): Promise<AppSettings> {
      const settings = await this.getSettings();
      if (!settings.currencies.includes(previous)) throw new Error('That currency is not set up.');
      if (settings.currencies.includes(next))
        throw new Error(`${next} is already one of your currencies.`);
      if (await repos.transactions.currencyHasHistory(previous)) {
        throw new Error(`${previous} already has transactions, so it cannot be replaced.`);
      }
      const currencies = settings.currencies.map((code) => (code === previous ? next : code));
      return this.updateSettings({ currencies });
    },

    async setPrimaryCurrency(code: CurrencyCode): Promise<AppSettings> {
      const settings = await this.getSettings();
      if (!settings.currencies.includes(code)) throw new Error('That currency is not set up.');
      const currencies = [code, ...settings.currencies.filter((other) => other !== code)];
      return this.updateSettings({ currencies });
    },

    /** Wipes every table so the app returns to onboarding. Receipt files are removed by the caller. */
    async eraseAllData(): Promise<void> {
      await repos.driver.transaction(async (tx) => {
        await tx.exec('DELETE FROM receipts');
        await tx.exec('DELETE FROM ledger_lines');
        await tx.exec('DELETE FROM transactions');
        await tx.exec('DELETE FROM categories');
        await tx.exec('DELETE FROM accounts');
        await tx.exec('DELETE FROM settings');
      });
    },
  };
}

export type SetupService = ReturnType<typeof createSetupService>;
