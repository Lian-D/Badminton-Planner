// Date helpers on plain YYYY-MM-DD strings (UTC math, so no timezone drift).

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const SLOTS = [
  { id: "7-9", label: "7–9 pm" },
  { id: "8-10", label: "8–10 pm" },
] as const;
export type SlotId = (typeof SLOTS)[number]["id"];

export const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

/** Today in the server's local timezone. */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
const weekday = (iso: string) => (new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7;

export const mondayOf = (iso: string) => addDays(iso, -weekday(iso));

/** The week people are voting on: this week on weekdays, next week at the weekend. */
export function votingWeek(today: string): string {
  return weekday(today) >= 5 ? addDays(mondayOf(today), 7) : mondayOf(today);
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
