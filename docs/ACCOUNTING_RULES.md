# Accounting rules

These rules are product invariants, not presentation preferences.

## Money representation

- Domain amounts are signed `number` integers constrained by `Number.isSafeInteger`; SQLite values use `INTEGER` within the same range.
- User entry is parsed from text using the selected currency's fraction digits. Financial code never uses `parseFloat` or arithmetic on decimal fractions.
- The parser accepts one normalized decimal separator policy, rejects exponents, excess precision, zero/negative user amounts where a positive magnitude is required, and values outside the safe range.
- Formatting and ISO fraction metadata are centralized and tested for zero-, two-, and three-fraction-digit currencies.
- Rounding is explicit at external conversion boundaries; ordinary ledger operations do not round stored integer amounts.

## Ledger source of truth

Every balance is the sum of active ledger lines. Opening balances are `OPENING_BALANCE` transactions, not wallet fields. No UI or repository mutates a balance. A future cache may be dropped and rebuilt solely from active lines.

## Sign convention

For cash, bank, and stored-value wallets:

- income/opening funds/transfer in: positive;
- expense/transfer out: negative.

For credit cards:

- purchase: `EXPENSE` with a negative card line; a more negative balance means more owed;
- payment: `TRANSFER` with a negative paying-wallet line and positive card line;
- a payment never creates a second expense.

The UI may label `-50.00` on a credit card as “50.00 owed,” but the stored ledger sign remains negative.

## Transactions

### Expense

Accept a positive user magnitude, create one negative wallet line, and require an active expense category. It contributes its magnitude to expense reports.

### Income

Accept a positive user magnitude, create one positive wallet line, and require an active income category. It contributes to income reports.

### Transfer

Source and destination are distinct active wallets with identical currency codes. A positive input magnitude creates a negative source line and equal positive destination line. Primary lines sum to zero. Create, replace, soft-delete, and restore the transaction and lines atomically. Transfers affect wallet balances but not net same-currency total, income, or expenses.

A fee is a separate linked `EXPENSE` from the source wallet and category. The transfer remains zero-sum. If either part of a combined entry fails, neither is committed.

### Adjustment and reconciliation

Given actual balance `A` and active ledger balance `L`, difference `D = A - L`. If `D` is non-zero, append an `ADJUSTMENT` line of `D` using the user's posting date and optional note. If zero, report “already reconciled” and write nothing. Adjustments affect wallet balances and are excluded from normal income/expense reports.

### Opening balance

Create an internal `OPENING_BALANCE` transaction with one signed line. It affects the wallet but never income. A zero opening balance needs no line.

## Editing, deletion, and restoration

- Editing constructs and validates a complete replacement before opening the database write transaction.
- Multi-line replacement is atomic and updates `updated_at` while retaining stable identity where practical.
- Soft deletion sets the parent transaction's `deleted_at`; active queries ignore all its lines.
- Undo/restoration clears `deleted_at` only after referenced wallets/categories, archival policy, line currencies, and transaction invariants are revalidated.
- Linked transfer fees are surfaced to the user; product behavior for deleting/restoring the pair is decided and tested in Phase 4, with no silent orphaning.

## Reporting classification

| Transaction       | Income report | Expense report | Wallet balance |
| ----------------- | ------------: | -------------: | -------------: |
| `INCOME`          |      Included |       Excluded |       Included |
| `EXPENSE`         |      Excluded |       Included |       Included |
| `TRANSFER`        |      Excluded |       Excluded |       Included |
| `ADJUSTMENT`      |      Excluded |       Excluded |       Included |
| `OPENING_BALANCE` |      Excluded |       Excluded |       Included |
| Soft-deleted      |      Excluded |       Excluded |       Excluded |

Totals group by currency. Date filtering uses the stored posting-date string, never timezone-converted timestamps.

## Refund limitation

Until linked refunds are implemented, users record refunds as `INCOME` in a Refund category. This increases income and does not reduce the original expense category. The limitation must be disclosed anywhere refund guidance or affected reports are shown. Negative expense entry remains rejected.

## Required regression scenario

With Cash 100.00 and Bank 900.00 opening balances, total is 1,000.00. A Cash expense of 20.00 produces Cash 80.00, total 980.00, expenses 20.00. A Bank-to-Cash transfer of 100.00 produces Bank 800.00 and Cash 180.00 while total and reports remain unchanged. Salary income of 200.00 into Bank produces Bank 1,000.00, total 1,180.00, and income 200.00.

Additional tests cover zero/negative input, safe-integer boundaries, 0/2/3 fraction digits, same-wallet and cross-currency rejection, transfer zero-sum, credit-card purchase/payment, adjustment/report exclusion, deletion/restoration, opening-balance exclusion, and posting-date behavior.
