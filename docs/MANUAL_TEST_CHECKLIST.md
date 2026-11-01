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

- [ ] Set the reminder a few minutes ahead and lock the phone; the notification arrives (native build).
- [ ] Tap the notification; the app opens on the new-expense screen.
- [ ] Turn the reminder off; no notification arrives.

## Accounts and settings

- [ ] Reconcile an account; a reconciliation adjustment appears and the balance matches the counted amount.
- [ ] Remove an account with history; it is archived and can be restored.
- [ ] Replacing a currency with history is blocked; swapping primary and secondary works.
- [ ] Dark mode follows the system and the manual setting.
- [ ] App lock: enable, background the app, return; the lock screen appears and biometrics unlock it.
- [ ] Export CSV; open it in a spreadsheet and check amounts and currencies.
- [ ] Erase all data returns to onboarding.

## iPhone web app

- [ ] Opening the address in Safari shows the Add to Home Screen guide.
- [ ] After adding to the Home Screen, the app opens full screen with the Ledger icon and no Safari bars.
- [ ] Setup's "Add reminder to Calendar" shows the iPhone Add to Calendar screen; the event repeats daily with an alert at the chosen time.
- [ ] Record entries, close the app from the app switcher, reopen: everything is still there.
- [ ] Turn on Airplane Mode and reopen the app: it loads with all data.
- [ ] Snap a receipt: the camera opens directly; the photo appears in the inbox and survives a restart.
- [ ] The date and time chips open the iPhone wheels.
- [ ] Back up now offers Save to Files; the file appears in iCloud Drive.
- [ ] Erase all data, then Restore from a backup on the first screen: entries and photos return.
- [ ] Publish a change and reopen the app twice: the new version appears.

## Receivables and payables

- [ ] Home shows "Loans given or received?" until the first party exists, then the Receivables & payables card with Receivables and Payables totals.
- [ ] Loan: post a loan given to a new party typed in the picker; the preview shows "Receivable from Name"; Pocket drops by the amount.
- [ ] On the party, "Receive" proposes "Repayment received" while the balance is receivable; the receivable drops.
- [ ] "Expense paid by party" posts an expense that appears in Reports and credits the party.
- [ ] "Settle USD balance" prefills the exact amount and leaves a nil balance.
- [ ] Statement: periods change the opening balance b/f; Debit and Credit labels and Dr/Cr running balances are correct; opening + total debits − total credits = closing balance c/f, which matches the party balance; Share opens the share sheet with the text; Export CSV saves a file.
- [ ] Add a party with an opening balance marked Payable; they appear under Payables.
- [ ] A due date shows "Due in N days" and turns red when overdue.
- [ ] Removing a party with history archives them; Show archived lists them and Restore brings them back.
- [ ] Activity: the Loans filter shows only loan entries; searching a party's name finds their entries.
- [ ] Reports never count loans or repayments.
