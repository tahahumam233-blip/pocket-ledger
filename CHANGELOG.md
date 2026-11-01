# Changelog

## 1.0.0 (unreleased)

### Changed: accounting terminology

- Standard bookkeeping wording throughout: Receivables & payables, party, receivable / payable / nil balance, Loan given, Loan received, Repayment received, Repayment made.
- Statements show Debit and Credit, running balances marked Dr or Cr, Opening balance b/f, Total debits, Total credits and Closing balance c/f, in the app, the shared text and the CSV.
- Home shows Cash & bank, Expenses today and Month to date; Reports show Expenses, Income and Net income; Activity has a Loans filter.
- Accounts are reconciled with a Reconcile screen (book balance, counted balance, reconciliation difference); new adjustments carry the note "Reconciliation adjustment".
- Stored data and backups are unchanged.

First complete version, rebuilt from scratch on Expo SDK 58.

### Added

- Onboarding: two currencies (device currency pre-selected), Safe / Pocket / Bank accounts with opening balances, optional name, nightly reminder time.
- Ledger: expenses, income, transfers and currency exchanges with a custom keypad, account and category pickers, date chips, notes and receipt photos; edit, soft delete with undo, restore with revalidation.
- Receipts inbox: camera or library capture, "needs an amount" state, add the amount later, link and detach, notes, delete.
- Home: per-currency totals, spent today and this month, account cards, quick actions, pending-receipt banner, recent entries.
- Activity: month navigation, search, type and currency filters, day grouping with totals.
- Reports: spent, received and net per currency with month-over-month change, spending by category ring chart, six-month trend.
- Accounts: balances per currency, history, reconcile with an adjustment entry, add, edit, archive and restore.
- Settings: currencies (locked once used), reminder, appearance, app lock (biometrics), categories, CSV export, privacy notes, erase all data.
- Daily local reminder that mentions waiting receipts; tapping it opens the new-expense screen.
- Light and dark themes with Inter typography; new app icon, adaptive icon, splash and notification icon.
- Domain unit tests and SQLite-backed integration tests (55 tests), CI workflow, EAS build profiles.

### Added for iPhone

- Installable Home Screen web app built from the same code: offline service worker, manifest and icons, Add to Home Screen guide in Safari, GitHub Pages publishing workflow.
- Web storage with SQLite (sql.js) saved to IndexedDB after every write; receipt photos shrunk and kept in Cache Storage.
- Nightly reminder as a daily Calendar alert for the web app.
- Backup and restore to a JSON file with photos on every platform, monthly backup reminder on Home.
- In-app confirmation dialogs, native iPhone date and time wheels, share sheet for exports.
- 90 automated tests, including the full service suite on both SQLite engines, and a 23-step browser check of the built web app.

### Added: people and debts

- People you lend to and borrow from, each with a balance per currency (owes you or you owe), a note and an optional settle-by date with overdue warning.
- Debt entries: lend, borrow, get paid back and pay back, from the add form or "I gave / I got" on a person; balance preview before saving; settle in full.
- Expenses someone else paid for you and income not yet received, recorded on the person.
- Statement of account per person and currency: period filter, opening balance, You gave / You got, running balance, totals and closing balance; share as text or CSV.
- People screen with totals, search and filters; People card and Lend/Borrow quick action on Home; Debts filter and person search in Activity.
- Database version 2 (additive), with existing ledgers and older backups upgraded automatically; 132 automated tests and a 20-step browser check for debts.

### Removed

- Android: build profiles, adaptive and notification icons, scripts and code paths. The app targets iPhone only.

- The Phase 0 placeholder shell and its phase-based plan.
