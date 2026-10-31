# Manual test checklist

Run on a real phone after changes to screens, storage or notifications.

## Onboarding

- [ ] Fresh install shows the welcome screen; the primary currency matches the phone's region.
- [ ] Choosing the same currency twice is blocked.
- [ ] Opening balances in both currencies appear on Home after finishing.
- [ ] Turning the reminder on prompts for notification permission.

## Recording

- [ ] Add an expense with the keypad in each currency; Home and the account card update.
- [ ] Add income; the account balance rises and Reports shows it under Received.
- [ ] Transfer between two accounts; totals per currency are unchanged.
- [ ] Exchange USD to the second currency; both account balances change in their own currency and Reports is unaffected.
- [ ] Edit an entry (amount, account, date); balances follow.
- [ ] Delete an entry, then Undo from the toast; balances return.

## Receipts

- [ ] Snap a receipt from the Receipts tab; it appears under "Needs an amount" and the tab badge increments.
- [ ] Add the amount from the receipt; it moves to "Recorded" and opens the transaction.
- [ ] Attach a photo from inside the add form; it appears on the transaction detail.
- [ ] Delete a receipt; the file disappears and the linked entry stays.

## Reminder

- [ ] Set the reminder a few minutes ahead and lock the phone; the notification arrives (Expo Go may be a few minutes late on Android).
- [ ] Tap the notification; the app opens on the new-expense screen.
- [ ] Turn the reminder off; no notification arrives.

## Accounts and settings

- [ ] Adjust a balance; an adjustment entry appears and the balance matches the counted amount.
- [ ] Remove an account with history; it is archived and can be restored.
- [ ] Replacing a currency with history is blocked; swapping primary and secondary works.
- [ ] Dark mode follows the system and the manual setting.
- [ ] App lock: enable, background the app, return; the lock screen appears and biometrics unlock it.
- [ ] Export CSV; open it in a spreadsheet and check amounts and currencies.
- [ ] Erase all data returns to onboarding.
