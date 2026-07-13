# Planned data model

No database is implemented in Phase 0. This document is the Phase 2 schema contract to validate during implementation.

## Global conventions

- SQLite foreign-key enforcement is enabled for every connection.
- IDs are locally generated stable UUID strings and are never regenerated during backup/restore.
- Money is a non-zero signed integer in minor units within JavaScript's safe-integer range. A zero reconciliation difference creates no transaction.
- ISO currency codes are uppercase three-letter strings. Domain validation owns supported-code and fraction-digit metadata.
- UTC timestamps are ISO 8601 text ending in `Z`; posting dates are validated `YYYY-MM-DD` text.
- Boolean values are integers constrained to `0` or `1`.
- User/business deletion is soft deletion or archival. Foreign-key delete actions protect against accidental physical deletion; hard deletion is reserved for transactional reset/restore maintenance.

## Tables

### `wallets`

| Column                     | Type and rule                                    |
| -------------------------- | ------------------------------------------------ |
| `id`                       | `TEXT PRIMARY KEY`                               |
| `name`                     | non-empty trimmed `TEXT`                         |
| `type`                     | `CASH`, `BANK`, `STORED_VALUE`, or `CREDIT_CARD` |
| `currency_code`            | uppercase ISO code                               |
| `icon_key`                 | nullable `TEXT` from an application allow-list   |
| `display_order`            | non-negative `INTEGER`                           |
| `archived_at`              | nullable UTC timestamp                           |
| `created_at`, `updated_at` | UTC timestamps                                   |

There is no mutable balance column. Active wallet names are unique case-insensitively within a currency; archived names may be reused. Useful indexes cover `(archived_at, display_order)` and `currency_code`.

### `categories`

| Column                     | Type and rule                                 |
| -------------------------- | --------------------------------------------- |
| `id`                       | `TEXT PRIMARY KEY`                            |
| `name`                     | non-empty trimmed `TEXT`                      |
| `type`                     | `INCOME` or `EXPENSE`                         |
| `parent_category_id`       | nullable self-reference, `ON DELETE RESTRICT` |
| `is_system`                | constrained boolean                           |
| `display_order`            | non-negative `INTEGER`                        |
| `archived_at`              | nullable UTC timestamp                        |
| `created_at`, `updated_at` | UTC timestamps                                |

The application rejects a parent of a different type, self-parenting, or cycles. Active sibling names are unique case-insensitively for `(type, parent)`. Indexes cover `(type, archived_at, display_order)` and `parent_category_id`.

### `transactions`

| Column                     | Type and rule                                                                |
| -------------------------- | ---------------------------------------------------------------------------- |
| `id`                       | `TEXT PRIMARY KEY`                                                           |
| `type`                     | `EXPENSE`, `INCOME`, `TRANSFER`, `ADJUSTMENT`, or internal `OPENING_BALANCE` |
| `posting_date`             | date-only `YYYY-MM-DD`                                                       |
| `category_id`              | nullable category reference, `ON DELETE RESTRICT`                            |
| `payee`                    | nullable trimmed `TEXT`                                                      |
| `note`                     | nullable trimmed `TEXT`                                                      |
| `related_transaction_id`   | nullable self-reference, `ON DELETE SET NULL`                                |
| `deleted_at`               | nullable UTC timestamp                                                       |
| `created_at`, `updated_at` | UTC timestamps                                                               |

Category presence/type and related-transaction semantics are cross-field domain rules. A transfer fee is a separate `EXPENSE` whose `related_transaction_id` points to the transfer. Indexes cover active posting order `(deleted_at, posting_date DESC, created_at DESC)`, `category_id`, `type`, and `related_transaction_id`.

### `transaction_lines`

| Column           | Type and rule                                       |
| ---------------- | --------------------------------------------------- |
| `id`             | `TEXT PRIMARY KEY`                                  |
| `transaction_id` | required transaction reference, `ON DELETE CASCADE` |
| `wallet_id`      | required wallet reference, `ON DELETE RESTRICT`     |
| `amount_minor`   | non-zero signed safe integer                        |
| `currency_code`  | uppercase ISO code                                  |
| `created_at`     | UTC timestamp                                       |

Indexes cover `transaction_id` and `(wallet_id, transaction_id)`. A transaction cannot repeat a wallet line unless a future explicitly approved split model requires it. The repository validates that each line currency equals its wallet currency, and that transfer primary lines are same-currency and sum to zero. Those facts span rows/tables and are not safely expressible as simple checks.

### `reminders`

| Column                     | Type and rule                                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `id`                       | `TEXT PRIMARY KEY`                                                          |
| `local_time`               | validated `HH:mm` text                                                      |
| `weekdays_mask`            | integer bitmask `1..127`, replacing the ambiguous `selected_weekdays` field |
| `enabled`                  | constrained boolean                                                         |
| `created_at`, `updated_at` | UTC timestamps                                                              |

One bit represents each local weekday. Scheduled notification identifiers are adapter state and can be rebuilt from enabled reminders; if platform identifiers must persist, they belong in settings rather than the financial ledger.

### `app_settings`

| Column       | Type and rule                                        |
| ------------ | ---------------------------------------------------- |
| `key`        | `TEXT PRIMARY KEY` from a typed application registry |
| `value`      | JSON-encoded `TEXT`, validated per key               |
| `updated_at` | UTC timestamp                                        |

Expected keys include onboarding completion, default currency, theme preference if added, notification privacy, and lock policy. Secrets do not belong here.

### `schema_migrations`

| Column       | Type and rule                  |
| ------------ | ------------------------------ |
| `version`    | positive `INTEGER PRIMARY KEY` |
| `name`       | unique non-empty `TEXT`        |
| `applied_at` | UTC timestamp                  |

## Deletion and archival behavior

- Deleting/restoring a transaction changes the parent `deleted_at` atomically; every line follows the parent's active state in queries.
- Editing replaces the transaction and its lines inside one database transaction while preserving the stable transaction ID where practical.
- Wallets/categories with history are archived. Physical deletion is allowed only for an unused entity after explicit product rules permit it.
- Restoring a transaction fails safely if a referenced wallet/category is unavailable or if currency/invariant validation fails; no partial restore occurs.

## Balance query contract

A wallet balance is `SUM(transaction_lines.amount_minor)` joined to transactions where `deleted_at IS NULL`, grouped by wallet and currency. Missing rows mean zero. Total views group by currency. No query may sum across currency codes.

## Transaction shape rules

- `EXPENSE`: one primary negative wallet line and an expense category.
- `INCOME`: one primary positive wallet line and an income category.
- `TRANSFER`: exactly two MVP primary wallet lines, distinct wallets, one negative and one positive, equal magnitude, same currency, total zero, no category.
- `ADJUSTMENT`: one signed wallet line for actual minus ledger balance, no reporting category.
- `OPENING_BALANCE`: one signed line; excluded from income/expense reports.
- Credit-card purchase: an `EXPENSE` with a negative credit-card line.
- Credit-card payment: a `TRANSFER` with a negative asset-wallet line and positive credit-card line.

## Later tables

Recurring templates, backup history, reconciliation sessions, payment methods, and exchange rates are not required for the MVP schema now. A reconciliation's posting date and note fit the transaction fields; a dedicated session table should be introduced only if audit metadata grows.
