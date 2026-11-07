"use client";

import { useOptimistic, useTransition } from "react";
import { toggleVote } from "@/app/vote/actions";
import { addDays, DAYS, SLOTS, type SlotId } from "@/lib/dates";
import type { Vote, Voter } from "@/lib/voters";
import { Avatar } from "./ui";

type Toggle = { day: number; slot: SlotId; on: boolean };

export function VoteGrid({ week, today, votes, me }: { week: string; today: string; votes: Vote[]; me: Voter | null }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(votes, (current: Vote[], t: Toggle) =>
    t.on
      ? [...current, { voterId: me!.id, name: me!.name, day: t.day, slot: t.slot }]
      : current.filter((v) => !(v.voterId === me!.id && v.day === t.day && v.slot === t.slot)),
  );

  const voterCount = new Set(optimistic.map((v) => v.voterId)).size;
  const cell = (day: number, slot: SlotId) => optimistic.filter((v) => v.day === day && v.slot === slot);
  const best = Math.max(0, ...DAYS.flatMap((_, d) => SLOTS.map((s) => cell(d, s.id).length)));

  function onToggle(day: number, slot: SlotId, on: boolean) {
    if (!me) return;
    startTransition(async () => {
      apply({ day, slot, on });
      await toggleVote(week, day, slot, on);
    });
  }

  return (
    <div className={`space-y-2.5 ${pending ? "cursor-progress" : ""}`}>
      <div className="grid grid-cols-[64px_1fr_1fr] gap-2.5 px-1 text-center text-xs font-medium uppercase tracking-wider text-white/40 sm:grid-cols-[76px_1fr_1fr]">
        <span />
        {SLOTS.map((s) => <span key={s.id}>{s.label}</span>)}
      </div>

      {DAYS.map((dayName, d) => {
        const date = addDays(week, d);
        const isToday = date === today;
        return (
          <div key={dayName} className="grid grid-cols-[64px_1fr_1fr] gap-2.5 sm:grid-cols-[76px_1fr_1fr]">
            {/* Day pill, like the calendar strip */}
            <div className="ring-pill relative flex flex-col items-center justify-center gap-1.5 !rounded-[26px] py-2.5">
              <span className="text-xs text-white/60">{dayName.slice(0, 3)}</span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full font-rounded text-lg font-semibold ${
                  isToday ? "bg-cobalt text-white" : "border border-white/10"
                }`}
              >
                {Number(date.slice(8))}
              </span>
              {isToday && <span className="absolute top-[30px] h-2 w-2 rounded-full bg-volt" />}
            </div>

            {SLOTS.map((s) => {
              const people = cell(d, s.id);
              const mine = !!me && people.some((p) => p.voterId === me.id);
              const ratio = voterCount ? people.length / voterCount : 0;
              const top = people.length > 0 && people.length === best;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!me}
                  onClick={() => onToggle(d, s.id, !mine)}
                  aria-pressed={mine}
                  aria-label={`${dayName} ${s.label}: ${people.length} available${mine ? ", including you" : ""}`}
                  style={mine ? undefined : { backgroundColor: `rgb(47 140 255 / ${people.length ? 0.08 + ratio * 0.3 : 0.025})` }}
                  className={`flex min-h-[92px] flex-col justify-between gap-2 rounded-[26px] border p-3 text-left transition disabled:cursor-default sm:p-3.5 ${
                    mine
                      ? "border-volt bg-volt text-ink shadow-[0_12px_30px_-12px_rgb(200_243_29/0.6)]"
                      : "border-white/8 enabled:hover:border-white/25"
                  }`}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="font-rounded text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums">{people.length}</span>
                    {top && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          mine ? "bg-ink/90 text-volt" : "bg-black/40 text-volt"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                        Top
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {people.map((p) => (
                      <span
                        key={p.voterId}
                        className={`flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-medium leading-tight ${
                          mine ? "bg-ink/12 text-ink" : "bg-cobalt/25 text-cobalt-soft"
                        }`}
                      >
                        <Avatar name={p.name} size="xs" />
                        {p.name}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
