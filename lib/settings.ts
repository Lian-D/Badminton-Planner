import "server-only";
import { db } from "./db";

/** Persistent key/value settings (the `settings` table). */
export function getSetting(key: string): string | undefined {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;
}

export function putSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

export function deleteSetting(key: string) {
  db.prepare("DELETE FROM settings WHERE key = ?").run(key);
}

/** Normalise an admin-entered site URL: http(s) only, no trailing slash. Returns null if invalid. */
export function normaliseSiteUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return (u.origin + u.pathname).replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Public URL of this app, for links in Discord messages. Admin setting, then SITE_URL env. */
export function siteUrl(): string | null {
  return getSetting("site_url") || (process.env.SITE_URL ? normaliseSiteUrl(process.env.SITE_URL) : null) || null;
}
