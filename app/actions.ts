"use server";

import { refresh } from "next/cache";
import { db, transaction } from "@/lib/db";
import { getAccount } from "@/lib/auth";
import { CacheKeys, invalidate } from "@/lib/cache";
import { notify } from "@/lib/discord";
import { formatMoney, splitCost } from "@/lib/split";

export type ActionState = { error?: string; ok?: number } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const toCents = (v: string) => Math.round(parseFloat(v) * 100);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

const SIGN_IN = { error: "Sign in to make changes." };
const ADMIN_ONLY = { error: "Only admins can manage players." };
const signedIn = async () => !!(await getAccount());
const isAdmin = async () => (await getAccount())?.role === "admin";

/** After any write: drop the cached dashboard and refresh the page. */
async function changed() {
  await invalidate(CacheKeys.costs);
  refresh();
}

const playerName = (id: number) =>
  (db.prepare("SELECT name FROM players WHERE id = ?").get(id) as { name: string } | undefined)?.name ?? "?";

function fail(err: unknown): ActionState {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("UNIQUE")) return { error: "That name already exists." };
  if (msg.includes("FOREIGN KEY"))
    return { error: "That player still appears in sessions or payments." };
  return { error: msg };
}

export async function addPlayer(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return ADMIN_ONLY;
  const name = str(form, "name");
  if (!name) return { error: "Enter a name." };
  try {
    db.prepare("INSERT INTO players (name) VALUES (?)").run(name);
  } catch (e) {
    return fail(e);
  }
  await changed();
  return { ok: Date.now() };
}

export async function removePlayer(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return ADMIN_ONLY;
  try {
    db.prepare("DELETE FROM players WHERE id = ?").run(Number(form.get("id")));
  } catch (e) {
    return fail(e);
  }
  await changed();
  return { ok: Date.now() };
}

type SessionDetails = {
  date: string;
  venue: string;
  courts: number;
  hours: number;
  costCents: number;
  paidBy: number;
  notes: string | null;
};

/** Shared validation for logging and editing a session. */
function readSessionDetails(form: FormData): SessionDetails | { error: string } {
  const d: SessionDetails = {
    date: str(form, "date"),
    venue: str(form, "venue"),
    courts: parseInt(str(form, "courts"), 10),
    hours: parseFloat(str(form, "hours")),
    costCents: toCents(str(form, "cost")),
    paidBy: Number(form.get("paidBy")),
    notes: str(form, "notes") || null,
  };
  if (!isDate(d.date)) return { error: "Pick a date." };
  if (!d.venue) return { error: "Enter a venue." };
  if (!(d.courts > 0)) return { error: "Courts must be at least 1." };
  if (!(d.hours > 0)) return { error: "Hours must be more than 0." };
  if (!(d.costCents >= 0)) return { error: "Enter the total cost." };
  if (!d.paidBy) return { error: "Choose who paid." };
  return d;
}

export async function addSession(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await getAccount();
  if (!me) return SIGN_IN;
  const details = readSessionDetails(form);
  if ("error" in details) return details;
  const { date, venue, courts, hours, costCents, paidBy, notes } = details;
  const playerIds = [...new Set(form.getAll("players").map(Number))].filter(Boolean);
  if (playerIds.length === 0) return { error: "Select at least one player to split with." };

  try {
    transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO sessions (date, venue, courts, hours, cost_cents, paid_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(date, venue, courts, hours, costCents, paidBy, notes);
      const link = db.prepare(
        "INSERT INTO session_players (session_id, player_id) VALUES (?, ?)",
      );
      for (const pid of playerIds) link.run(lastInsertRowid, pid);
    });
  } catch (e) {
    return fail(e);
  }
  notify("sessions", () => ({
    title: `🏸 Courts logged: ${venue}, ${date}`,
    description: `${courts} court${courts === 1 ? "" : "s"} × ${hours}h · ${formatMoney(costCents)} paid by **${playerName(paidBy)}**`,
    fields: [
      { name: "Each", value: formatMoney(Math.round(costCents / playerIds.length)), inline: true },
      { name: `Players (${playerIds.length})`, value: playerIds.map(playerName).join(", ") },
    ],
    actor: me.username,
    path: "/",
  }));
  await changed();
  return { ok: Date.now() };
}

