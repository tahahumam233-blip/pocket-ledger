# Pocket Ledger repository guide

Pocket Ledger is an offline-first, two-currency spending tracker for iOS and Android built with Expo SDK 58, React Native and TypeScript. It records a local ledger only: it never moves money, connects to a bank or uploads data.

## Before changing Expo or React Native code

Expo changes every release and training data is often stale. Check the installed version in `package.json`, read the installed package's `build/*.d.ts` or the matching docs page, and add dependencies with `npx expo install <package>` so versions stay compatible with SDK 58 and with Expo Go.

## Repository structure

- `src/app/`: Expo Router routes and layouts only. No SQL, no accounting logic.
- `src/components/`: reusable presentational primitives.
- `src/design/`: colour, spacing and typography tokens and the theme provider.
- `src/domain/`: pure TypeScript accounting rules. No React, Expo or SQLite imports; must run in Node tests.
- `src/data/`: SQLite schema, migrations, row mappers, repositories and the `SqlDriver` abstraction.
- `src/application/`: use cases and ports (ledger, receipts, setup, queries, reminders, export).
- `src/platform/`: thin adapters over device APIs (file system, notifications, image picker, haptics, sharing, biometrics).
- `src/state/`: zustand store, `useQuery`, boot and reminder sync.
- `src/features/`: feature-specific screens and hooks.
- `src/test/`: test-only helpers such as the `node:sqlite` driver.
- `docs/`: product, architecture, data model, accounting rules, privacy, decisions, backlog, manual checklist, phone guide.

## Dependency direction

`routes -> features/components -> state -> application -> domain + repositories`; `platform` implements application ports and is injected at boot. Screens do not calculate balances, issue SQL or import SQLite. Navigation does not query data.

## Accounting invariants (non-negotiable)

- Money is signed integer minor units; never binary floating point or `parseFloat`.
- Currency metadata, parsing, formatting and rounding are centralized in `src/domain`.
- Balances derive only from active ledger lines; opening balances are ledger transactions.
- Income positive, expense negative; same-currency transfers sum to zero and are written, edited, deleted and restored atomically.
- Exchanges carry two currencies and two user-entered amounts.
- Reconciliation appends an adjustment; history is never rewritten.
- Soft-deleted transactions affect neither balances nor reports; restores revalidate every rule.
- Reports exclude transfers, exchanges, opening balances and adjustments.
- Never aggregate different currencies.
- UTC timestamps and `YYYY-MM-DD` posting dates are separate values.

After any domain or persistence change, add or update regression tests and verify balances, report classification, deletion/restoration and transfer atomicity.

## Commands

```sh
npm install
npm run start
npm run start:tunnel
npm run android
npm run ios
npm run web
npm run build:web
npm run preview:web
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run doctor
npm run check
npm run build:android
npm run build:ios
```

`npm run check` is the gate: formatting, lint, strict TypeScript and tests. Run it before declaring work done. `npx expo export --platform android` confirms Metro bundles the app, and `WEB_BASE_URL=/pocket-ledger npm run build:web` builds the iPhone web app (files named `*.web.ts(x)` are its platform versions).

## Definition of done

Behaviour is real rather than mocked; `npm run check` passes; the app still starts in Expo Go; new behaviour has tests; docs match the code; manual verification steps are listed; limitations are recorded in `docs/BACKLOG.md`.

## Prohibited

- Mutating a stored balance or duplicating the ledger in memory.
- `any` outside a documented compatibility boundary; silencing TypeScript, lint, test or migration errors.
- Accounting logic or SQL in screens or components.
- Backends, cloud sync, bank connectivity, analytics, advertising, secrets, fake credentials or real payment behaviour.
- Logging financial payloads in production.
- Destructive deletion of accounts, categories or shipped migrations.
- `TODO`/`FIXME` comments without a matching entry in `docs/BACKLOG.md`.
- Committing, pushing, publishing or creating paid resources without explicit authorization.

## Documentation

Update `docs/` whenever behaviour, architecture, data shape, security posture or commands change. Record consequential choices in `docs/DECISIONS.md` and unfinished work in `docs/BACKLOG.md`. Keep README commands in sync with `package.json`.
