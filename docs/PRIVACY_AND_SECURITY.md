# Privacy and security

## Privacy promise

Pocket Ledger is designed to keep its ledger on the user's device. The MVP has no backend, account, advertising, behavioral analytics, bank connection, or automatic upload. User-initiated export, backup, restore, and OS file sharing are explicit boundaries where data can leave the app.

Phase 0 stores no financial data and requests no sensitive permission. This document describes planned controls and does not claim they already exist.

## Data classification

Highly sensitive data includes wallet names/types/currencies, balances, all transaction lines, posting dates, categories, payees, notes, reports, settings that reveal financial habits, CSV exports, and JSON backups. Reminder configuration and app-lock policy are sensitive metadata. No online-banking credential or payment secret is collected.

## Threat model

Relevant threats include:

- another person accessing an unlocked device or app-switcher preview;
- a compromised/rooted device or unencrypted device backup;
- sensitive notification content on a lock screen;
- logs, crash reports, screenshots, exports, or backups revealing data;
- malformed backups causing corruption or relational bypass;
- partial database operations changing the ledger inconsistently;
- dependency or native-module vulnerabilities;
- a false user assumption that local storage is encrypted or that a recorded transfer moves money.

Remote account takeover and server breach are not MVP threats because no account/server exists, but future cloud work would require a new threat model and explicit approval.

## Planned controls

- SQLite foreign keys, validated rows, append-only migrations, and atomic multi-record operations.
- Soft deletion/archival and all-or-nothing backup restore.
- Optional device authentication with safe handling of unsupported/failed/cancelled authentication.
- Small lock settings in Secure Store; never place the ledger or backup there.
- Automatic lock on configured inactivity/background transitions.
- Private local notification copy with no balances or transaction amounts by default.
- Production log policy excluding financial payloads and backup contents.
- Guarded reset flow and production exclusion of development data tools.
- Backup validation before mutation, unsupported-future-version rejection, and a pre-restore safety backup when practical.
- CSV neutralization/escaping to reduce spreadsheet formula injection risk.
- Clear warnings that exported files and backups are sensitive.

## Encryption statement

No database exists in Phase 0. When SQLite is added, it must not be described as encrypted merely because it is application-private or device-protected. Database encryption is a separate Phase 8 evaluation. An encryption claim requires a configured cipher in a development/native build, key-management design, migration/backup behavior, physical-device tests, recovery documentation, and performance review.

Device-level encryption, sandboxing, or biometric app access may reduce casual exposure but does not prove database encryption against a compromised device.

## Authentication boundaries

Device authentication controls access to the UI; it is not user identity, cloud authentication, or encryption-key recovery. The app must fail closed when an enabled lock cannot authenticate, while still providing understandable recovery guidance consistent with the selected policy. App lifecycle tests cover background/resume and race conditions.

## Exports and backups

Exports/backups are created only after user action and shared only through an OS-controlled interface. The app should minimize temporary file lifetime where APIs permit, never log paths/content, and warn users to store/share files securely. Restore validates format/version, IDs, references, enum values, currency codes, safe amounts, timestamps/dates, and ledger invariants before an atomic replacement.

Conflict behavior for MVP restore is full replacement after strong confirmation, not row-by-row merge. The exact safety-backup and deletion policy is finalized/tested in Phase 7.

## Notifications

Permission is requested only after an explanation and user action. Schedules use local device time. Default notification text is generic, such as “Remember to record today's transactions.” Permission denial never blocks bookkeeping. There is no push token or notification server.

## Logging and diagnostics

Production code must not log amounts, balances, wallet/category names, payees, notes, transaction/line rows, SQL parameters containing financial data, or backup/export content. Development diagnostics use non-sensitive identifiers/error categories where necessary. User-visible errors never expose stack traces, SQL, or filesystem internals.

## Dependency and release review

The lockfile is committed and clean installs use `npm ci`. Expo Doctor and npm advisory output are reviewed rather than auto-fixed with breaking upgrades. Phase 8 audits dependency advisories and build contents; Phase 9 validates permissions and privacy disclosures. No package, build, or store listing is published without user authorization.

## User rights and reset

The user can export a human-readable CSV and full backup before deletion. Reset local data requires strong, explicit confirmation and must not appear as an everyday action. Since there is no server, the app cannot recover locally deleted data unless the user retained a backup.
