import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayInTimezone(tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function weekdayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

// ISO-week start: the Monday on or before the given date.
export function weekStartFor(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = (dow + 6) % 7; // days since most recent Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

// Retro day defaults to the day before the user's sabbath, so the rhythm
// is "reflect, then rest." If the user has no sabbath, default to Sunday.
export function retroDayForSabbath(sabbath: string): Weekday {
  if (sabbath === "none") return "sunday";
  const idx = WEEKDAYS.indexOf(sabbath as Weekday);
  if (idx === -1) return "sunday";
  return WEEKDAYS[(idx + 6) % 7];
}
