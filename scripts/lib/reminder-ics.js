/**
 * Builds the calendar file used as the nightly reminder in the web app.
 * A web page cannot schedule its own notifications, so the reminder is a
 * daily repeating calendar event with an alert, imported once into Calendar.
 */

const MINUTE_STEP = 5;

function pad(value) {
  return String(value).padStart(2, '0');
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\;');
}

/** Folds content lines longer than 75 octets, as RFC 5545 requires. */
function fold(line) {
  const parts = [];
  let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 75) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function slotName(hour, minute) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new RangeError(`Invalid hour ${hour}`);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59 || minute % MINUTE_STEP !== 0) {
    throw new RangeError(`Minute must be a multiple of ${MINUTE_STEP}, received ${minute}`);
  }
  return `${pad(hour)}${pad(minute)}`;
}

function reminderFileName(hour, minute) {
  return `pocket-ledger-${slotName(hour, minute)}.ics`;
}

function buildReminderIcs(hour, minute, options = {}) {
  const slot = slotName(hour, minute);
  const title = options.title || "Record today's spending";
  const description =
    options.description ||
    'Open Pocket Ledger and add what you spent today. Receipts can wait in the inbox.';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pocket Ledger//Nightly reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // One stable UID so adding a new time updates the event instead of duplicating it.
    'UID:nightly-spending-reminder@pocket-ledger',
    'DTSTAMP:20260101T000000Z',
    `DTSTART:20260101T${slot}00`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(options.url ? [`URL:${options.url}`] : []),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Every slot published by the build: one file per five minutes of the day. */
function allSlots() {
  const slots = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += MINUTE_STEP) slots.push({ hour, minute });
  }
  return slots;
}

module.exports = { MINUTE_STEP, allSlots, buildReminderIcs, reminderFileName };
