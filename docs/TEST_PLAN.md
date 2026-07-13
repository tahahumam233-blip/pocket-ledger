# Test plan

## Objectives

Tests protect accounting invariants, atomic persistence, user-visible workflows, migrations/backups, accessibility semantics, and privacy boundaries. Tests must be deterministic and must not require network access.

## Test layers

1. **Domain unit tests:** pure TypeScript money, ledger, constructors, validation, balances, dates, and reports. These are exhaustive and fastest.
2. **Application use-case tests:** repository fakes verify orchestration, typed errors, submission idempotency, transfer/fee behavior, and invalidation.
3. **Repository/migration integration tests:** supported SQLite runtime verifies schema, foreign keys, indexes, atomicity, seed idempotency, mapping, and ledger reconstruction.
4. **Component tests:** Jest plus React Native Testing Library verifies accessible names/roles, form validation, loading/error/empty states, and user interaction.
5. **Native adapter tests:** notifications, file sharing, backup, authentication, Secure Store, and clock/ID adapters use controlled mocks plus physical-device manual checks.
6. **End-to-end tests:** Maestro may cover critical release flows in Phase 9 where reliable.

## Phase 0 coverage

The smoke test renders a React Native component through `jest-expo` and React Native Testing Library, resolves the `@/*` alias, consumes centralized branding/theme code, and queries an accessibility role. Navigation and theme behavior receive manual checks in this phase because no product workflow exists yet.

## Required Phase 1 matrix

- Currency parsing/formatting for 0, 2, and 3 fraction digits.
- Leading/trailing whitespace policy, invalid separators/characters, excess precision, exponent notation, zero/negative magnitude, and safe-integer boundaries.
- Canonical Cash/Bank expense-transfer-income scenario from `ACCOUNTING_RULES.md`.
- Opening balances excluded from income.
- Transfer source/destination signs, distinct wallets, matching currency, zero-sum, and net/report neutrality.
- Credit-card purchase and payment signs; payment is not an expense.
- Adjustment calculation and report exclusion; zero difference writes nothing.
- Deleted transactions excluded and restored transactions included.
- Date-only boundaries remain on the selected reporting day across timezones.
- Typed errors are stable and contain no UI/framework dependency.

## Persistence matrix

- Empty database reaches latest version; repeated startup is idempotent.
- Every migration upgrades from each supported prior version and rolls back on failure.
- `PRAGMA foreign_keys` is on and invalid references fail.
- Default category seed is idempotent and preserves user changes under documented rules.
- Create/edit/delete/restore for every transaction shape is atomic.
- Injected failure between transfer lines leaves neither line/transaction.
- Archived references and restoration rules behave safely.
- Balance queries match an independent in-memory ledger calculation across randomized fixtures where practical.

## UI and accessibility matrix

- Required fields, inline errors, focus order, screen-reader labels, dynamic text, keyboard avoidance, and minimum targets.
- Repeated Save taps produce one mutation.
- Destructive actions require confirmation and undo behaves within its window.
- Loading, empty, recoverable database error, and permission-denied states.
- Light/dark themes, small phone layout, Android back behavior, and iOS modal behavior.
- Transaction signs/types remain understandable without color.

## Reports/export/backup matrix

- Report classification table, month boundaries, filters, multi-currency grouping, and large histories.
- CSV escaping for comma, quote, newline, Unicode, and spreadsheet-formula prefixes.
- Backup round trip preserves all stable IDs and relationships.
- Malformed, incomplete, tampered, and future-version backups fail before mutation.
- Injected restore failure rolls back entirely; pre-restore safety behavior is verified.

## Security/privacy checks

- Production logging contains no amounts, wallet/category names, payees, notes, transaction rows, or backup content.
- Notification text contains no financial values by default.
- App lock lifecycle transitions and failed/unsupported authentication fail safely.
- Development reset/sample controls cannot be reached in production builds.
- Export/backup warnings match file sensitivity; no encryption claim is made without a tested implementation.

## Commands and CI

- `npm run test`: noninteractive Jest suite.
- `npm run test:watch`: local watch mode.
- `npm run typecheck`: strict compile-only verification.
- `npm run lint`: ESLint with zero warnings.
- `npm run format:check`: formatting verification.
- `npm run check`: main deterministic local/CI gate.
- `npm run doctor`: Expo project health, run and reported separately.

GitHub Actions installs with `npm ci` on Node 22 and runs `npm run check`. Tests must pass with networking unavailable after installation.

## Defect policy

Every financial correctness defect receives a minimal regression test at the lowest appropriate layer before or with the fix. A failing check caused by the current phase blocks completion. Environment-only failures are reported with the exact command/output and a manual alternative; they are never described as passing.
