import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { addDays, DAYS, shortDate, SLOTS } from "./dates";
import { getSetting, putSetting, deleteSetting, siteUrl } from "./settings";

/**
 * Discord webhook notifications. Settings persist in the `settings` table and
 * are managed by admins. Messages are sent with after(), so a slow or failing
 * webhook never delays the user's action.
 */

export const DISCORD_EVENTS = {
  sessions: { label: "Court sessions logged", default: true },
  payments: { label: "Payments (ticked Paid, Mark paid, custom)", default: true },
  accounts: { label: "New accounts", default: true },
  weeklyVote: { label: "Weekly vote reminder", default: true },
  votes: { label: "When someone votes", default: true },
} as const;
export type DiscordEvent = keyof typeof DISCORD_EVENTS;

const WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,25}\/[\w-]{20,100}$/;
export const isWebhookUrl = (url: string) => WEBHOOK.test(url);

const get = getSetting;
const put = putSetting;

export type DiscordSettings = { url: string | null; events: Record<DiscordEvent, boolean> };

export function getDiscordSettings(): DiscordSettings {
  const saved = JSON.parse(get("discord_events") ?? "{}") as Partial<Record<DiscordEvent, boolean>>;
  const events = Object.fromEntries(
    (Object.keys(DISCORD_EVENTS) as DiscordEvent[]).map((e) => [e, saved[e] ?? DISCORD_EVENTS[e].default]),
  ) as Record<DiscordEvent, boolean>;
  return { url: get("discord_webhook_url") || null, events };
}

export function saveDiscordSettings(url: string | null, events: Record<DiscordEvent, boolean>) {
  if (url !== null) put("discord_webhook_url", url);
  put("discord_events", JSON.stringify(events));
}

export function clearDiscordWebhook() {
  deleteSetting("discord_webhook_url");
}

/** "https://discord.com/api/webhooks/123…/abc…wxyz" → safe to show in the UI */
export const maskWebhook = (url: string) => url.replace(/\/([\w-]+)$/, (_, t: string) => `/••••${t.slice(-4)}`);

export type DiscordMessage = {
  title: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  actor?: string;
  /** App path to link to, e.g. "/vote". Becomes a full link when a site URL is set. */
  path?: string;
  /** Absolute link (filled in from `path` + site URL). */
  url?: string;
};

const withLink = (msg: DiscordMessage): DiscordMessage => {
  const base = siteUrl();
  return base && msg.path ? { ...msg, url: base + msg.path } : msg;
};

/** Sends right away. Returns an error message, or null on success. */
export async function deliver(url: string, msg: DiscordMessage, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!isWebhookUrl(url)) return "That isn't a Discord webhook URL.";
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        username: "Badminton Planner",
        allowed_mentions: { parse: [] }, // names like "@everyone" never ping
        embeds: [
          {
            title: msg.title.slice(0, 256),
            url: msg.url,
            description: [msg.description, msg.url ? `[Open Badminton Planner](${msg.url})` : undefined]
              .filter(Boolean)
              .join("\n\n")
              .slice(0, 2000) || undefined,
            color: 0xc8f31d,
            fields: msg.fields?.slice(0, 10).map((f) => ({ ...f, name: f.name.slice(0, 256), value: f.value.slice(0, 1024) })),
            footer: msg.actor ? { text: `by ${msg.actor}` } : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) return `Discord replied ${res.status}. Check the webhook URL.`;
    return null;
  } catch (err) {
    return `Couldn't reach Discord: ${(err as Error).message}`;
  }
}

/** Queue a notification for after the response, if that event is switched on. */
export function notify(event: DiscordEvent, build: () => DiscordMessage) {
  const { url, events } = getDiscordSettings();
  if (!url || !events[event]) return;
  const msg = withLink(build());
  after(async () => {
    const error = await deliver(url, msg);
    if (error) console.warn(`[discord] ${event}: ${error}`);
  });
}

/** Send immediately (outside a request, e.g. from the scheduler). Returns true if sent. */
export async function sendNow(event: DiscordEvent, msg: DiscordMessage): Promise<boolean> {
  const { url, events } = getDiscordSettings();
  if (!url || !events[event]) return false;
  const error = await deliver(url, withLink(msg));
  if (error) console.warn(`[discord] ${event}: ${error}`);
  return !error;
}

// ---- Per-person vote notifications (debounced) ------------------------------

const VOTE_DELAY_MS = Number(process.env.VOTE_NOTIFY_DELAY_MS ?? 45_000);
const g = globalThis as unknown as {
  __bpVoteTimers?: Map<string, ReturnType<typeof setTimeout>>;
  __bpVoteAnnounced?: Set<string>;
};
const timers = (g.__bpVoteTimers ??= new Map());
const announced = (g.__bpVoteAnnounced ??= new Set());

export function voteSummary(voterId: number, week: string): string[] {
  const rows = db
    .prepare("SELECT day, slot FROM votes WHERE voter_id = ? AND week_start = ? ORDER BY day, slot")
    .all(voterId, week) as { day: number; slot: string }[];
  return rows.map(
    (r) => `${DAYS[r.day].slice(0, 3)} ${shortDate(addDays(week, r.day))}, ${SLOTS.find((s) => s.id === r.slot)?.label ?? r.slot}`,
  );
}

/**
 * Called on every vote tap. Waits until the person stops tapping, then posts
 * their whole choice for the week in one message.
 */
export function queueVoteNotification(voter: { id: number; name: string }, week: string) {
  const { url, events } = getDiscordSettings();
  if (!url || !events.votes) return;
  const key = `${voter.id}:${week}`;
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      const picks = voteSummary(voter.id, week);
      const first = !announced.has(key);
      announced.add(key);
      const range = `${shortDate(week)} – ${shortDate(addDays(week, 4))}`;
      void sendNow("votes", {
        title: picks.length
          ? `🗳️ ${voter.name} ${first ? "voted" : "updated their vote"} for ${range}`
          : `🗳️ ${voter.name} can't make any slots for ${range}`,
        description: picks.length ? picks.map((p) => `• ${p}`).join("\n") : undefined,
        path: `/vote?week=${week}`,
      });
    }, VOTE_DELAY_MS),
  );
}
