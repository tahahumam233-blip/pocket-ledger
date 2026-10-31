# Pocket Ledger

A private, offline spending tracker for iPhone and Android, built with Expo and React Native.

- **Two currencies, never mixed.** Pick a primary and a secondary currency; every total is shown per currency.
- **Safe, Pocket and Bank.** Three accounts out of the box (add more if you like), each holding both currencies.
- **Snap receipts now, add the amount later.** Photos wait in an inbox until you record them.
- **A nightly reminder** at the time you choose, scheduled on the phone itself.
- **Reports** by category and by month, transfers and exchanges between currencies, balance adjustments, CSV export, dark mode and an optional Face ID / fingerprint lock.
- **No account, no cloud, no ads.** Everything stays on the phone.

![App icon](assets/images/splash-icon.png)

## Get it on your phone

The quickest free path is **Expo Go**. You need a computer with [Node.js 22](https://nodejs.org) and a phone on the same Wi-Fi. If you have never done this before, follow [docs/GET_IT_ON_YOUR_PHONE.md](docs/GET_IT_ON_YOUR_PHONE.md), which walks through every step, including building an installable Android APK and the options for iPhone.

The short version:

```sh
git clone <this repository>
cd pocket-ledger
npm install
npx expo login        # free Expo account, needed for iPhone
npx expo start
```

Then install **Expo Go** from the App Store or Google Play, sign in with the same Expo account, and scan the QR code shown in the terminal (iPhone: Camera app; Android: the Expo Go app). If the phone cannot reach the computer, run `npx expo start --tunnel` instead.

For a real app icon on the home screen, build an installable Android APK with EAS (free tier):

```sh
npm install -g eas-cli
eas login
eas init              # creates the project; copy the printed ID into src/config/brand.json
npm run build:android # eas build --platform android --profile preview
```

The build page shows a QR code; open it on the phone to download and install the APK. See the guide for iPhone options, which require a paid Apple developer account for anything beyond Expo Go.

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
npm run android        # open on a connected Android device / emulator
npm run ios            # open in the iOS Simulator (macOS)
npm run web            # browser preview (SQLite runs in WebAssembly)
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
src/platform/       Thin adapters over device APIs (files, notifications, camera, haptics)
src/state/          Zustand store, query hook, boot and reminder sync
src/features/       Feature-specific screens and hooks
docs/               Product, architecture, data model, privacy, decisions, backlog
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rules and [docs/ACCOUNTING_RULES.md](docs/ACCOUNTING_RULES.md) for the invariants every ledger change must keep.

## Privacy

All data lives in a SQLite database and a private folder inside the app on the device. There is no backend, sync, analytics or advertising. Deleting the app deletes the ledger; export a CSV from Settings if you want a copy. Details are in [docs/PRIVACY.md](docs/PRIVACY.md).
