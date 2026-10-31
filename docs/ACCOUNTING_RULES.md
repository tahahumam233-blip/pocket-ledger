# Accounting rules

These are invariants, not preferences. Tests in `src/domain/*.test.ts` and `src/application/services.integration.test.ts` enforce them.

1. Money is stored and computed as signed integer minor units. Parsing user input never uses floating point; formatting is centralized in `src/domain/money.ts`.
2. Currency metadata (fraction digits, symbol, position) is centralized in `src/domain/currency.ts`. Amounts in different currencies are never added together.
3. Balances are derived only from active ledger lines. Opening balances are `opening` transactions. Nothing stores or mutates a balance.
4. Income is positive, expenses are negative. Transfers out are negative on the source and positive on the destination; same-currency transfers sum to zero and are written, edited, soft-deleted and restored atomically with their transaction.
5. Exchanges are transfers with two currencies; both amounts are entered by the user and both lines are required.
6. Reconciliation appends an `adjustment` equal to actual minus ledger balance. It never edits history, and a zero difference writes nothing.
7. Soft-deleted transactions affect neither balances nor reports. Restoring re-validates the entry against current accounts, categories and currencies.
8. Income and expense reports exclude transfers, exchanges, opening balances and adjustments.
9. Accounts and categories with history are archived, never deleted. A currency with history cannot be replaced.
10. Editing validates the complete replacement before the write transaction opens, and replaces every line of the transaction in one transaction.
11. Posting dates are `YYYY-MM-DD` in local time; audit timestamps are UTC ISO strings. They are never mixed.
