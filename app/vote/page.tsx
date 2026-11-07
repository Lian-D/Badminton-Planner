import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { addDays, DAYS, isIsoDate, localToday, mondayOf, shortDate, SLOTS, votingWeek } from "@/lib/dates";
import { getCurrentVoter, getVotes } from "@/lib/voters";
import { SignInPanel } from "@/components/SignInPanel";
import { VoteGrid } from "@/components/VoteGrid";
import { Card, Empty } from "@/components/ui";

export default function VotePage({ searchParams }: PageProps<"/vote">) {
  return (
    <Suspense fallback={<div className="glass h-96 animate-pulse rounded-3xl" />}>
      <Vote searchParams={searchParams} />
    </Suspense>
  );
}

async function Vote({ searchParams }: Pick<PageProps<"/vote">, "searchParams">) {
  await connection();
  const param = (await searchParams).week;
  const current = votingWeek(localToday());
  const week = typeof param === "string" && isIsoDate(param) ? mondayOf(param) : current;

  const [me, votes] = await Promise.all([getCurrentVoter(), getVotes(week)]);
  const voters = [...new Map(votes.map((v) => [v.voterId, v.name])).values()];

  const ranked = DAYS.flatMap((day, d) =>
    SLOTS.map((s) => ({
      label: `${day} ${s.label}`,
      people: votes.filter((v) => v.day === d && v.slot === s.id).map((v) => v.name),
    })),
  )
    .filter((r) => r.people.length > 0)
    .sort((a, b) => b.people.length - a.people.length)
    .slice(0, 3);

  const weekLink = (w: string) => (w === current ? "/vote" : `/vote?week=${w}`);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card
        title="When should we book courts?"
        subtitle={`${voters.length} ${voters.length === 1 ? "person has" : "people have"} voted this week`}
        action={
          <div className="ring-pill flex items-center gap-1 p-1 text-sm">
            <Link href={weekLink(addDays(week, -7))} className="ring-pill grid h-9 w-9 place-items-center text-lg hover:bg-white/10" aria-label="Previous week">‹</Link>
            <span className="whitespace-nowrap px-2 font-semibold tabular-nums">
              {shortDate(week)} – {shortDate(addDays(week, 4))}
            </span>
            <Link href={weekLink(addDays(week, 7))} className="ring-pill grid h-9 w-9 place-items-center text-lg hover:bg-white/10" aria-label="Next week">›</Link>
          </div>
        }
      >
        <VoteGrid key={week} week={week} today={localToday()} votes={votes} me={me} />
        {week !== current && (
          <Link href="/vote" className="ring-pill mt-4 inline-block px-4 py-2 text-sm font-medium text-cobalt-soft hover:bg-white/8">Back to this week →</Link>
        )}
      </Card>

      <div className="space-y-6">
        <SignInPanel me={me} />
        <Card title="Best options">
          {ranked.length === 0 ? (
            <Empty>No votes yet for this week.</Empty>
          ) : (
            <ol className="grouped">
              {ranked.map((r, i) => (
                <li key={r.label} className="flex items-center gap-3 px-3.5 py-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-rounded text-lg font-semibold ${i === 0 ? "bg-volt text-ink" : "bg-cobalt/20 text-cobalt-soft"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[17px] font-semibold tracking-[-0.02em]">{r.label}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-volt">{r.people.length} in</span>
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-[rgb(235_235_245/0.6)]">{r.people.join(", ")}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