/** Admin only: change a logged session's details (who played is edited with the checkboxes). */
export async function updateSession(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await getAccount();
  if (me?.role !== "admin") return { error: "Only admins can edit sessions." };
  const id = Number(form.get("id"));
  const details = readSessionDetails(form);
  if ("error" in details) return details;
  const { date, venue, courts, hours, costCents, paidBy, notes } = details;
  try {
    const { changes } = db
      .prepare(
        `UPDATE sessions SET date = ?, venue = ?, courts = ?, hours = ?, cost_cents = ?, paid_by = ?, notes = ?
          WHERE id = ?`,
      )
      .run(date, venue, courts, hours, costCents, paidBy, notes, id);
    if (!changes) return { error: "That session no longer exists." };
  } catch (e) {
    return fail(e);
  }
  await changed();
  return { ok: Date.now() };
}

/** "Played" checkbox: add or remove a player from a session's split. */
export async function setAttendance(sessionId: number, playerId: number, on: boolean): Promise<ActionState> {
  if (!(await signedIn())) return SIGN_IN;
  try {
    if (on) {
      db.prepare(
        "INSERT OR IGNORE INTO session_players (session_id, player_id) VALUES (?, ?)",
      ).run(sessionId, playerId);
    } else {
      const { n } = db
        .prepare("SELECT COUNT(*) AS n FROM session_players WHERE session_id = ?")
        .get(sessionId) as { n: number };
      if (n <= 1) return { error: "A session needs at least one player. Delete it instead." };
      db.prepare("DELETE FROM session_players WHERE session_id = ? AND player_id = ?").run(
        sessionId,
        playerId,
      );
    }
  } catch (e) {
    return fail(e);
  }
  await changed();
  return { ok: Date.now() };
}

/** "Paid" checkbox: this player has paid their share back to the host. */
export async function setPaid(sessionId: number, playerId: number, on: boolean): Promise<ActionState> {
  const me = await getAccount();
  if (!me) return SIGN_IN;
  db.prepare("UPDATE session_players SET paid = ? WHERE session_id = ? AND player_id = ?").run(
    on ? 1 : 0,
    sessionId,
    playerId,
  );
  if (on) {
    notify("payments", () => {
      const s = db.prepare("SELECT date, venue, cost_cents AS cost, paid_by AS host FROM sessions WHERE id = ?").get(sessionId) as
        { date: string; venue: string; cost: number; host: number };
      const ids = (db.prepare("SELECT player_id AS p FROM session_players WHERE session_id = ?").all(sessionId) as { p: number }[]).map((r) => r.p);
      const share = splitCost(s.cost, ids).get(playerId) ?? 0;
      return {
        title: `✅ ${playerName(playerId)} paid ${formatMoney(share)}`,
        description: `Their share for ${s.venue} on ${s.date}, paid to **${playerName(s.host)}**`,
        actor: me.username,
        path: "/",
      };
    });
  }
  await changed();
  return { ok: Date.now() };
}

export async function deleteSession(form: FormData) {
  if (!(await signedIn())) return;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(Number(form.get("id")));
  await changed();
}

export async function addPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await getAccount();
  if (!me) return SIGN_IN;
  const fromId = Number(form.get("fromId"));
  const toId = Number(form.get("toId"));
  const amountCents = toCents(str(form, "amount"));
  const date = str(form, "date");
  const note = str(form, "note") || null;

  if (!fromId || !toId) return { error: "Choose both players." };
  if (fromId === toId) return { error: "A player can't pay themselves." };
  if (!(amountCents > 0)) return { error: "Amount must be more than 0." };
  if (!isDate(date)) return { error: "Pick a date." };

  try {
    db.prepare(
      "INSERT INTO payments (from_id, to_id, amount_cents, date, note) VALUES (?, ?, ?, ?, ?)",
    ).run(fromId, toId, amountCents, date, note);
  } catch (e) {
    return fail(e);
  }
  notify("payments", () => ({
    title: `💸 ${playerName(fromId)} paid ${playerName(toId)} ${formatMoney(amountCents)}`,
    description: note ? `${date} · ${note}` : date,
    actor: me.username,
    path: "/",
  }));
  await changed();
  return { ok: Date.now() };
}

export async function deletePayment(form: FormData) {
  if (!(await signedIn())) return;
  db.prepare("DELETE FROM payments WHERE id = ?").run(Number(form.get("id")));
  await changed();
}
