# Phase plan

Only the user can authorize a phase with `Proceed with Phase N`. Each phase begins with repository/doc inspection, a scoped checklist, dependency/risk review, and ends with automated checks, documentation, manual verification, limitations, and a stop.

## Status summary

- [x] Phase 0 — Project Foundation (completed 2026-07-13)
- [ ] Phase 1 — Money and Ledger Domain
- [ ] Phase 2 — SQLite Persistence
- [ ] Phase 3 — Onboarding, Wallets, and Categories
- [ ] Phase 4 — Transaction Entry
- [ ] Phase 5 — Dashboard, Activity, and Reconciliation
- [ ] Phase 6 — Local Reminders
- [ ] Phase 7 — Reports, Export, and Backup
- [ ] Phase 8 — Security, Privacy, and Quality
- [ ] Phase 9 — Release Readiness

## Phase 0 — Project Foundation

**Status:** Completed

**Date completed:** 2026-07-13

**Scope:** Initialize the Expo Router TypeScript project, strict tooling, design tokens/themes, four-tab shell, Add Transaction placeholder, application error boundary, test foundation, CI, and required documentation. No accounting or SQLite behavior.

**Implementation checklist:**

- [x] Audit empty repository, Git state, Node/npm, and current Expo versions.
- [x] Initialize npm lockfile and Expo SDK 57 TypeScript/Router project.
- [x] Configure strict TypeScript, ESLint, Prettier, Jest, RNTL, scripts, and CI.
- [x] Centralize brand and design tokens with system light/dark themes.
- [x] Add Dashboard, Activity, Reports, Settings, Add Transaction placeholder, reusable container, and error boundary.
- [x] Add smoke coverage and all required documentation.
- [x] Complete locked-install, check, Expo Doctor, and startup verification with no unresolved critical errors.

**Acceptance criteria:** locked dependencies install; shell starts; required routes exist; strict typecheck, lint, and tests pass; Expo health has no unresolved work-caused critical error; docs and commands match reality; no financial feature appears complete.

**Dependencies:** supported Node/npm; Expo SDK 57; Expo Router; React Native; Jest/RNTL; local Android/iOS tooling for device inspection.

**Risks:** current Node 24 versus common Node 22 CI environment; fast-moving Expo/Jest peer versions; native navigation differences; temporary starter artwork; placeholder UI being mistaken for real behavior. Mitigations are the lockfile, Expo Doctor, stable tabs, explicit phase labels, and manual platform checks.

## Phase 1 — Money and Ledger Domain

**Status:** Not started

**Date completed:** —

**Scope:** Plain-TypeScript money, currency, ledger, transaction constructors/replacement, balances, reporting classification, typed errors, and exhaustive unit tests. No React, Expo, SQLite, or feature UI.

**Acceptance criteria:** canonical balance scenario passes; safe integer and 0/2/3 fraction-digit parsing passes; invalid, same-wallet, cross-currency, and non-zero-sum transfers fail; credit cards, adjustments, deletion/restoration, opening balances, and posting dates follow documented rules; domain has no framework imports.

**Dependencies:** Phase 0 test/tooling foundation; approved currency metadata source encoded locally; accounting/data contracts.

**Risks:** locale parsing ambiguity, safe-integer overflow, incorrect credit-card signs, report double counting, and timezone leakage. Address with centralized parsing and table-driven invariant tests.

## Phase 2 — SQLite Persistence

**Status:** Not started

**Date completed:** —

**Scope:** `expo-sqlite` adapter, append-only migrations, constraints/indexes, repositories, idempotent category seed, atomic transaction operations, ledger reconstruction, initialization recovery, and development-only reset/sample tools.

**Acceptance criteria:** fresh and repeated initialization reach one valid schema; foreign keys are on; failed multi-line operations leave no partial state; active lines rebuild balances; migration/repository tests pass where supported.

**Dependencies:** Phase 1 domain/repository contracts; finalized Phase 0 data model; Expo SQLite compatibility.

**Risks:** SQLite transaction API behavior, migration rollback, partial transfers, stale/invalid rows, test-environment differences, and accidental production reset controls.

## Phase 3 — Onboarding, Wallets, and Categories

**Status:** Not started

**Date completed:** —

**Scope:** Privacy introduction, default currency, first wallet, optional reminder intent, wallet/category CRUD within archival rules, ordering, opening-balance transactions, forms, validation, and persistence.

**Acceptance criteria:** onboarding persists; opening balances are ledger-derived; archived records retain history; duplicate taps do not duplicate writes; system-category protections and accessible empty/error states work.

