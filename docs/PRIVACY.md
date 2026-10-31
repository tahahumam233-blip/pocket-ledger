# Privacy and security

## Where data lives

- The ledger is a SQLite database inside the app's private storage on the device.
- Receipt photos are copied into the app's private `Documents/receipts` folder. The original photo in the gallery is untouched.
- Settings (currencies, reminder time, theme, app-lock flag) live in the same database.

Nothing is sent anywhere. There is no backend, sync, crash reporting, analytics or advertising SDK. The only network use is Expo's development tooling while developing.

## Permissions

| Permission          | Why                         | When asked                      |
| ------------------- | --------------------------- | ------------------------------- |
| Notifications       | The nightly reminder        | When you turn the reminder on   |
| Camera              | Snapping receipts           | First time you use the camera   |
| Photo library (iOS) | Picking an existing picture | First time you pick from photos |
| Biometrics          | Optional app lock           | When you enable the lock        |

## Honest limitations

- The database is not separately encrypted; it relies on the phone's own storage encryption and lock screen. The app lock hides the UI but is not a cryptographic boundary.
- Deleting the app deletes the ledger and the receipt photos. Phone-level backups (iCloud / Google) may include app data depending on OS settings; the app itself has no backup feature yet.
- CSV export writes a temporary file to the app cache and hands it to the system share sheet; wherever you send it is outside the app's control.
- In Expo Go, data lives inside Expo Go's sandbox for this project.
