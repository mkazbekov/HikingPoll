// Slot helpers. A "slot key" is a wall-clock local time string of the form
// "YYYY-MM-DDTHH:mm" (fixed width, so it sorts lexicographically). We deliberately
// avoid timezones: everyone plans in the trip's local time, and the string round-trips
// through the database untouched.

export const SLOT_KEY_LENGTH = 16; // "2026-07-13T06:15"

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Build a slot key from date parts. */
export function slotKey(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/** "YYYY-MM-DD" date key for a Date (local). */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Slot key -> the "YYYY-MM-DD" portion. */
export function slotDate(key: string): string {
  return key.slice(0, 10);
}

/** Slot key -> "HH:mm" portion. */
export function slotTime(key: string): string {
  return key.slice(11);
}

/** Human label for the time portion, e.g. "6:15 AM". */
export function formatTimeLabel(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}:${pad(minute)} ${period}`;
}

/** All the 15-min (or slotMinutes) time rows for a day, as {hour, minute, label}. */
export function timeRows(
  dayStartHour: number,
  dayEndHour: number,
  slotMinutes: number,
): { hour: number; minute: number; label: string; key: string }[] {
  const rows: { hour: number; minute: number; label: string; key: string }[] = [];
  for (let h = dayStartHour; h < dayEndHour; h++) {
    for (let m = 0; m < 60; m += slotMinutes) {
      rows.push({
        hour: h,
        minute: m,
        label: formatTimeLabel(h, m),
        key: `${pad(h)}:${pad(m)}`,
      });
    }
  }
  return rows;
}

/** Inclusive list of date keys between two "YYYY-MM-DD" bounds. */
export function dateRange(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function weekdayShort(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function monthName(monthIndex0: number): string {
  return MONTHS[monthIndex0];
}

export function monthShort(monthIndex0: number): string {
  return MONTHS_SHORT[monthIndex0];
}

/** Group a flat list of date keys into weeks (arrays of 7, aligned Sun..Sat). */
export function groupIntoWeeks(dateKeys: string[]): string[][] {
  if (dateKeys.length === 0) return [];
  const weeks: string[][] = [];
  let current: string[] = [];
  for (const key of dateKeys) {
    const d = parseDateKey(key);
    if (current.length > 0 && d.getDay() === 0) {
      weeks.push(current);
      current = [];
    }
    current.push(key);
  }
  if (current.length) weeks.push(current);
  return weeks;
}

/** Pretty range label e.g. "Jul 13 – Sep 6, 2026". */
export function formatRangeLabel(startKey: string, endKey: string): string {
  const s = parseDateKey(startKey);
  const e = parseDateKey(endKey);
  const sameYear = s.getFullYear() === e.getFullYear();
  const left = `${monthShort(s.getMonth())} ${s.getDate()}${sameYear ? "" : `, ${s.getFullYear()}`}`;
  const right = `${monthShort(e.getMonth())} ${e.getDate()}, ${e.getFullYear()}`;
  return `${left} – ${right}`;
}
