# Pocket Ledger

Pocket Ledger is a private, offline-first personal-accounting application for iOS and Android. It is designed to track wallets, expenses, income, transfers, reconciliation adjustments, and reports without a backend or online account.

The working name and brand values are centralized in `src/config/branding.json` so they can be changed later. Pocket Ledger records bookkeeping entries only: it does not connect to banks, move real money, or process payments.

## Current status

Phase 0 — Project Foundation is implemented. The project has an executable Expo Router shell with Dashboard, Activity, Reports, and Settings tabs; a clearly marked Add Transaction placeholder; centralized light/dark design tokens; an application error boundary; strict tooling; a smoke test; and project documentation.

No accounting, persistence, onboarding, or device feature is implemented yet. See [the phase plan](docs/PHASE_PLAN.md).

## Prerequisites

- Node.js 20.19.4 or newer. Node.js 22 LTS is used in CI.
- npm 10 or newer.
- Android Studio/emulator or a supported physical Android device for Android development.
- macOS with Xcode for the iOS Simulator. On Windows, use a physical iOS device with an Expo-compatible workflow; the iOS Simulator is unavailable.

## Setup

```sh
npm install
npm run start
```

For a clean reproducible install from the committed lockfile:

```sh
npm ci
```

## Run targets

```sh
npm run android
npm run ios
npm run web
```

The product target is iOS and Android. Web remains available as a convenient shell-development surface, but it is not an MVP release target.

## Quality checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run doctor
npm run check
```

Use `npm run test:watch` during test development and `npm run format` to apply repository formatting.

## Privacy posture

The intended MVP stores financial data only on the device and works without an internet connection after installation. The current Phase 0 shell stores no financial data. No advertising, behavioral analytics, bank credentials, cloud storage, or backend is configured. See [Privacy and Security](docs/PRIVACY_AND_SECURITY.md) for the threat model and honest limitations.

## Current limitations

- All financial screens are honest placeholders; no wallet or transaction can be saved.
- SQLite, migrations, repositories, and the accounting domain begin in Phases 1 and 2.
- Notifications, export, backup/restore, and device authentication belong to later phases.
- The generated icon and splash artwork is temporary and must be replaced during release readiness.
- The database is not present and is not claimed to be encrypted.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Accounting rules](docs/ACCOUNTING_RULES.md)
- [Phase plan](docs/PHASE_PLAN.md)
- [Decisions](docs/DECISIONS.md)
- [Test plan](docs/TEST_PLAN.md)
- [Backlog](docs/BACKLOG.md)
- [Privacy and security](docs/PRIVACY_AND_SECURITY.md)
- [Manual test checklist](docs/MANUAL_TEST_CHECKLIST.md)
