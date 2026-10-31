# Privacy and security

## Where data lives

- The ledger is a SQLite database inside the app's private storage on the device.
- Receipt photos are copied into the app's private `Documents/receipts` folder. The original photo in the gallery is untouched.
- Settings (currencies, reminder time, theme, app-lock flag) live in the same database.

Nothing is sent anywhere. There is no backend, sync, crash reporting, analytics or advertising SDK. The only network use is Expo's development tooling while developing.

## The iPhone web app

- The web address only delivers the app's code. Entries, settings and photos are stored in the installed app's own browser storage (IndexedDB and Cache Storage) on the iPhone and are never sent anywhere.
- The installed Home Screen app and a Safari tab have separate storage. Use the installed app.
- Removing the app from the Home Screen deletes its storage. Back up regularly from Settings.
- The app asks the browser for persistent storage; installed Home Screen web apps are not subject to Safari's automatic clean-up of website data.
- The nightly reminder is an event in your own Calendar. It contains only the reminder text, never amounts.

## Permissions

| Permission          | Why                         | When asked                      |
| ------------------- | --------------------------- | ------------------------------- |
| Notifications       | The nightly reminder        | When you turn the reminder on   |
| Camera              | Snapping receipts           | First time you use the camera   |
| Photo library (iOS) | Picking an existing picture | First time you pick from photos |
| Biometrics          | Optional app lock           | When you enable the lock        |

## Honest limitations

- The database is not separately encrypted; it relies on the phone's own storage encryption and lock screen. The app lock hides the UI but is not a cryptographic boundary.
- Deleting the app deletes the ledger and the receipt photos. Use Settings, Back up now, and keep the file somewhere safe; the backup file itself is not encrypted, so store it like any personal document.
- CSV export writes a temporary file to the app cache and hands it to the system share sheet; wherever you send it is outside the app's control.
- In Expo Go, data lives inside Expo Go's sandbox for this project.
