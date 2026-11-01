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

## People and debts

12. A person is a ledger account of class `person`. Its balance per currency is what they owe you when positive and what you owe them when negative. Person balances are never added to the money totals on Home.
13. Money exchanged with a person is a zero-sum transfer between your money account and the person, tagged with a debt action:

| Action    | Your account | Person   | Meaning                               |
| --------- | ------------ | -------- | ------------------------------------- |
| `lend`    | − amount     | + amount | You gave money; they owe you more     |
| `repay`   | − amount     | + amount | You returned money you owed           |
| `borrow`  | + amount     | − amount | You received money; you owe them more |
| `collect` | + amount     | − amount | They returned money they owed         |

14. Debts are excluded from income and expense reports, like other transfers. A debt must be between exactly one person and one of your money accounts, in one currency.
15. An expense may be recorded on a person account ("someone else paid"): it counts as spending and lowers their balance, so you owe them. Income on a person account ("not received yet") counts as income and raises their balance. Forgiving a debt is recorded the same way, as an expense or income on the person.
16. A starting balance for a person is an `opening` entry on their account and is excluded from reports.
17. A statement of account for a person and currency lists every active line in date order with a running balance. Lines before the period start form the opening balance; the closing balance equals the person's ledger balance at the end of the period.
