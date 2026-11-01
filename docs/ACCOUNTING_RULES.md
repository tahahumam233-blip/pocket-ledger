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

## Receivables and payables (parties)

12. A party (debtor or creditor) is a ledger account of class `person`. Its balance per currency is a receivable when it is a debit (positive) balance and a payable when it is a credit (negative) balance. Party balances are never added to the cash and bank totals on Home.
13. A loan entry is a zero-sum transfer between one of your cash or bank accounts and the party, tagged with an action:

| Action (stored) | Label              | Cash or bank | Party  | Effect on the party      |
| --------------- | ------------------ | ------------ | ------ | ------------------------ |
| `lend`          | Loan given         | Credit (−)   | Debit  | Increases the receivable |
| `repay`         | Repayment made     | Credit (−)   | Debit  | Reduces the payable      |
| `borrow`        | Loan received      | Debit (+)    | Credit | Increases the payable    |
| `collect`       | Repayment received | Debit (+)    | Credit | Reduces the receivable   |

14. Loan entries are excluded from income and expense reports, like other transfers. A loan entry must be between exactly one party and one of your cash or bank accounts, in one currency.
15. An expense may be posted to a party ("expense paid by party", paid on your behalf): it counts as an expense and credits the party, creating or increasing a payable. Income posted to a party ("on account") counts as income and debits the party, creating a receivable. Writing off a balance is posted the same way, as an expense or income against the party.
16. A party's opening balance is an `opening` entry on their account and is excluded from reports.
17. A statement of account for a party and currency lists every active line in date order with Debit and Credit columns and a running balance marked Dr or Cr. Lines before the period start form the opening balance b/f; the closing balance c/f equals the party's ledger balance at the end of the period, and opening + total debits − total credits = closing.

## Terminology

The app uses standard bookkeeping terms. Internal identifiers (`person`, `lend`, `borrow`, `collect`, `repay`, `owes_you`, `you_owe`, `settled`) are unchanged so stored data and backups stay compatible.

| Shown in the app                   | Meaning                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Cash & bank                        | Total of your money accounts (Safe, Pocket, Bank) per currency                                   |
| Expenses, Income, Net income       | Report totals; net income is income less expenses                                                |
| Party                              | A debtor or creditor account                                                                     |
| Receivable / Payable / Nil balance | Debit, credit or zero party balance                                                              |
| Dr / Cr                            | Side of a running balance on a statement                                                         |
| Opening balance b/f, Closing c/f   | Balance brought forward into and carried forward out of a statement period                       |
| Reconcile, Book balance            | Compare the ledger balance with a count; any difference is posted as a reconciliation adjustment |
