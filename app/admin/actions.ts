"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { adminCount, getAccount, setSignupsEnabled, type Role } from "@/lib/auth";
import { hashPassword, newToken } from "@/lib/passwords";
import { CacheKeys, invalidate } from "@/lib/cache";
import {
  clearDiscordWebhook,
  deliver,
  DISCORD_EVENTS,
  getDiscordSettings,
  isWebhookUrl,
  saveDiscordSettings,
  type DiscordEvent,
} from "@/lib/discord";
import { deleteSetting, normaliseSiteUrl, putSetting } from "@/lib/settings";

export type AdminState = { error?: string; ok?: number } | undefined;

async function requireAdmin() {
  const me = await getAccount();
  if (me?.role !== "admin") throw new Error("Only admins can do that.");
  return me;
}

function roleOf(id: number): Role | undefined {
  return (db.prepare("SELECT role FROM accounts WHERE id = ?").get(id) as { role: Role } | undefined)?.role;
}

export async function toggleSignups(on: boolean): Promise<AdminState> {
  try {
    await requireAdmin();
    setSignupsEnabled(on);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

export async function setRole(id: number, role: Role): Promise<AdminState> {
  try {
    await requireAdmin();
    if (role !== "admin" && role !== "host") throw new Error("Unknown role.");
    if (roleOf(id) === "admin" && role === "host" && adminCount() <= 1)
      throw new Error("There must be at least one admin.");
    db.prepare("UPDATE accounts SET role = ? WHERE id = ?").run(role, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

export async function removeAccount(id: number): Promise<AdminState> {
  try {
    const me = await requireAdmin();
    if (id === me.id) throw new Error("You can't remove your own account.");
    if (roleOf(id) === "admin" && adminCount() <= 1) throw new Error("There must be at least one admin.");
    db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

export async function resetPassword(_: AdminState, form: FormData): Promise<AdminState> {
  try {
    await requireAdmin();
    const id = Number(form.get("id"));
    const password = String(form.get("password") ?? "");
    if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
    db.prepare("UPDATE accounts SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
    // Sign that account out everywhere.
    db.prepare("DELETE FROM auth_sessions WHERE account_id = ?").run(id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

// ---- Discord notifications -------------------------------------------------

export async function saveDiscord(_: AdminState, form: FormData): Promise<AdminState> {
  try {
    await requireAdmin();
    const url = String(form.get("url") ?? "").trim();
    if (url && !isWebhookUrl(url))
      throw new Error("Paste a Discord webhook URL (https://discord.com/api/webhooks/…).");
    const events = Object.fromEntries(
      (Object.keys(DISCORD_EVENTS) as DiscordEvent[]).map((e) => [e, form.get(`event_${e}`) === "on"]),
    ) as Record<DiscordEvent, boolean>;
    // A blank URL keeps the saved one, so admins can change switches without re-pasting it.
    saveDiscordSettings(url || null, events);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

export async function testDiscord(): Promise<AdminState> {
  try {
    const me = await requireAdmin();
    const { url } = getDiscordSettings();
    if (!url) throw new Error("Save a webhook URL first.");
    const error = await deliver(url, {
      title: "🏸 Badminton Planner is connected",
      description: "Notifications will show up in this channel.",
      actor: me.username,
    });
    if (error) throw new Error(error);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: Date.now() };
}

export async function removeDiscordWebhook(): Promise<AdminState> {
  try {
    await requireAdmin();
    clearDiscordWebhook();
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

// ---- General settings ------------------------------------------------------

export async function saveSiteUrl(_: AdminState, form: FormData): Promise<AdminState> {
  try {
    await requireAdmin();
    const raw = String(form.get("siteUrl") ?? "").trim();
    if (!raw) {
      deleteSetting("site_url");
    } else {
      const url = normaliseSiteUrl(raw);
      if (!url) throw new Error("Enter a full address, e.g. https://badminton.example.com");
      putSetting("site_url", url);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

// ---- Voting logins ------------------------------------------------------------

/** Clear a voter's password and sign them out everywhere (new token). Votes are kept. */
export async function resetVoter(id: number): Promise<AdminState> {
  try {
    await requireAdmin();
    const { changes } = db
      .prepare("UPDATE voters SET password_hash = NULL, token = ? WHERE id = ?")
      .run(newToken(), id);
    if (!changes) throw new Error("That voter no longer exists.");
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}

/** Delete a voter and all their votes. */
export async function removeVoter(id: number): Promise<AdminState> {
  try {
    await requireAdmin();
    const weeks = (db.prepare("SELECT DISTINCT week_start AS w FROM votes WHERE voter_id = ?").all(id) as { w: string }[]).map((r) => r.w);
    db.prepare("DELETE FROM voters WHERE id = ?").run(id); // votes cascade
    await invalidate(...weeks.map(CacheKeys.votes));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: Date.now() };
}
