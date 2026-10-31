# Changelog

## 1.0.0 (unreleased)

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

### Removed

- The Phase 0 placeholder shell and its phase-based plan.
