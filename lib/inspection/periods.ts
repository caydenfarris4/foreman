// Period math for the in-between cascade check-ins (BUILD_SPEC §3.4). Each
// check-in type covers a period keyed by a single date: the day, the
// week-start (Monday), or the month-start. Pure and unit-tested.

import { weekStartFor } from "@/lib/utils";
import type { CascadeCheckinType, GoalLevel } from "@/lib/database.types";

/** The date that identifies the period a check-in of `type` covers. */
export function periodDateFor(
  type: CascadeCheckinType,
  todayISO: string,
): string {
  if (type === "daily") return todayISO;
  if (type === "weekly") return weekStartFor(todayISO);
  // monthly: first of the month
  return `${todayISO.slice(0, 7)}-01`;
}

/** The cascade level whose goals a check-in of `type` works on. */
export function checkinLevelFor(type: CascadeCheckinType): GoalLevel {
  return type; // daily/weekly/monthly are also goal levels
}

/** The parent level a check-in reviews its goals *against* (its anchor). */
export function checkinAnchorLevelFor(
  type: CascadeCheckinType,
): GoalLevel {
  if (type === "daily") return "weekly";
  if (type === "weekly") return "monthly";
  return "six_month"; // monthly is reviewed against the six-month milestone
}

export const CASCADE_CHECKIN_TYPES: readonly CascadeCheckinType[] = [
  "daily",
  "weekly",
  "monthly",
];
