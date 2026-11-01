import type { CurrencyCode } from './currency';
import { type IsoDate, isValidIsoDate } from './dates';
import { isMinorUnits, type MinorUnits } from './money';

export type AccountKind = 'safe' | 'pocket' | 'bank' | 'other';

/**
 * Money accounts hold your own money (safe, pocket, bank). Person accounts
 * track what someone owes you (positive balance) or what you owe them
 * (negative balance).
 */
export type AccountClass = 'money' | 'person';

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  accountClass: AccountClass;
  icon: string;
  color: string;
  sortOrder: number;
  /** Free text, used for people (phone number, how you know them). */
  note: string;
  /** For people: the date the balance is expected to be settled. */
  dueDate: IsoDate | null;
  createdAt: string;
  archivedAt: string | null;
};

/**
 * What happened with a person. Lend and repay move money from your account
 * to the person; borrow and collect move money from the person to your account.
 */
export type DebtAction = 'lend' | 'borrow' | 'collect' | 'repay';

export const DEBT_ACTIONS: readonly DebtAction[] = ['lend', 'borrow', 'collect', 'repay'];

/** True when the action moves money out of your account towards the person. */
export function debtGoesToPerson(action: DebtAction): boolean {
  return action === 'lend' || action === 'repay';
}

export type CategoryKind = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  archivedAt: string | null;
};

export type TransactionKind = 'expense' | 'income' | 'transfer' | 'opening' | 'adjustment';

export type LineRole = 'main' | 'source' | 'destination';

export type LedgerLine = {
  id: string;
  transactionId: string;
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  role: LineRole;
};

export type LineInput = Omit<LedgerLine, 'id' | 'transactionId'>;

