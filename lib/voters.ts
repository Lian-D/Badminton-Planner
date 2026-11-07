import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { cached, CacheKeys, DATA_TTL } from "./cache";
export { checkPassword, hashPassword, newToken } from "./passwords";
import type { SlotId } from "./dates";

export const VOTER_COOKIE = "voter";

export type Voter = { id: number; name: string };
export type Vote = { voterId: number; name: string; day: number; slot: SlotId };


/** The temp user remembered in this browser's cookie, if any. */
export async function getCurrentVoter(): Promise<Voter | null> {
  const token = (await cookies()).get(VOTER_COOKIE)?.value;
  if (!token) return null;
  const row = db.prepare("SELECT id, name FROM voters WHERE token = ?").get(token);
  return row ? { ...(row as Voter) } : null;
}

export function getVotes(weekStart: string): Promise<Vote[]> {
  return cached(CacheKeys.votes(weekStart), DATA_TTL, () => loadVotes(weekStart));
}

function loadVotes(weekStart: string): Vote[] {
  return db
    .prepare(
      `SELECT v.voter_id AS voterId, r.name, v.day, v.slot
         FROM votes v JOIN voters r ON r.id = v.voter_id
        WHERE v.week_start = ?
        ORDER BY r.name`,
    )
    .all(weekStart)
    .map((row) => ({ ...(row as Vote) }));
}
