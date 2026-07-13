# Pocket Ledger repository guide

## Purpose and phase control

Pocket Ledger is an offline-first iOS and Android personal-accounting application. It records a local ledger; it never moves money, connects to a bank, or uploads financial data.

Work on exactly one explicitly authorized phase at a time. Phase 0 is the latest authorized phase. Do not implement Phase 1 or later until the user says `Proceed with Phase N`. At the start of a phase, inspect the repository and docs, confirm scope, record a checklist, and identify dependencies and risks. At the end, run all relevant checks, update docs and the checklist, give manual verification steps, and stop.

## Repository structure

- `src/app/`: Expo Router route and navigation declarations only.
- `src/components/`: shared presentational primitives.
- `src/config/`: centralized product identity and static application configuration.
- `src/design/`: colors, spacing, typography, and light/dark themes.
- `src/domain/`: planned plain-TypeScript accounting code; no React, Expo, or SQLite imports.
- `src/application/`: planned use cases and services; depends on domain and repository contracts.
- `src/data/`: planned migrations, SQLite adapters, and repository implementations.
- `src/features/`: planned feature-specific UI and hooks.
- `src/hooks/`, `src/utilities/`, `src/test/`: shared hooks, helpers, and test infrastructure.
- `docs/`: product, architecture, data, test, privacy, decisions, backlog, and phase records.
- `assets/`: local application artwork. Current artwork is temporary until Phase 9.

Create planned directories only when their authorized phase needs them. Empty architecture folders are not required.

## Dependency direction

`routes/screens -> feature hooks -> application use cases -> domain + repository interfaces`

`SQLite repository implementations -> repository interfaces`

Domain code is the innermost layer. It must remain usable in Node-based unit tests. Screens do not calculate balances, issue SQL, or import raw SQLite APIs. Navigation does not query data. Environment-specific APIs stay behind small adapters.

## Non-negotiable accounting invariants

- Store and calculate money as signed integer minor units; never use binary floating point or `parseFloat` for money.
- Centralize ISO currency fraction metadata, parsing, formatting, validation, and rounding.
- Derive wallet balances only from active ledger lines. Opening balances are ledger transactions.
- Asset-wallet income is positive and expense is negative. Credit-card purchases create negative wallet lines; payments are transfers and are not expenses.
- Same-currency transfers have linked source and destination lines that sum to zero and are created, edited, deleted, and restored atomically.
- Reconciliation appends an adjustment for actual minus ledger balance; it never overwrites history.
- Soft-deleted transactions affect neither balances nor reports. Restores revalidate every invariant.
- Income and expense reports exclude transfers, adjustments, and opening-balance system transactions.
- Never aggregate different currencies into one total.
- UTC timestamps and date-only `YYYY-MM-DD` posting dates are separate values.

After any ledger-domain or persistence change, add or update invariant regression tests and independently verify balances, report classification, deletion/restoration, and transfer atomicity.

## Commands

```sh
npm install
npm run start
npm run ios
npm run android
npm run web
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run doctor
npm run check
```

Use `npm ci` for a clean locked install and in CI. `npm run check` is the main noninteractive gate: formatting, lint, strict TypeScript, and tests. `npm run doctor` is the Expo project-health check.

## Definition of done

A phase is done only when its approved scope is real rather than mocked; strict TypeScript, lint, relevant tests, and `npm run check` pass; the app remains startable; behavior has appropriate tests; documentation and phase status match the code; manual verification is provided; limitations are recorded; no critical warning or secret is ignored; and no later-phase behavior has been started.

## Prohibited practices

- Do not directly mutate a wallet balance or duplicate the full ledger in global memory.
- Do not use `any` except at a documented compatibility boundary.
- Do not silence TypeScript, lint, test, migration, or Expo health errors.
- Do not put accounting logic or SQL in screens or components.
- Do not add a backend, cloud sync, bank connectivity, analytics, advertising, secrets, fake credentials, or real payment behavior.
- Do not log financial payloads in production.
- Do not destructively delete wallets/categories with history or shipped migrations.
- Do not overwrite uncommitted user work, push, publish, submit builds, create paid resources, or commit unless explicitly authorized.
- Do not add `TODO` or `FIXME` comments unless the unfinished item is also recorded in `docs/BACKLOG.md`.

## Documentation maintenance

Update the relevant files in `docs/` whenever behavior, architecture, data shape, security posture, commands, assumptions, or phase status changes. Add consequential choices to `docs/DECISIONS.md` and incomplete work to `docs/BACKLOG.md`. Keep the README and commands in this file synchronized with `package.json`.
