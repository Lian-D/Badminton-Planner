import "server-only";
import { createClient } from "redis";

/**
 * Optional Redis read-through cache for data we serve (costs dashboard, vote
 * tallies, avatars). Enabled when REDIS_URL is set. It fails open: if Redis is
 * missing, still connecting or erroring, reads go straight to SQLite.
 *
 * Auth data (accounts, sessions) is never cached.
 */

export type CacheClient = {
  isReady: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts: { expiration: { type: "EX"; value: number } }): Promise<unknown>;
  del(keys: string[]): Promise<unknown>;
};

const PREFIX = "bp:";
const g = globalThis as unknown as { __bpCache?: CacheClient | null };

function client(): CacheClient | null {
  if (g.__bpCache !== undefined) return g.__bpCache;
  const url = process.env.REDIS_URL;
  if (!url) return (g.__bpCache = null);

  const c = createClient({
    url,
    socket: { connectTimeout: 2000, reconnectStrategy: (retries) => Math.min(retries * 250, 5000) },
  });
  c.on("error", (err) => console.warn("[cache] redis error:", err.message));
  // Connect in the background; until it's ready, requests just skip the cache.
  c.connect().catch((err) => console.warn("[cache] redis connect failed:", err.message));
  return (g.__bpCache = c as unknown as CacheClient);
}

/** For tests: swap in a fake client (or null to disable). */
export function setCacheClient(c: CacheClient | null) {
  g.__bpCache = c;
}

export async function cached<T>(key: string, ttlSeconds: number, load: () => T | Promise<T>): Promise<T> {
  const c = client();
  if (!c?.isReady) return load();
  try {
    const hit = await c.get(PREFIX + key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (err) {
    console.warn("[cache] read failed:", (err as Error).message);
  }
  const value = await load();
  try {
    await c.set(PREFIX + key, JSON.stringify(value), { expiration: { type: "EX", value: ttlSeconds } });
  } catch (err) {
    console.warn("[cache] write failed:", (err as Error).message);
  }
  return value;
}

export async function invalidate(...keys: string[]) {
  const c = client();
  if (!c?.isReady || keys.length === 0) return;
  try {
    await c.del(keys.map((k) => PREFIX + k));
  } catch (err) {
    console.warn("[cache] invalidate failed:", (err as Error).message);
  }
}

/** Keys, kept in one place so reads and invalidations can't drift apart. */
export const CacheKeys = {
  costs: "costs",
  votes: (week: string) => `votes:${week}`,
  avatar: (hash: string) => `avatar:${hash}`,
};

/** Short TTL so a missed invalidation (Redis blip during a write) self-heals quickly. */
export const DATA_TTL = 300;
