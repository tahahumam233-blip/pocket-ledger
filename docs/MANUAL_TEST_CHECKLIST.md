# Manual test checklist

Record device/OS, app version/commit, date, and result when executing a release-oriented pass. Phase-specific checks are cumulative as features land.

## Phase 0 — Foundation shell

### Setup and startup

- [ ] From the repository root, run `npm ci` successfully.
- [ ] Run `npm run start -- --clear` and confirm Metro reaches a ready state without an immediate runtime/bundle error.
- [ ] Open on an Android emulator/device with `npm run android` or the Metro shortcut.
- [ ] On macOS or a physical iOS workflow, open with `npm run ios` or the Metro shortcut.
- [ ] Optionally open `npm run web` as a development-only shell check.

### Navigation

- [ ] App opens to Dashboard and displays Pocket Ledger branding.
- [ ] Dashboard, Activity, Reports, and Settings tabs are visible and each opens its named screen.
- [ ] Every tab has a visible Add Transaction button.
- [ ] Add Transaction opens a modal/route that clearly says entry is unavailable until Phase 4.
- [ ] Close returns to the originating main screen; Android hardware/software Back also behaves safely.
- [ ] An invalid route shows Page not found and Go to dashboard recovers.

### Honesty and content

- [ ] No sample wallet, amount, transaction, report, or persisted-data claim appears.
- [ ] Dashboard says wallet setup is Phase 3.
- [ ] Activity says real transaction entry is Phase 4.
- [ ] Reports says reports arrive in Phase 7.
- [ ] Settings identifies planned features without interactive controls that imply persistence.

### Theme and layout

- [ ] Switch the device between light and dark mode; background, cards, text, tabs, status bar, and controls remain readable.
- [ ] On a small phone, titles/body/buttons do not clip and content scrolls.
- [ ] Increase system font size; primary content remains understandable and actions remain reachable.
- [ ] Rotate the device; portrait orientation remains enforced by configuration.

### Accessibility

- [ ] With VoiceOver/TalkBack, each tab and button has an understandable name and role.
- [ ] Decorative placeholder icons are not announced as unlabeled controls.
- [ ] Focus order follows brand/title/subtitle/content/action.
- [ ] Add Transaction and Close targets are comfortably tappable.
- [ ] Meaning is conveyed by text, not color alone.

### Recovery

- [ ] During development, temporarily throw from a child route and confirm the generic Pocket Ledger error fallback appears without the raw message/stack.
- [ ] Tap Try again after removing the injected throw and confirm the route recovers.
- [ ] Remove the temporary throw and verify no test-only fault remains in Git diff.

### Automated gates to record

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run check`
- [ ] `npm run doctor`

## Future critical flows

Add detailed, executable sections in their owning phases for onboarding; wallet/category lifecycle; expense/income/transfer/fee/adjustment; edit/delete/undo/restore; credit-card purchase/payment; search/combined filters; reconciliation; reminder permission/scheduling; report currency grouping; CSV safety; backup round trip/failed restore; app lock lifecycle; reset; and release build regression.