export type Transaction = {
  id: string;
  kind: TransactionKind;
  /** Set on transfers between your account and a person. */
  debtAction: DebtAction | null;
  postedDate: IsoDate;
  categoryId: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TransactionWithLines = Transaction & { lines: LedgerLine[] };

export const NOTE_MAX_LENGTH = 500;

/** Kinds that count toward income and expense reports. */
export const REPORTABLE_KINDS: ReadonlySet<TransactionKind> = new Set(['expense', 'income']);

export type ExpenseDraft = {
  kind: 'expense';
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  categoryId: string;
  postedDate: IsoDate;
  note: string;
};

export type IncomeDraft = {
  kind: 'income';
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  categoryId: string;
  postedDate: IsoDate;
  note: string;
};

export type TransferDraft = {
  kind: 'transfer';
  fromAccountId: string;
  toAccountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  /** When set to a different currency this transfer is an exchange. */
  toCurrency?: CurrencyCode;
  /** Required for exchanges: the amount received in `toCurrency`. */
  toAmountMinor?: MinorUnits;
  postedDate: IsoDate;
  note: string;
};

/** Money exchanged with a person: lending, borrowing and paying back. */
export type DebtDraft = {
  kind: 'debt';
  action: DebtAction;
  personId: string;
  /** Your money account the cash comes from or goes into. */
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  postedDate: IsoDate;
  note: string;
};

/** Signed system entries: opening balances and reconciliation adjustments. */
export type SignedDraft = {
  kind: 'opening' | 'adjustment';
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  postedDate: IsoDate;
  note: string;
};

export type TransactionDraft = ExpenseDraft | IncomeDraft | TransferDraft | DebtDraft | SignedDraft;

export type DraftErrorCode =
  | 'amount_required'
  | 'amount_not_positive'
  | 'amount_zero'
  | 'amount_invalid'
  | 'account_required'
  | 'account_unknown'
  | 'account_archived'
  | 'same_account'
  | 'category_required'
  | 'category_unknown'
  | 'category_kind_mismatch'
  | 'category_archived'
  | 'currency_unknown'
  | 'exchange_amount_required'
  | 'person_required'
  | 'not_a_person'
  | 'person_not_allowed'
  | 'debt_action_invalid'
  | 'date_invalid'
  | 'note_too_long';

export type DraftError = { field: string; code: DraftErrorCode; message: string };

export type DraftContext = {
  accounts: ReadonlyMap<string, Account>;
  categories: ReadonlyMap<string, Category>;
  currencies: ReadonlySet<CurrencyCode>;
};

export type DraftValidation =
  | {
      ok: true;
      lines: LineInput[];
      categoryId: string | null;
      /** The kind stored in the ledger; debts are stored as transfers. */
      kind: TransactionKind;
      debtAction: DebtAction | null;
    }
  | { ok: false; errors: DraftError[] };

export class LedgerError extends Error {
  readonly errors: DraftError[];

  constructor(errors: DraftError[]) {
    super(errors.map((error) => error.message).join(' '));
    this.name = 'LedgerError';
    this.errors = errors;
  }
}

function checkAccount(
  context: DraftContext,
  accountId: string,
  field: string,
  errors: DraftError[],
): Account | null {
  if (!accountId) {
    errors.push({ field, code: 'account_required', message: 'Choose an account.' });
    return null;
  }
  const account = context.accounts.get(accountId);
  if (!account) {
    errors.push({ field, code: 'account_unknown', message: 'That account no longer exists.' });
    return null;
  }
  if (account.archivedAt) {
    errors.push({ field, code: 'account_archived', message: `${account.name} is archived.` });
  }
  return account;
}

function checkCurrency(
  context: DraftContext,
  currency: string,
  field: string,
  errors: DraftError[],
): void {
  if (!context.currencies.has(currency)) {
    errors.push({ field, code: 'currency_unknown', message: `${currency} is not set up.` });
  }
}

function checkPositiveAmount(amount: unknown, field: string, errors: DraftError[]): void {
  if (!isMinorUnits(amount)) {
    errors.push({ field, code: 'amount_invalid', message: 'Enter a valid amount.' });
    return;
  }
  if (amount <= 0) {
    errors.push({ field, code: 'amount_not_positive', message: 'Enter an amount above zero.' });
  }
}

function checkSignedAmount(amount: unknown, field: string, errors: DraftError[]): void {
  if (!isMinorUnits(amount)) {
    errors.push({ field, code: 'amount_invalid', message: 'Enter a valid amount.' });
    return;
  }
  if (amount === 0) {
    errors.push({ field, code: 'amount_zero', message: 'The amount cannot be zero.' });
  }
}

function checkCategory(
  context: DraftContext,
  categoryId: string,
  kind: CategoryKind,
  errors: DraftError[],
): void {
  if (!categoryId) {
    errors.push({ field: 'categoryId', code: 'category_required', message: 'Pick a category.' });
    return;
  }
  const category = context.categories.get(categoryId);
  if (!category) {
    errors.push({
      field: 'categoryId',
      code: 'category_unknown',
      message: 'That category no longer exists.',
    });
    return;
  }
  if (category.kind !== kind) {
    errors.push({
      field: 'categoryId',
      code: 'category_kind_mismatch',
      message: `${category.name} is not a${kind === 'income' ? 'n income' : 'n expense'} category.`,
    });
  }
  if (category.archivedAt) {
    errors.push({
      field: 'categoryId',
      code: 'category_archived',
      message: `${category.name} is archived.`,
    });
  }
}

function checkCommon(draft: TransactionDraft, errors: DraftError[]): void {
  if (!isValidIsoDate(draft.postedDate)) {
    errors.push({ field: 'postedDate', code: 'date_invalid', message: 'Pick a valid date.' });
  }
  if (draft.note.length > NOTE_MAX_LENGTH) {
    errors.push({
      field: 'note',
      code: 'note_too_long',
      message: `Notes are limited to ${NOTE_MAX_LENGTH} characters.`,
    });
  }
}

/**
 * Validates a draft against the current accounts, categories and currencies
 * and produces the ledger lines that implement it. Sign conventions:
 * income and incoming transfers are positive, expenses and outgoing transfers
 * are negative, and same-currency transfers always sum to zero.
 */
export function validateDraft(draft: TransactionDraft, context: DraftContext): DraftValidation {
  const errors: DraftError[] = [];
  checkCommon(draft, errors);

  switch (draft.kind) {
    case 'expense':
    case 'income': {
      checkAccount(context, draft.accountId, 'accountId', errors);
      checkCurrency(context, draft.currency, 'currency', errors);
      checkPositiveAmount(draft.amountMinor, 'amountMinor', errors);
      checkCategory(context, draft.categoryId, draft.kind, errors);
      if (errors.length > 0) return { ok: false, errors };
      const signed = draft.kind === 'expense' ? -draft.amountMinor : draft.amountMinor;
      return {
        ok: true,
        kind: draft.kind,
        debtAction: null,
        categoryId: draft.categoryId,
        lines: [
          {
            accountId: draft.accountId,
            currency: draft.currency,
            amountMinor: signed,
            role: 'main',
          },
        ],
      };
    }
    case 'transfer': {
      const from = checkAccount(context, draft.fromAccountId, 'fromAccountId', errors);
      const to = checkAccount(context, draft.toAccountId, 'toAccountId', errors);
      for (const [account, field] of [
        [from, 'fromAccountId'],
        [to, 'toAccountId'],
      ] as const) {
        if (account?.accountClass === 'person') {
          errors.push({
            field,
            code: 'person_not_allowed',
            message: `Use Debt to move money to or from ${account.name}.`,
          });
        }
      }
      if (draft.fromAccountId && draft.fromAccountId === draft.toAccountId) {
        errors.push({
          field: 'toAccountId',
          code: 'same_account',
          message: 'Choose two different accounts.',
        });
      }
      checkCurrency(context, draft.currency, 'currency', errors);
      checkPositiveAmount(draft.amountMinor, 'amountMinor', errors);
      const toCurrency = draft.toCurrency ?? draft.currency;
      const isExchange = toCurrency !== draft.currency;
      let toAmount = draft.amountMinor;
      if (isExchange) {
        checkCurrency(context, toCurrency, 'toCurrency', errors);
        if (draft.toAmountMinor === undefined) {
          errors.push({
            field: 'toAmountMinor',
            code: 'exchange_amount_required',
            message: `Enter the amount received in ${toCurrency}.`,
          });
        } else {
          checkPositiveAmount(draft.toAmountMinor, 'toAmountMinor', errors);
          toAmount = draft.toAmountMinor;
        }
      }
      if (errors.length > 0) return { ok: false, errors };
      return {
        ok: true,
        kind: 'transfer',
        debtAction: null,
        categoryId: null,
        lines: [
          {
            accountId: draft.fromAccountId,
            currency: draft.currency,
            amountMinor: -draft.amountMinor,
            role: 'source',
          },
          {
            accountId: draft.toAccountId,
            currency: toCurrency,
            amountMinor: toAmount,
            role: 'destination',
          },
        ],
      };
    }
    case 'debt': {
      if (!DEBT_ACTIONS.includes(draft.action)) {
        errors.push({
          field: 'action',
          code: 'debt_action_invalid',
          message: 'Choose what happened.',
        });
      }
      if (!draft.personId) {
        errors.push({ field: 'personId', code: 'person_required', message: 'Choose a person.' });
      } else {
        const person = checkAccount(context, draft.personId, 'personId', errors);
        if (person && person.accountClass !== 'person') {
          errors.push({ field: 'personId', code: 'not_a_person', message: 'Choose a person.' });
        }
      }
      const account = checkAccount(context, draft.accountId, 'accountId', errors);
      if (account?.accountClass === 'person') {
        errors.push({
          field: 'accountId',
          code: 'person_not_allowed',
          message: 'Choose your own account for the money.',
        });
      }
      checkCurrency(context, draft.currency, 'currency', errors);
      checkPositiveAmount(draft.amountMinor, 'amountMinor', errors);
      if (errors.length > 0) return { ok: false, errors };
      const toPerson = debtGoesToPerson(draft.action);
      const moneyLine: LineInput = {
        accountId: draft.accountId,
        currency: draft.currency,
        amountMinor: toPerson ? -draft.amountMinor : draft.amountMinor,
        role: toPerson ? 'source' : 'destination',
      };
      const personLine: LineInput = {
        accountId: draft.personId,
        currency: draft.currency,
        amountMinor: toPerson ? draft.amountMinor : -draft.amountMinor,
        role: toPerson ? 'destination' : 'source',
      };
      return {
        ok: true,
        kind: 'transfer',
        debtAction: draft.action,
        categoryId: null,
        lines: toPerson ? [moneyLine, personLine] : [personLine, moneyLine],
      };
    }
    case 'opening':
    case 'adjustment': {
      checkAccount(context, draft.accountId, 'accountId', errors);
      checkCurrency(context, draft.currency, 'currency', errors);
      checkSignedAmount(draft.amountMinor, 'amountMinor', errors);
      if (errors.length > 0) return { ok: false, errors };
      return {
        ok: true,
        kind: draft.kind,
        debtAction: null,
        categoryId: null,
        lines: [
          {
            accountId: draft.accountId,
            currency: draft.currency,
            amountMinor: draft.amountMinor,
            role: 'main',
          },
        ],
      };
    }
  }
}

export function assertValidDraft(draft: TransactionDraft, context: DraftContext) {
  const result = validateDraft(draft, context);
  if (!result.ok) throw new LedgerError(result.errors);
  return result;
}

/** Same-currency transfers must net to zero; exchanges carry two currencies. */
export function isBalancedTransfer(lines: readonly Pick<LedgerLine, 'currency' | 'amountMinor'>[]) {
  if (lines.length !== 2) return false;
  const [source, destination] = lines as [LedgerLine, LedgerLine];
  if (source.currency !== destination.currency) {
    return source.amountMinor < 0 && destination.amountMinor > 0;
  }
  return source.amountMinor + destination.amountMinor === 0;
}

/** Converts a stored transaction back into an editable draft. */
export function draftFromTransaction(transaction: TransactionWithLines): TransactionDraft | null {
  const { kind, postedDate, note, lines } = transaction;
  if (kind === 'expense' || kind === 'income') {
    const line = lines[0];
    if (!line || !transaction.categoryId) return null;
    return {
      kind,
      accountId: line.accountId,
      currency: line.currency,
      amountMinor: Math.abs(line.amountMinor),
      categoryId: transaction.categoryId,
      postedDate,
      note,
    };
  }
  if (kind === 'transfer' && transaction.debtAction) {
    const source = lines.find((line) => line.role === 'source');
    const destination = lines.find((line) => line.role === 'destination');
    if (!source || !destination) return null;
    const toPerson = debtGoesToPerson(transaction.debtAction);
    const personLine = toPerson ? destination : source;
    const moneyLine = toPerson ? source : destination;
    return {
      kind: 'debt',
      action: transaction.debtAction,
      personId: personLine.accountId,
      accountId: moneyLine.accountId,
      currency: personLine.currency,
      amountMinor: Math.abs(personLine.amountMinor),
      postedDate,
      note,
    };
  }
  if (kind === 'transfer') {
    const source = lines.find((line) => line.role === 'source');
    const destination = lines.find((line) => line.role === 'destination');
    if (!source || !destination) return null;
    const isExchange = source.currency !== destination.currency;
    return {
      kind,
      fromAccountId: source.accountId,
      toAccountId: destination.accountId,
      currency: source.currency,
      amountMinor: Math.abs(source.amountMinor),
      ...(isExchange
        ? { toCurrency: destination.currency, toAmountMinor: destination.amountMinor }
        : {}),
      postedDate,
      note,
    };
  }
  const line = lines[0];
  if (!line) return null;
  return {
    kind,
    accountId: line.accountId,
    currency: line.currency,
    amountMinor: line.amountMinor,
    postedDate,
    note,
  };
}

/** Balances per account and currency derived purely from active ledger lines. */
export function computeBalances(
  lines: Iterable<Pick<LedgerLine, 'accountId' | 'currency' | 'amountMinor'>>,
): Map<string, Map<CurrencyCode, MinorUnits>> {
  const balances = new Map<string, Map<CurrencyCode, MinorUnits>>();
  for (const line of lines) {
    let perCurrency = balances.get(line.accountId);
    if (!perCurrency) {
      perCurrency = new Map();
      balances.set(line.accountId, perCurrency);
    }
    perCurrency.set(line.currency, (perCurrency.get(line.currency) ?? 0) + line.amountMinor);
  }
  return balances;
}
