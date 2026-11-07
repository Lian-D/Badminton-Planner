import "server-only";
import { addDays, localToday, shortDate, votingWeek } from "./dates";
import { sendNow } from "./discord";
import { getSetting, putSetting } from "./settings";

/** Hour (server local time) from which the weekly vote reminder may go out. */
const REMINDER_HOUR = 9;

/**
 * Posts "vote for next week's courts" once per voting week. The voting week
 * rolls over on Saturday, so this normally goes out Saturday morning.
 */
export async function checkWeeklyVoteReminder(now = new Date()) {
  if (now.getHours() < REMINDER_HOUR) return;
  const week = votingWeek(localToday());
  if (getSetting("discord_last_vote_week") === week) return;
  const sent = await sendNow("weeklyVote", {
    title: `🏸 Vote for courts: ${shortDate(week)} – ${shortDate(addDays(week, 4))}`,
    description: "Mon–Fri, 7–9 pm or 8–10 pm. Tap the slots you can make.",
    path: `/vote?week=${week}`,
  });
  if (sent) putSetting("discord_last_vote_week", week);
}

export function startScheduler() {
  const g = globalThis as unknown as { __bpScheduler?: boolean };
  if (g.__bpScheduler) return;
  g.__bpScheduler = true;
  const tick = () => checkWeeklyVoteReminder().catch((e) => console.warn("[scheduler]", (e as Error).message));
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);
}
