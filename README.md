# Badminton Planner

Vote on court times, log court bookings, and keep track of who owes whom. Built with Next.js 16 and SQLite, with an optional Redis cache.

## Features

- **Court vote** (`/vote`): a when2meet-style poll for Mon–Fri, 7–9 pm or 8–10 pm. Anyone can vote by signing in with just a name and an optional password; no account is needed.
- **Court log checklist**: like the old spreadsheet. Each session has a *Played* and a *Paid* checkbox per person, and a **Total owed** row adds up each person's unpaid shares. Ticking *Paid* counts as paying that share back to the host (whoever booked).
- **Money owed**, **Settle up** (the fewest payments that clear every balance) and **payment history**.
- **Accounts**:
  - The first account created becomes the **admin**.
  - Any signed-in account (a **host**) can log courts and tick boxes.
  - Admins manage accounts, players, whether new accounts can be created, and Discord notifications.
  - Visitors who aren't signed in see the costs page read-only.
- **Profile pictures** are generated from a SHA-256 hash of each person's name, so the same name always gets the same face. They use [Notionists](https://heyzoish.gumroad.com/l/notionists) by Zoish (CC0) via DiceBear.
- **Discord notifications**: an admin pastes a webhook URL and picks which events to post:
  - courts logged
  - payments
  - new accounts
  - a **weekly vote reminder**, sent once per voting week from 9 am server time (the voting week rolls over on Saturday)
  - a post **per person** when they vote, sent once they stop tapping, with their whole choice in one message
- **Settings** (Admin): the site URL that Discord messages link back to.

## Run with Docker

```bash
docker compose up -d --build     # http://localhost:1263
PORT=8080 docker compose up -d   # use a different host port
TZ=Europe/London SITE_URL=https://badminton.example.com docker compose up -d
```

This starts the app plus a Redis container used as a cache. The SQLite database is stored in the `app-data` volume. Open the site and create the first account: it becomes the admin.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production server
```

Requires Node 22.13 or newer, because it uses the built-in `node:sqlite` module.

| Variable    | Default              | Purpose                                     |
| ----------- | -------------------- | ------------------------------------------- |
| `DB_PATH`   | `./data/badminton.db` | SQLite database file                        |
| `REDIS_URL` | unset (no cache)     | e.g. `redis://localhost:6379` turns the cache on |
| `PORT`      | 3000 (1263 in Docker) | HTTP port                                   |
| `TZ`        | system (UTC in Docker) | Timezone for dates and the 9 am weekly reminder |
| `SITE_URL`  | unset                | Fallback for the site URL setting (links in Discord) |

## Caching

When `REDIS_URL` is set, the costs dashboard, weekly vote tallies and avatars are cached in Redis. Every change deletes the cached copy, so the next load is fresh. Entries also expire after 5 minutes, in case a deletion is ever missed.

If Redis is unreachable, the app reads straight from SQLite. Account and login data is never cached.

## Layout

- `lib/db.ts`: SQLite connection, schema and migrations
- `lib/auth.ts`, `lib/passwords.ts`: accounts, login sessions (tokens stored hashed), scrypt password hashing
- `lib/cache.ts`: optional Redis read-through cache
- `lib/discord.ts`: webhook settings and delivery
- `lib/split.ts`: split, balance and settle-up math (integer cents)
- `lib/voters.ts`, `lib/dates.ts`: voting
- `app/actions.ts`, `app/vote/actions.ts`, `app/login/actions.ts`, `app/admin/actions.ts`: Server Actions
- `app/avatar/[seed]/route.ts`: generated profile pictures
