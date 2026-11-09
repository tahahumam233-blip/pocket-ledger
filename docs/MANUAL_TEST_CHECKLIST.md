# Manual test checklist

Run on a real phone after changes to screens, storage or notifications.

## Onboarding

- [ ] Fresh install shows the welcome screen; the primary currency matches the phone's region.
- [ ] Choosing the same currency twice is blocked.
- [ ] Opening balances in both currencies appear on Home after finishing.
- [ ] Turning the reminder on prompts for notification permission.

## Recording

- [ ] Add an expense with the keypad in each currency; Home and the account card update.
- [ ] Tap the eye on the Home card: every amount on Home, Activity, Reports, account and party screens, statements and the add form shows as dots with the currency kept; negative balances are not red and the below-zero warning stays quiet. The amount you type in the add form stays visible.
- [ ] Close and reopen the app: amounts are still hidden. Tap the eye on Activity or Reports: amounts show everywhere again. VoiceOver reads the button as "Hide amounts" or "Show amounts".
- [ ] The add form shows every cash and bank account as a tile with its balance under "Paid from" (expense), "Received into" (income), "From" and "To" (transfer); the chosen tile is filled in its colour with a tick, and VoiceOver reads it as selected.
- [ ] Typing an amount shows "Account before → after"; an expense larger than the balance shows the amber "below zero" warning but still saves.
- [ ] The default account is the one the last expense (or income, transfer, loan) used; opening balances and reconciliations never change it; switching type before touching the tiles follows that type's last account.
- [ ] After saving, the message names the account ("Expense of $25.00 posted from Pocket") and Edit opens the entry.
- [ ] "Paid by a party instead" swaps the tiles for a party row; "Use cash or bank instead" brings them back.
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
- [ ] Split: pay $30 from Bank, tap "Split with a party", add a colleague and type $18. The card shows Your expense $12.00; Bank drops by $30; Reports show $12 and one expense; the colleague's statement shows "Paid on behalf from Bank: Food & Drink" with a debit of $18.
- [ ] Split equally between you and two colleagues; the odd cent stays with you. Editing the entry changes every share together, and deleting it removes the expense and the receivables at once.
- [ ] A share equal to the whole payment shows the warning and "Post as loan given", which switches to a loan given to that colleague.
- [ ] The colleague repays in cash: Receive, Repayment received, Pocket. Their balance reaches nil.
- [ ] Activity: the Loans filter shows only loan entries; searching a party's name finds their entries.
- [ ] Reports never count loans or repayments.
