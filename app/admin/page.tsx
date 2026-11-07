import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getAccount, signupsEnabled } from "@/lib/auth";
import { AccountsPanel, DiscordPanel, GeneralSettings, SignupSettings, VotersPanel, type AccountRow, type VoterRow } from "@/components/AdminPanels";
import { localToday, votingWeek } from "@/lib/dates";
import { getSetting, siteUrl } from "@/lib/settings";
import { DISCORD_EVENTS, getDiscordSettings, maskWebhook, type DiscordEvent } from "@/lib/discord";
import { PlayersPanel } from "@/components/PlayersPanel";
import { Card } from "@/components/ui";
import type { Player } from "@/lib/split";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="glass h-96 animate-pulse rounded-[28px]" />}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  await connection();
  const me = await getAccount();
  if (!me) redirect("/login");
  if (me.role !== "admin") {
    return (
      <Card title="Admins only" className="mx-auto max-w-md">
        <p className="text-[15px] text-white/60">Ask an admin if you need sign-ups, accounts or players changed.</p>
      </Card>
    );
  }

  const accounts = db
    .prepare("SELECT id, username, role, created_at AS createdAt FROM accounts ORDER BY role, username")
    .all()
    .map((r) => ({ ...(r as AccountRow) }));
  const players = db
    .prepare("SELECT id, name FROM players ORDER BY name")
    .all()
    .map((r) => ({ ...(r as Player) }));

  const week = votingWeek(localToday());
  const voters = db
    .prepare(
      `SELECT v.id, v.name, v.password_hash IS NOT NULL AS hasPassword,
              (SELECT COUNT(*) FROM votes WHERE voter_id = v.id AND week_start = ?) AS votesThisWeek,
              (SELECT MAX(week_start) FROM votes WHERE voter_id = v.id) AS lastWeek
         FROM voters v ORDER BY v.name COLLATE NOCASE`,
    )
    .all(week)
    .map((r) => {
      const row = r as Omit<VoterRow, "hasPassword"> & { hasPassword: number };
      return { ...row, hasPassword: !!row.hasPassword };
    });

  const discord = getDiscordSettings();
  const events = (Object.keys(DISCORD_EVENTS) as DiscordEvent[]).map((id) => ({
    id,
    label: DISCORD_EVENTS[id].label,
    on: discord.events[id],
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <AccountsPanel accounts={accounts} meId={me.id} />
        <VotersPanel voters={voters} />
        <DiscordPanel maskedUrl={discord.url ? maskWebhook(discord.url) : null} events={events} />
      </div>
      <div className="min-w-0 space-y-6">
        <GeneralSettings siteUrl={siteUrl()} fromEnv={!getSetting("site_url") && !!siteUrl()} />
        <SignupSettings enabled={signupsEnabled()} />
        <PlayersPanel players={players} />
      </div>
    </div>
  );
}
