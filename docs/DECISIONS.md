# Architecture decisions

Entries are intentionally lightweight. New consequential decisions append a section; they do not rewrite history.

## 2026-07-13 — Expo SDK 57, npm, and stable JavaScript tabs

**Decision:** Use the current scaffolded stable versions: Expo 57.0.4, React Native 0.86, TypeScript 6 strict mode, Expo Router, npm, and the stable JavaScript `Tabs` navigator. Commit `package-lock.json`.

**Context:** The repository was empty and had no package-manager convention. The SDK 57 default template demonstrated native tabs through an API still named `unstable-native-tabs` and included many demo-only dependencies.

**Alternatives considered:** an older Expo SDK; native unstable tabs; hand-built navigation; yarn/pnpm.

**Consequences:** The project uses current supported APIs and a reproducible npm install. JavaScript tabs trade some newest native visual behavior for a stable, consistent iOS/Android/web shell. Expo version upgrades require Doctor, platform smoke tests, and lockfile review.

## 2026-07-13 — Layered feature architecture

**Decision:** Keep accounting in plain TypeScript domain modules, workflows in application use cases, persistence behind repository interfaces, and navigation/screens free of calculations and SQL.

**Context:** Financial correctness and testability require policy that can run without React Native or a device.

**Alternatives considered:** feature folders with direct SQLite access; active-record models; a global in-memory ledger store.

**Consequences:** More explicit mapping and interfaces are required, but domain tests are fast, persistence is replaceable, and screens cannot become a second source of financial truth.

## 2026-07-13 — Ledger lines and safe integer minor units

**Decision:** Store signed integer minor units on transaction lines and derive balances from active lines. No wallet balance column exists. Limit domain values to JavaScript safe integers even though SQLite supports wider integers.

**Context:** Floating-point money and independently mutable balances create unrecoverable drift. JavaScript cannot precisely represent all SQLite 64-bit integers.

**Alternatives considered:** decimal strings; arbitrary-precision library; stored wallet balances; floating point.

**Consequences:** Currency parsing/formatting metadata is mandatory and maximum magnitudes are bounded. Every balance is auditable and rebuildable. A later need for larger values would require a deliberate bigint/string boundary migration.

## 2026-07-13 — Planned SQLite schema refinements

**Decision:** Rename reminder `selected_weekdays` to an integer `weekdays_mask`; add internal `OPENING_BALANCE`; use UTC timestamps plus posting-date text; use stable UUID text IDs; add partial/expression uniqueness and query indexes; keep line currency redundant for audit/import safety.

**Context:** The initial model left weekday representation, internal opening type, uniqueness, and query behavior open.

**Alternatives considered:** JSON weekday arrays; mutable opening balance; integer autoincrement IDs; relying only on wallet currency.

**Consequences:** Reminder comparison is deterministic, backup IDs remain portable, opening money stays out of income, and line records remain self-describing. Repository validation must ensure line and wallet currencies match.

## 2026-07-13 — Same-currency MVP and grouped totals

**Decision:** Permit transfers only between wallets with the same currency and group every multi-wallet total/report by currency.

**Context:** Converting currencies correctly requires rates, timestamps, rounding, gains/loss policy, and additional ledger lines that are outside MVP scope.

**Alternatives considered:** silently treating numeric values as equal; a single default-currency total; manual ad hoc conversion.

**Consequences:** Users get honest totals and cannot record cross-currency transfers until a later approved design adds exchange rates and accounting policy.

## 2026-07-13 — Refunds as income until linked reversals exist

**Decision:** The MVP records a refund as `INCOME` in a Refund category. Negative expense input is not allowed.

**Context:** Linked refunds are backlog work and an unlinked negative expense would conflict with the positive-magnitude transaction-entry contract.

**Alternatives considered:** positive `EXPENSE` lines; `ADJUSTMENT`; blocking refund recording entirely.

**Consequences:** Wallet balance is correct, but income is increased and the original expense category is not reduced. The limitation must be disclosed in entry/report guidance until linked refund behavior replaces it.

## 2026-07-13 — Centralized brand and semantic design tokens

**Decision:** Define working identity once in `src/config/branding.json` so both Expo's Node-based config loader and application TypeScript can consume it; expose it to application code through `branding.ts`. Consume semantic light/dark colors, spacing, radii, and typography through internal primitives. Use one `@/*` alias configured in TypeScript, Expo's runtime resolver, and Jest.

**Context:** The name is temporary and the product must support themes without hard-coded feature colors.

**Alternatives considered:** duplicate app/config labels; a large UI framework; relative imports only; multiple asset aliases.

**Consequences:** Renaming is contained and visual policy stays small. The current icon/splash files remain temporary assets and must be replaced in Phase 9. Alias behavior is verified by typecheck, Jest, and bundle startup.

## 2026-07-13 — Quality gates and CI scope

**Decision:** `npm run check` runs deterministic formatting, ESLint, strict TypeScript, and Jest. GitHub Actions runs `npm ci` plus that command on Node 22. Expo Doctor is a separate script and manual/phase gate.

**Context:** Doctor can inspect the environment and dependency registry, while the main CI gate should remain reproducible and not make tests network-dependent.

**Alternatives considered:** include Doctor in every test run; no provider workflow because no remote is configured; run only lint/tests.

**Consequences:** Core CI is stable and a ready GitHub workflow exists if hosted there. Each phase must still run/report Doctor separately when Expo/native dependencies change.
