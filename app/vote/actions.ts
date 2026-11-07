"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { CacheKeys, invalidate } from "@/lib/cache";
import { queueVoteNotification } from "@/lib/discord";
import { isIsoDate, mondayOf, SLOTS } from "@/lib/dates";
import { checkPassword, getCurrentVoter, hashPassword, newToken, VOTER_COOKIE } from "@/lib/voters";

/** `name` is echoed back so the form can keep it after an error. */
export type SignInState = { error?: string; name?: string } | undefined;

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Enter your name." };
  if (name.length > 40) return { error: "Keep your name under 40 characters.", name };

  const existing = db
    .prepare("SELECT id, password_hash AS hash, token FROM voters WHERE name = ?")
    .get(name) as { id: number; hash: string | null; token: string } | undefined;

  let token: string;
  if (existing) {
    // Same as when2meet: a name without a password can be picked up by anyone.
    if (existing.hash && !checkPassword(password, existing.hash)) {
      return { error: `Wrong password for “${name}”. Ask an admin to reset it if you've forgotten.`, name };
    }
    // No password yet (new, or reset by an admin): whoever signs in can set one now.
    if (!existing.hash && password) {
      db.prepare("UPDATE voters SET password_hash = ? WHERE id = ?").run(hashPassword(password), existing.id);
    }
    token = existing.token;
  } else {
    token = newToken();
    db.prepare("INSERT INTO voters (name, password_hash, token) VALUES (?, ?, ?)").run(
      name,
      password ? hashPassword(password) : null,
      token,
    );
  }

  (await cookies()).set(VOTER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  refresh();
}

export async function signOut() {
  (await cookies()).delete(VOTER_COOKIE);
  refresh();
}

export async function toggleVote(week: string, day: number, slot: string, on: boolean) {
  const voter = await getCurrentVoter();
  if (!voter) return { error: "Sign in to vote." };
  if (!isIsoDate(week) || mondayOf(week) !== week) return { error: "Bad week." };
  if (!Number.isInteger(day) || day < 0 || day > 4) return { error: "Bad day." };
  if (!SLOTS.some((s) => s.id === slot)) return { error: "Bad slot." };

  if (on) {
    db.prepare(
      "INSERT OR IGNORE INTO votes (voter_id, week_start, day, slot) VALUES (?, ?, ?, ?)",
    ).run(voter.id, week, day, slot);
  } else {
    db.prepare(
      "DELETE FROM votes WHERE voter_id = ? AND week_start = ? AND day = ? AND slot = ?",
    ).run(voter.id, week, day, slot);
  }
  queueVoteNotification(voter, week, { day, slot, on });
  await invalidate(CacheKeys.votes(week));
  refresh();
}
