/**
 * Prepares files the web app loads at runtime: the SQLite WebAssembly binary
 * and the nightly-reminder calendar files. Output goes to public/ (git-ignored)
 * and is copied into the export by `expo export`.
 */
const fs = require('fs');
const path = require('path');

const { allSlots, buildReminderIcs, reminderFileName } = require('./lib/reminder-ics');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(
  require.resolve('sql.js/dist/sql-wasm-browser.wasm'),
  path.join(publicDir, 'sql-wasm-browser.wasm'),
);

const remindersDir = path.join(publicDir, 'reminders');
fs.rmSync(remindersDir, { recursive: true, force: true });
fs.mkdirSync(remindersDir, { recursive: true });
const appUrl = process.env.WEB_APP_URL || '';
for (const { hour, minute } of allSlots()) {
  fs.writeFileSync(
    path.join(remindersDir, reminderFileName(hour, minute)),
    buildReminderIcs(hour, minute, { url: appUrl || undefined }),
  );
}

console.log(`Prepared web assets in ${path.relative(root, publicDir)}`);
