# Data model

SQLite database `pocket-ledger.db` in the app's default database directory. Schema version is tracked with `PRAGMA user_version`; migrations live in `src/data/schema.ts` and run inside transactions.

## Tables

### settings

Key/value strings. Keys: `onboarding_completed`, `currencies` (JSON array, primary first), `user_name`, `reminder_enabled`, `reminder_hour`, `reminder_minute`, `theme`, `app_lock_enabled`, `reminder_signature`.

### accounts

`id`, `name`, `kind` (`safe` | `pocket` | `bank` | `other`), `icon`, `color`, `sort_order`, `created_at`, `archived_at`. An account holds balances in any currency; balances are never stored.

Added in schema version 2: `account_class` (`money` | `person`, default `money`), `note` (text, default empty) and `due_date` (`YYYY-MM-DD` or null, the date a person's balance should be settled). People use `kind = 'other'` and `icon = 'person'`.

### categories

`id`, `name`, `kind` (`expense` | `income`), `icon`, `color`, `sort_order`, `is_system`, `archived_at`. Default categories are seeded once on first launch.

### transactions

`id`, `kind` (`expense` | `income` | `transfer` | `opening` | `adjustment`), `posted_date` (`YYYY-MM-DD`, local calendar), `category_id` (nullable), `note`, `created_at`, `updated_at`, `deleted_at` (soft delete).

Added in schema version 2: `debt_action` (`lend` | `borrow` | `collect` | `repay`, null otherwise). Debts are stored with `kind = 'transfer'` so every transfer rule and report exclusion applies unchanged.

### ledger_lines

`id`, `transaction_id` (cascade delete), `account_id`, `currency` (ISO code), `amount_minor` (signed integer), `role` (`main` | `source` | `destination`).

- Expense: one `main` line, negative. Income: one `main` line, positive.
- Transfer: `source` negative and `destination` positive in the same currency, summing to zero.
- Exchange: a transfer whose `destination` line is in the other currency with its own amount.
- Opening balance and adjustment: one signed `main` line.

### receipts

`id`, `file_name` (inside `Documents/receipts`), `width`, `height`, `note`, `captured_at`, `transaction_id` (nullable; null means "needs an amount"), `deleted_at`.

## Migrations

| Version | Change                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Initial schema                                                                                                                                                                                                           |
| 2       | People and debts: `accounts.account_class`, `accounts.note`, `accounts.due_date`, `transactions.debt_action`, index on `account_class`. Additive `ALTER TABLE` only; existing rows keep their data and get the defaults. |

Backups made with schema version 1 restore into version 2 with the same defaults.

## Derived values

- Balance per account and currency = `SUM(amount_minor)` of lines whose transaction is not soft-deleted.
- Reports count only `expense` and `income` transactions, grouped by currency; transfers, exchanges, opening balances and adjustments are excluded.
- Receipts listed as "recorded" are those linked to a non-deleted transaction.

## Money

Amounts are integers in minor units. Fraction digits per currency are defined in `src/domain/currency.ts` and follow everyday use (for example IQD is stored and shown with 0 digits, KWD with 3). Parsing and formatting never use floating point.

## Timestamps and dates

`created_at`, `updated_at`, `deleted_at`, `captured_at` and `archived_at` are UTC ISO 8601 strings. `posted_date` is a date-only string in the user's local calendar; month filters compare strings.

## Storage locations

| Platform         | Database                                                                                | Receipt photos                                  |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Native iOS build | `pocket-ledger.db` via expo-sqlite (WAL)                                                | `Documents/receipts/<id>.<ext>`                 |
| iPhone web app   | sql.js in memory, snapshot in IndexedDB `pocket-ledger` / `snapshots` / `ledger.sqlite` | Cache Storage `pocket-ledger-receipts-v1`, JPEG |

## Backup file

`pocket-ledger-backup-YYYY-MM-DD.json` holds `format`, `version` (1), `schemaVersion`, `exportedAt`, every row of every table, and receipt photos as base64 keyed by file name. Restore validates the format, version, schema version, column types and file names, then replaces all tables in one transaction with foreign keys enforced; any invalid row leaves the ledger untouched. The `last_backup_at` setting records when a backup file was last saved.
