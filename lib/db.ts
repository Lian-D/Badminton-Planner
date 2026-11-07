import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "badminton.db");

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS players (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      venue      TEXT NOT NULL,
      courts     INTEGER NOT NULL CHECK (courts > 0),
      hours      REAL NOT NULL CHECK (hours > 0),
      cost_cents INTEGER NOT NULL CHECK (cost_cents >= 0),
      paid_by    INTEGER NOT NULL REFERENCES players(id),
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_players (
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id  INTEGER NOT NULL REFERENCES players(id),
      paid       INTEGER NOT NULL DEFAULT 0, -- paid their share back to the host
      PRIMARY KEY (session_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id      INTEGER NOT NULL REFERENCES players(id),
      to_id        INTEGER NOT NULL REFERENCES players(id),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      date         TEXT NOT NULL,
      note         TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (from_id <> to_id)
    );

    -- Court-manager accounts (separate from voters). The first one is the admin.
    CREATE TABLE IF NOT EXISTS accounts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'host' CHECK (role IN ('admin', 'host')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- when2meet-style temporary voters (name + optional password)
    CREATE TABLE IF NOT EXISTS voters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      token         TEXT NOT NULL UNIQUE,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      voter_id   INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
      week_start TEXT NOT NULL,
      day        INTEGER NOT NULL CHECK (day BETWEEN 0 AND 4),
      slot       TEXT NOT NULL CHECK (slot IN ('7-9', '8-10')),
      PRIMARY KEY (voter_id, week_start, day, slot)
    );
  `);

  // Migration: databases created before the "paid" checkbox existed.
  const cols = db.prepare("PRAGMA table_info(session_players)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "paid")) {
    db.exec("ALTER TABLE session_players ADD COLUMN paid INTEGER NOT NULL DEFAULT 0");
  }
  return db;
}

// Opened lazily (build workers import this module in parallel) and reused
// across hot reloads in dev.
const g = globalThis as unknown as { __badmintonDb?: DatabaseSync };
const conn = () => (g.__badmintonDb ??= open());

export const db = {
  prepare: (sql: string) => conn().prepare(sql),
  exec: (sql: string) => conn().exec(sql),
};

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
