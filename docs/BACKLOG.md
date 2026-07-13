# Backlog

Items here are not authorized for implementation unless their phase is explicitly approved. The list prevents unfinished work from being hidden in code comments.

## Required later product backlog

- Multi-currency conversion and honest converted portfolio views.
- Cross-currency transfers.
- Manual exchange-rate tracking.
- Recurring transaction templates.
- Pending recurring-transaction confirmation.
- Refunds linked to original expenses and category reversal policy.
- Split transactions.
- Tags.
- Receipt attachments.
- OCR.
- Cloud synchronization.
- Multi-device synchronization.
- Shared household ledgers.
- Bank synchronization.
- Subscription detection.
- Budget forecasting.
- Investments.
- Loans and amortization.
- Web application as a supported product target.
- Actual money movement.

## Phase-tracked foundation work

- **Phase 1:** implement the documented money/ledger domain and invariant suite.
- **Phase 2:** implement SQLite schema, migrations, repositories, seed, startup recovery, and development-only data tools.
- **Phase 3:** replace wallet/category/onboarding placeholders with persisted flows.
- **Phase 4:** replace Add Transaction and Activity placeholders with real entry/edit/delete/restore behavior; decide and test linked transfer-fee deletion/restoration UX.
- **Phase 5:** replace Dashboard projections and add reconciliation/search/filter/performance work.
- **Phase 6:** implement private local reminders.
- **Phase 7:** implement reports, safe CSV, backup, and atomic restore.
- **Phase 8:** complete device lock, privacy/accessibility/security/dependency audits, database-encryption evaluation, and production logging controls.
- **Phase 9:** replace generated icon/splash artwork, set final identifiers, add build profiles/E2E/checklists, and prepare—not publish—beta builds.

## Known technical follow-ups

- Review npm's currently reported transitive moderate advisories during Phase 8 or sooner if an Expo-compatible non-breaking update becomes available. Do not force incompatible upgrades merely to reduce the count.
- Re-evaluate Node/Expo support policy during each SDK upgrade; CI currently uses Node 22 while the local Phase 0 audit used Node 24.
- Decide whether a small client query-state library is justified only after real repository-backed feature hooks expose a need.
- Decide whether a reconciliation session table is warranted only if transaction date/note prove insufficient for audit requirements.
- Evaluate database encryption separately in Phase 8; local-only storage is not equivalent to encryption at rest.
- Add supported-platform navigation integration or E2E tests once real product workflows exist.
