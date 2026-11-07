"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db, transaction } from "@/lib/db";
import { accountCount, endSession, signupsEnabled, startSession } from "@/lib/auth";
import { checkPassword, hashPassword } from "@/lib/passwords";
import { notify } from "@/lib/discord";

/** `username` is echoed back so the form can keep it after an error. */
export type AuthState = { error?: string; username?: string } | undefined;

const USERNAME = /^[A-Za-z0-9._-]{3,32}$/;
// Used when the username doesn't exist, so a failed login takes the same time.
const DUMMY_HASH = hashPassword("not-a-real-password");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const row = db
    .prepare("SELECT id, password_hash AS hash FROM accounts WHERE username = ?")
    .get(username) as { id: number; hash: string } | undefined;

  const ok = checkPassword(password, row?.hash ?? DUMMY_HASH) && !!row;
  if (!ok) return { error: "Wrong username or password.", username };

  await startSession(row.id);
  redirect("/");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!USERNAME.test(username))
    return { error: "Usernames are 3–32 letters, numbers, dots, dashes or underscores.", username };
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", username };
  if (password !== confirm) return { error: "The passwords don't match.", username };

  let id: number;
  try {
    id = transaction(() => {
      const first = accountCount() === 0;
      if (!first && !signupsEnabled()) throw new Error("Account creation is turned off. Ask an admin.");
      const { lastInsertRowid } = db
        .prepare("INSERT INTO accounts (username, password_hash, role) VALUES (?, ?, ?)")
        .run(username, hashPassword(password), first ? "admin" : "host");
      return Number(lastInsertRowid);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.includes("UNIQUE") ? "That username is taken." : msg, username };
  }

  notify("accounts", () => ({ title: `👋 New account: ${username}`, description: "They can now log courts.", path: "/admin" }));
  await startSession(id);
  redirect("/");
}

export async function signOut() {
  await endSession();
  refresh();
}
