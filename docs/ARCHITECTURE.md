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

## The iPhone web app

The same code base ships as an installable web app (a Progressive Web App) for iPhone. Files named `*.web.ts(x)` replace their native counterparts when Metro bundles for the web.

- **Database:** `src/data/open-database.web.ts` runs SQLite compiled to WebAssembly with sql.js. The database lives in memory and `createSqlJsDriver` saves a snapshot of the whole file to IndexedDB after every committed write; a write only resolves once its snapshot is stored. The same repositories and services run unchanged, and the full integration suite runs against both the sql.js driver and `node:sqlite`. No cross-origin isolation headers are needed, so any static host works.
- **Receipt photos:** `src/platform/receipt-files.web.ts` shrinks pictures to at most 2000 px on a canvas, stores them as JPEG in Cache Storage, and hands out object URLs through `useReceiptUri`.
- **Reminder:** web apps cannot schedule notifications without a server, so `scripts/prepare-web.js` publishes one calendar file per five minutes of the day (`public/reminders/pocket-ledger-HHMM.ics`, a daily repeating event with an alert). The reminder screens open the file for the chosen time and iPhone offers to add it to Calendar. `useReminderSync` does nothing on the web.
- **Dialogs, pickers and sharing:** `askConfirm` uses native alerts on iOS/Android and an in-app dialog (`ConfirmHost`) on the web. Date and time fields hide native `<input type="date|time">` elements over the chips so iPhone shows its own wheels. Files are shared with the Web Share API (Save to Files, AirDrop) and fall back to a download.
- **Shell:** `web.output` is `single` (one page). `public/index.html` carries the Home Screen meta tags, and `scripts/build-pwa.js` fills in the base path, writes `manifest.webmanifest`, a `404.html` copy for deep links on GitHub Pages, and `sw.js`, a service worker that precaches every file so the app opens offline. Cache names carry a content hash so a new publish replaces the old version.
- **Base path:** `WEB_BASE_URL` (for example `/pocket-ledger`) sets `experiments.baseUrl`; `process.env.EXPO_BASE_URL` is inlined into the bundle and read by `src/platform/web-base.ts`.
- **Install guidance:** in Safari on iPhone the app first shows how to add it to the Home Screen, because the installed app and the Safari tab keep separate storage.
- **Publishing:** `.github/workflows/deploy-web.yml` builds with the Pages base path and deploys to GitHub Pages on every push to `main`.
