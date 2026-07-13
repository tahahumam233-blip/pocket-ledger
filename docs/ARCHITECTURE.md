# Architecture

## Overview

Pocket Ledger uses a feature-oriented, layered React Native architecture. Expo Router owns navigation, plain TypeScript owns accounting, application use cases coordinate operations, and repository adapters own SQLite. Financial state is never sourced from UI state.

## Dependency rule

```text
src/app routes
    -> src/features screens and query/mutation hooks
        -> src/application use cases and services
            -> src/domain entities, policies, errors, repository interfaces

src/data SQLite implementations
    -> src/domain/application repository interfaces

src/components + src/design
    <- may be used by routes/features, never by domain
```

All arrows point inward toward stable policy. Domain modules cannot import React, React Native, Expo, Expo Router, or SQLite. Application code cannot import a concrete SQLite implementation; composition at application startup supplies implementations.

## Directory plan

- `src/app/`: route files and navigation options only.
- `src/components/`: reusable visual primitives with no financial policy.
- `src/config/`: centralized working identity and build-safe static configuration.
- `src/design/`: semantic colors, spacing, radii, typography, and themes.
- `src/domain/money/`: currency metadata, parsing, formatting, integer operations.
- `src/domain/wallets/`: wallet types and wallet policies.
- `src/domain/ledger/`: transaction lines, invariant validation, balances.
- `src/domain/transactions/`: transaction construction and replacement rules.
- `src/domain/reports/`: report classification and grouped totals.
- `src/domain/reminders/`: schedule value objects only.
- `src/application/use-cases/`: create/edit/delete/restore/reconcile/query orchestration.
- `src/application/services/`: time, IDs, files, backup, notifications, and authentication contracts.
- `src/data/database/`: initialization, append-only migrations, schema helpers, transactions.
- `src/data/repositories/`: SQLite repository implementations and row mappers.
- `src/features/`: feature screens, forms, feature components, and targeted query hooks.
- `src/hooks/`, `src/utilities/`, `src/test/`: cross-feature helpers and test infrastructure.

Folders are introduced only in the phase that needs them.

## Phase 0 runtime composition

`src/app/_layout.tsx` selects a navigation theme from centralized design tokens, installs a root Stack, and exports Expo Router's recoverable `ErrorBoundary`. The main route group contains stable JavaScript tabs for Dashboard, Activity, Reports, and Settings. Add Transaction is a modal route whose content explicitly states that accounting is not implemented.

The application error fallback shows a generic recoverable message and retry action; it does not expose the thrown error or stack. Database initialization does not exist in Phase 0. Phase 2 will add a startup state machine: `initializing | ready | recoverable-error`, and navigation will render financial features only in `ready`.

## Domain and application design

Domain functions accept immutable values and return typed values or typed errors. User input becomes money only through a shared parser. Constructors create complete candidate transactions, and a ledger validator enforces invariants before persistence.

Application use cases own workflows such as transfer-plus-fee, atomic replacement, reconciliation, restore revalidation, and query invalidation. React screens call use cases through feature hooks. They never calculate balances or classify reports.

Expected error categories include validation, not found, conflict/archived entity, currency mismatch, invariant violation, persistence, permission, and unsupported backup version. UI maps them to stable user messages while retaining non-financial diagnostic context for development.

## Persistence design

Phase 2 will use `expo-sqlite`, enable `PRAGMA foreign_keys = ON` on every opened connection, and run append-only migrations inside transactions. Multi-record ledger mutations use explicit database transactions. Repository interfaces hide SQL and row formats.

Ledger lines are the source of truth. Balances use a grouped sum of active transaction lines. Any future balance cache is disposable, transactionally maintained, and rebuildable. SQLite constraints enforce local facts; domain/application validation enforces cross-row and cross-table rules such as transfer zero-sum and matching wallet currencies.

## State and queries

Persistent financial state stays in SQLite. UI state contains only transient form, navigation, filter, and request status. Query hooks fetch targeted projections and invalidate only affected keys after mutations. The complete ledger is never mirrored into a global store.

No client-state library is selected in Phase 0. A later phase may add a small solution only if React state plus explicit query hooks becomes insufficient.

## Dates and time

An injected clock produces UTC `created_at`/`updated_at` timestamps. Posting dates remain validated date-only strings and are never constructed by converting midnight through a timezone. Reminder schedules store local wall-clock time and weekday mask; the notification adapter schedules in the device timezone.

## Security boundaries

Database, export, notification, authentication, and file-sharing APIs live behind adapters. Production logging must omit financial values, names, payees, notes, and backup contents. Secure Store is limited to small security settings; it is not a ledger database. Biometric success unlocks app access but does not imply database encryption.

## Migrations and compatibility

- Migration versions are monotonically increasing integers with stable names.
- A shipped migration is never edited; corrections use a later migration.
- Initialization records a migration only after its transaction succeeds.
- Backup schema versions are independent from database migration versions.
- Row mapping validates database values before they enter the domain.

## Testing architecture

Plain domain logic receives exhaustive deterministic unit tests. Components use Jest plus React Native Testing Library. Repository and migration integration tests use a supported SQLite environment where feasible. Native adapters are tested against mocks; critical release flows may use Maestro in Phase 9. Tests never require network access.

## Build and continuous integration

npm and `package-lock.json` provide reproducible dependencies. `npm run check` runs formatting, lint, strict TypeScript, and tests. GitHub Actions uses Node 22 and `npm ci`; Expo Doctor is run separately because it may perform environment or registry checks.
