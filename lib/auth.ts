import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken, newToken } from "./passwords";

export const AUTH_COOKIE = "auth";
const SESSION_DAYS = 30;

export type Role = "admin" | "host";
export type Account = { id: number; username: string; role: Role };

/** The signed-in court-manager account, if any. */
export async function getAccount(): Promise<Account | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT a.id, a.username, a.role
         FROM auth_sessions s JOIN accounts a ON a.id = s.account_id
        WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .get(hashToken(token));
  return row ? { ...(row as Account) } : null;
}

export async function startSession(accountId: number) {
  const token = newToken();
  db.prepare("DELETE FROM auth_sessions WHERE expires_at <= datetime('now')").run();
  db.prepare(
    `INSERT INTO auth_sessions (token_hash, account_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`,
  ).run(hashToken(token), accountId);
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (token) db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(hashToken(token));
  store.delete(AUTH_COOKIE);
}

export function accountCount(): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number }).n;
}

export function signupsEnabled(): boolean {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'signups_enabled'").get() as
    | { value: string }
    | undefined;
  return row?.value !== "0"; // on by default
}

export function setSignupsEnabled(on: boolean) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('signups_enabled', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(on ? "1" : "0");
}

export function adminCount(): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role = 'admin'").get() as { n: number }).n;
}
