# Product specification

## Product statement

Pocket Ledger is a single-user, offline-first bookkeeping application for iOS and Android. It helps a person understand money held in wallets and money owed on credit cards without creating a bank connection or online identity. The working name may change and is centralized in code.

## Product principles

1. The ledger is authoritative; balances are explainable and rebuildable.
2. Financial data stays local unless the user explicitly exports or backs it up.
3. The app is useful without internet access after installation.
4. The interface uses friendly language such as “Wallet” while preserving accounting correctness.
5. Empty, loading, error, and unavailable states are honest. No sample data appears to be the user's data.
6. Different currencies are never combined into a misleading total.
7. Destructive and multi-record actions are deliberate, recoverable where practical, and atomic.

## Target user and jobs

The MVP serves an individual who manually tracks cash, bank balances, stored-value services, and credit cards. Core jobs are:

- Create and organize wallets.
- Record expenses, income, same-currency transfers, and balance adjustments.
- Understand each wallet's ledger-derived balance and credit-card amount owed.
- Find, filter, correct, soft-delete, and restore transactions.
- Reconcile recorded and actual balances without rewriting history.
- See monthly income, expense, category, wallet, and cash-flow summaries.
- Receive private local reminders.
- export transactions and create/restore a complete local backup.
- Optionally require device authentication when opening or resuming the app.

## Scope

### Wallets

Wallet types are `CASH`, `BANK`, `STORED_VALUE`, and `CREDIT_CARD`. A debit card represents access to a `BANK` wallet, not a second pool of money. Stored value includes prepaid cards, PayPal-like balances, and mobile money. Wallets with history are archived rather than destructively deleted.

### Transactions

User-visible transaction types are `EXPENSE`, `INCOME`, `TRANSFER`, and `ADJUSTMENT`. Opening balances use a separate internal transaction type. Transfers do not represent real money movement; they record movement the user says occurred elsewhere. Same-currency transfers only are supported in the MVP.

### Currency

Onboarding selects a default ISO 4217 currency. Every wallet and line stores its currency code. Amounts use integer minor units and currency-specific fraction digits. A future import may introduce multiple currencies, so every total is grouped by currency.

### Primary navigation

- **Dashboard:** balances grouped by currency, wallet cards, amount owed, current-month income/expense, recents, and Add Transaction.
- **Activity:** posting-date groups, search, combined filters, details, edit, delete, and undo.
- **Reports:** monthly income/expense, expense by category, wallet balances, and cash-flow trend.
- **Settings:** wallets, categories, reminder, default-currency display, export, backup/restore, app lock, privacy, and guarded local reset.

### Entry priorities

Fast expense entry orders amount, wallet, category, then save. Posting date, payee, and note are optional. Transfer entry orders source, destination, amount, optional fee, posting date, note, then save; source and destination cannot match.

## Explicit non-goals

The MVP does not connect to banks, store online-banking credentials, move money, process payments, require accounts or a backend, show advertising, perform behavioral analytics, upload financial data, convert currencies, or imply that a recorded transfer initiated a bank transfer.

## Experience and accessibility requirements

- Minimum 48-point/dp interactive targets where practical.
- Screen-reader names for icons and controls; decorative icons are hidden.
- Dynamic text without clipped primary actions on small phones.
- Light and dark themes using centralized tokens.
- Transaction meaning communicated by text/sign as well as color.
- Private notification bodies without balances or amounts by default.
- Confirmation for destructive actions and submission guards for duplicate taps.
- Understandable errors without stack traces or raw database messages.

## Data portability

CSV is a user-readable transaction export. JSON backup is a versioned, complete, validated representation of wallets, categories, ledger relationships, settings, and reminders. Restore is all-or-nothing and preserves stable local IDs. Exported files and backups are sensitive and are not claimed to be encrypted.

## Refund treatment for the MVP

Until linked refunds exist, a refund is recorded as `INCOME` using a clearly named Refund category. It therefore appears in income reports rather than reducing the original expense category. This limitation is disclosed in the UI/report documentation when transaction entry is implemented. Linked expense reversals remain backlog work.

## Success criteria

- A user can reconstruct why every wallet has its displayed balance.
- Required daily entry works fully offline and survives restart.
- The canonical accounting regression scenario and all invariants pass.
- No half-transfer or partial restore can be observed.
- Export and backup allow users to leave with their data.
- Privacy claims match actual implementation and platform behavior.