**Dependencies:** Phases 1–2; React Hook Form and Zod versions compatible with current React Native; default category plan.

**Risks:** duplicate submission, destructive history loss, default-currency confusion, archived reference behavior, and keyboard/small-screen usability.

## Phase 4 — Transaction Entry

**Status:** Not started

**Date completed:** —

**Scope:** Persisted expense, income, transfer, adjustment, transfer fee, editing, posting date, optional metadata, soft-delete, undo, duplicate prevention, and credit-card flows.

**Acceptance criteria:** each operation changes balances/reports exactly as specified; transfer mutations and fee workflows are atomic; adjustment reaches actual balance; restart preserves results; credit-card payment is not an expense.

**Dependencies:** domain constructors and repositories; real wallets/categories; date and form controls.

**Risks:** partial replacement, stale form data, double submit, invalid restore, fee orphaning, sign confusion, and date shifts.

## Phase 5 — Dashboard, Activity, and Reconciliation

**Status:** Not started

**Date completed:** —

**Scope:** Real dashboard projections, recent activity, grouped history, combined search/filters, details/actions, refresh, reconciliation, loading/empty/error states, and realistic-volume performance.

**Acceptance criteria:** independent ledger calculations match UI totals; transfers do not affect reports; filters combine correctly; reconciliation is transparent; currency totals stay separated; large histories remain usable.

**Dependencies:** complete Phase 4 persistence/UI mutations; indexed query projections; pagination/performance fixtures.

**Risks:** N+1 queries, unbounded rendering, stale projections, misleading cross-currency views, search escaping, and reconciliation races.

## Phase 6 — Local Reminders

**Status:** Not started

**Date completed:** —

**Scope:** Permission education/action, local time and weekdays, enable/disable, schedule replacement/cancellation, notification tap routing, private content, persistence, adapter tests, and platform-limit documentation.

**Acceptance criteria:** settings persist; edits replace old schedules; disabling cancels; denial is safe; bodies reveal no balances or amounts; no push backend exists.

**Dependencies:** persisted settings/reminders; `expo-notifications`; development build/platform capability where required.

**Risks:** platform permission differences, duplicate schedules, timezone/DST changes, OS delivery limits, and privacy leaks on lock screens.

## Phase 7 — Reports, Export, and Backup

**Status:** Not started

**Date completed:** —

**Scope:** Monthly and category reports, wallet/cash-flow views, filters, CSV export, versioned complete JSON backup, validation, all-or-nothing restore, future-version rejection, safety backup, and round-trip tests.

**Acceptance criteria:** classification/currency rules hold; CSV opens in common tools; complete data and stable IDs round-trip; unsupported/failed restores never partially replace data.

**Dependencies:** stable schema/repositories and reporting domain; Expo-supported file/sharing APIs; backup format contract.

**Risks:** formula injection in CSV, sensitive exported files, incompatible versions, relational ordering, partial restore, storage limits, and conflict semantics.

## Phase 8 — Security, Privacy, and Quality

**Status:** Not started

**Date completed:** —

**Scope:** Optional device-auth app lock, Secure Store settings, inactivity/background lock, production log audit, export/backup sensitivity, app-switcher review, dependency/accessibility/error/recovery/performance audits, in-app privacy, regression checklist, and production exclusion of dev controls.

**Acceptance criteria:** lock fails safely and unsupported devices work; production logs contain no financial payload; dev controls are absent; accessibility results and critical regressions are documented. Database encryption is claimed only if actually configured and tested.

**Dependencies:** mature end-to-end MVP; `expo-local-authentication` and `expo-secure-store`; physical-device testing.

**Risks:** lock bypass during lifecycle transitions, false encryption assumptions, sensitive previews/files/logs, native capability variance, and inaccessible financial cues.

## Phase 9 — Release Readiness

**Status:** Not started

**Date completed:** —

**Scope:** Stable identifiers/placeholders, EAS build profiles, replacement-ready icon/splash, permission audit, practical critical-flow E2E, release checks, store/privacy checklists, beta plan, and known limitations. No publishing/submission.

**Acceptance criteria:** production config has no secrets/sample data; critical automated/manual checks pass; build instructions reproduce; missing brand/store inputs are explicit; controlled beta quality is reached.

**Dependencies:** completed/hardened MVP; final branding and identifiers or approved placeholders; native build toolchains/EAS credentials only if the user authorizes their use.

**Risks:** platform signing/permission differences, store disclosure gaps, unreplaced artwork, flaky E2E, production-only behavior, and external credential requirements.
