# Architecture

## Stack

- Expo SDK 58, React Native 0.88, React 19.3, TypeScript (strict), Expo Router 58 with typed routes.
- expo-sqlite for storage, expo-file-system for receipt images, expo-notifications for the nightly reminder, expo-image-picker for capture, expo-local-authentication for the app lock, react-native-svg for charts, zustand for shared UI state.
- Jest (jest-expo preset) for tests. Repository and service tests run against Node's built-in SQLite (`node:sqlite`) through a small driver adapter, so the real schema and SQL are exercised without a device.

## Layers and dependency direction

```
routes (src/app) -> features / components -> state (store, hooks)
                                           -> application (use cases)
                                           -> domain (pure rules) + data (repositories)
platform adapters (src/platform) are injected into application services via small interfaces
```

- `src/domain` has no React, Expo or SQLite imports. It owns money math, currency metadata, dates, draft validation, line building, balance derivation, report aggregation and CSV building.
- `src/data` owns the schema, migrations (`PRAGMA user_version`), row mappers and repositories. Repositories accept any `SqlExecutor`; the app uses the expo-sqlite driver and tests use the Node driver.
- `src/application` composes repositories into use cases (`ledger`, `receipts`, `setup`, `queries`, `exporter`) and defines ports for device concerns (`ReceiptFileStore`, `ReminderScheduler`, `Clock`, `IdGenerator`).
- `src/platform` implements those ports with Expo modules and guards web.
- `src/state` holds the zustand ledger store (home snapshot, settings, a `version` counter bumped after writes), the `useQuery` hook (re-runs reads when the version or dependencies change), app boot and reminder sync.
- `src/app` contains only routes and layouts. Screens call services through the store's `mutate`, which refreshes shared state after each write.

Screens never run SQL or compute balances; navigation never queries data.

## Key flows

- **Boot**: `useAppBoot` opens the database (WAL, foreign keys), runs migrations, seeds default categories once, binds services into the store and loads the home snapshot. Fonts load in parallel; the splash screen hides when both are ready.
- **Gating**: the root `Stack` uses `Stack.Protected` so onboarding is the only reachable route until `onboarding_completed` is true, after which the tabs and the rest become reachable.
- **Writes**: validate the draft in the domain, then insert the transaction and its lines inside one SQLite transaction. Transactions are serialized by a promise queue in the driver so they never overlap.
- **Receipts**: the picked image is copied into `Documents/receipts/<id>.<ext>`; only the file name is stored. Turning a receipt into an entry creates the transaction and links the receipt.
- **Reminder**: `planReminder` turns settings plus the pending receipt count into a plan; `syncReminder` cancels/schedules only when the plan changed. It runs after each ledger refresh and when the app returns to the foreground.
- **App lock**: locks at cold start and when returning from the background while enabled; unlocking uses the device biometrics or passcode.

## Web

Web is a development convenience, not a release target. `metro.config.js` adds `.wasm` to the asset extensions and the cross-origin isolation headers that expo-sqlite's WebAssembly build needs. Receipt images on web are kept in memory only.
