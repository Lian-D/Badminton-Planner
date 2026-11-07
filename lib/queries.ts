import "server-only";
import { connection } from "next/server";
import { db } from "./db";
import type { Payment, Player, Session } from "./split";
import { localToday } from "./dates";
import { getAccount } from "./auth";
import { cached, CacheKeys, DATA_TTL } from "./cache";

// node:sqlite returns null-prototype rows, which can't be passed to Client Components.
const all = <T,>(sql: string) =>
  db.prepare(sql).all().map((row) => ({ ...row })) as T[];

export async function getData() {
  await connection(); // sync SQLite reads must not be prerendered
  const { players, sessions, payments } = await cached(CacheKeys.costs, DATA_TTL, loadCosts);
  const today = localToday();
  const account = await getAccount(); // never cached
  return { players, sessions, payments, today, account };
}

function loadCosts() {
  const players = all<Player>("SELECT id, name FROM players ORDER BY name");

  const sessionRows = all<Omit<Session, "playerIds">>(
    `SELECT id, date, venue, courts, hours, cost_cents AS costCents,
              paid_by AS paidBy, notes
       FROM sessions ORDER BY date DESC, id DESC`,
  );

  const links = all<{ s: number; p: number; paid: number }>(
    "SELECT session_id AS s, player_id AS p, paid FROM session_players",
  );
  const bySession = new Map<number, { playerIds: number[]; paidIds: number[] }>();
  for (const { s, p, paid } of links) {
    if (!bySession.has(s)) bySession.set(s, { playerIds: [], paidIds: [] });
    const entry = bySession.get(s)!;
    entry.playerIds.push(p);
    if (paid) entry.paidIds.push(p);
  }
  const sessions: Session[] = sessionRows.map((s) => ({
    ...s,
    ...(bySession.get(s.id) ?? { playerIds: [], paidIds: [] }),
  }));

  const payments = all<Payment>(
    `SELECT id, from_id AS fromId, to_id AS toId, amount_cents AS amountCents,
              date, note
       FROM payments ORDER BY date DESC, id DESC`,
  );

  return { players, sessions, payments };
}
