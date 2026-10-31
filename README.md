# Pocket Ledger

A private, offline spending tracker for iPhone, built with Expo and React Native.

- **Two currencies, never mixed.** Pick a primary and a secondary currency; every total is shown per currency.
- **Safe, Pocket and Bank.** Three accounts out of the box (add more if you like), each holding both currencies.
- **Snap receipts now, add the amount later.** Photos wait in an inbox until you record them.
- **A nightly reminder** at the time you choose, as a daily Calendar alert (or a notification in the optional native build).
- **Reports** by category and by month, transfers and exchanges between currencies, balance adjustments, CSV export, backup and restore with photos, dark mode, and an optional Face ID lock in the native build.
- **No account, no cloud, no ads.** Everything stays on the phone.

![App icon](assets/images/splash-icon.png)

## Get it on your phone

Install the free web app on your Home Screen. It opens full screen like any app, works offline and needs no computer once published. Publish it once with GitHub Pages (the **Publish iPhone web app** workflow), open the address in Safari, then Share, Add to Home Screen:

`https://tahahumam233-blip.github.io/pocket-ledger/`

Every step, including the one-time publishing setup and backups, is in [docs/GET_IT_ON_YOUR_PHONE.md](docs/GET_IT_ON_YOUR_PHONE.md).

## What the app does

| Area       | Behaviour                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding | Choose two currencies (the phone's local currency is pre-selected), turn on Safe / Pocket / Bank, enter opening balances, set the reminder time.                                            |
| Home       | Total balance per currency, spent today and this month, account cards, quick actions, pending-receipt banner, recent entries.                                                               |
| Add        | Expense, income or transfer with a large keypad, currency toggle, account and category pickers, date chips, note and receipt photos. Transfers can be exchanges between the two currencies. |
| Activity   | Month-by-month list grouped by day with search, type and currency filters, and per-month totals.                                                                                            |
| Receipts   | Camera or photo library capture into an inbox; "Add the amount" turns a receipt into an expense and links the photo.                                                                        |
| Reports    | Spent, received and net per currency, spending by category with a ring chart, and a six-month trend.                                                                                        |
| Accounts   | Balances per currency, history, and "Adjust" to reconcile to what you actually counted.                                                                                                     |
| Settings   | Currencies, reminder time, appearance, app lock, accounts, categories, CSV export, privacy notes, erase all data.                                                                           |

## Development

```sh
npm install
npm run start          # Expo dev server
npm run ios            # open in the iOS Simulator (macOS)
npm run web            # browser preview of the web app
npm run build:web      # build the installable web app into dist/ (set WEB_BASE_URL for a sub-path)
npm run preview:web    # serve dist/ locally the way GitHub Pages would
npm run check          # prettier, eslint, strict TypeScript and jest
npm run test:watch
npm run doctor         # expo-doctor
```

Node.js 22 or newer and npm 10 or newer are required. Use `npm ci` for a clean install from the lockfile.

## Project layout

```
src/app/            Expo Router routes (navigation only)
src/components/     Reusable UI primitives
src/design/         Colour, spacing and typography tokens, theme provider
src/domain/         Pure TypeScript accounting rules (no React, no SQLite)
src/data/           SQLite schema, migrations, repositories, driver abstraction
src/application/    Use cases: ledger, receipts, onboarding, reminders, export
src/platform/       Thin adapters over device APIs; *.web.ts files are the iPhone web app versions
src/state/          Zustand store, query hook, boot and reminder sync
src/features/       Feature-specific screens and hooks
scripts/            Web build helpers: reminder calendar files, service worker, local server
public/             Web app HTML shell and Home Screen icons
docs/               Product, architecture, data model, privacy, decisions, backlog
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rules and [docs/ACCOUNTING_RULES.md](docs/ACCOUNTING_RULES.md) for the invariants every ledger change must keep.

## Privacy

All data lives on the phone: a SQLite database and receipt photos inside the app's private storage (in the web app, the installed app's browser storage). There is no backend, sync, analytics or advertising. Deleting the app deletes the ledger, so use Settings, Back up now to keep a copy in iCloud Drive or Files. Details are in [docs/PRIVACY.md](docs/PRIVACY.md).
