"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteSession, setAttendance, setPaid } from "@/app/actions";
import { formatMoney, splitCost, type Player, type Session } from "@/lib/split";
import { Avatar, Card, Empty, ErrorText } from "./ui";
import { EditSessionDialog } from "./EditSessionDialog";

/** How many sessions the court log shows before "Show more". */
const RECENT = 4;

type Change = { sessionId: number; playerId: number; field: "played" | "paid"; on: boolean };

function applyChange(sessions: Session[], c: Change): Session[] {
  return sessions.map((s) => {
    if (s.id !== c.sessionId) return s;
    const toggle = (ids: number[]) => (c.on ? [...new Set([...ids, c.playerId])] : ids.filter((id) => id !== c.playerId));
    if (c.field === "played") {
      return { ...s, playerIds: toggle(s.playerIds), paidIds: c.on ? s.paidIds : s.paidIds.filter((id) => id !== c.playerId) };
    }
    return { ...s, paidIds: toggle(s.paidIds) };
  });
}

function Check({
  checked,
  onChange,
  label,
  tone,
  disabled,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  tone: "played" | "paid";
  disabled: boolean;
}) {
  const on = tone === "played" ? "border-cobalt bg-cobalt text-white" : "border-volt bg-volt text-ink";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`grid h-7 w-7 place-items-center rounded-[9px] border-[1.5px] transition enabled:active:scale-90 disabled:cursor-default ${
        checked ? on : "border-white/25 bg-white/[0.03] enabled:hover:border-white/50"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
    </button>
  );
}

export function AttendanceGrid({
  sessions,
  players,
  canEdit,
  isAdmin = false,
}: {
  sessions: Session[];
  players: Player[];
  canEdit: boolean;
  isAdmin?: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [optimistic, apply] = useOptimistic(sessions, applyChange);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function change(c: Change) {
    setError(undefined);
    startTransition(async () => {
      apply(c);
      const res = c.field === "played"
        ? await setAttendance(c.sessionId, c.playerId, c.on)
        : await setPaid(c.sessionId, c.playerId, c.on);
      if (res?.error) setError(res.error);
    });
  }

  // "Total owed" per player: shares they played for but haven't ticked as paid.
  const owed = new Map<number, number>(players.map((p) => [p.id, 0]));
  for (const s of optimistic) {
    for (const [pid, share] of splitCost(s.costCents, s.playerIds)) {
      if (pid !== s.paidBy && !s.paidIds.includes(pid)) owed.set(pid, (owed.get(pid) ?? 0) + share);
    }
  }
  const name = new Map(players.map((p) => [p.id, p.name]));

  const sticky = "sticky left-0 z-10 bg-[rgb(21_24_31)]";

  return (
    <Card title="Court log" subtitle={canEdit ? "Tick who played and who has paid their share back" : "Sign in to tick who played and who has paid"}>
      {optimistic.length === 0 ? (
        <Empty>No sessions logged yet.</Empty>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4 text-xs text-white/60 sm:hidden">
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px] bg-cobalt" /> Played</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px] bg-volt" /> Paid</span>
          </div>
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wide text-[rgb(235_235_245/0.6)]">
                  <th className={`${sticky} min-w-[124px] py-2 pl-5 pr-2 font-medium sm:min-w-[150px] sm:pl-6 sm:pr-3 lg:min-w-[230px]`}>Session</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell" />
                  {players.map((p) => (
                    <th key={p.id} className="min-w-[60px] px-1 py-2 text-center lg:min-w-[84px] lg:px-2 font-semibold normal-case tracking-normal text-white">
                      <div className="flex flex-col items-center gap-1">
                        <Avatar name={p.name} size="sm" />
                        {p.name}
                      </div>
                    </th>
                  ))}
                  <th className="pr-5 sm:pr-6" />
                </tr>
                <tr className="bg-white/[0.04]">
                  <td className={`${sticky} !bg-[rgb(29_33_42)] py-2.5 pl-5 pr-2 font-semibold sm:pl-6 sm:pr-3`}>Total owed</td>
                  <td className="hidden sm:table-cell" />
                  {players.map((p) => {
                    const cents = owed.get(p.id) ?? 0;
                    return (
                      <td key={p.id} className={`px-1 py-2.5 text-center font-rounded lg:px-2 font-semibold tabular-nums ${cents ? "text-live" : "text-white/35"}`}>
                        {formatMoney(cents)}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </thead>
              <tbody>
                {(showAll ? optimistic : optimistic.slice(0, RECENT)).map((s) => {
                  const each = s.playerIds.length ? Math.round(s.costCents / s.playerIds.length) : 0;
                  return (
                    <tr key={s.id} className="align-middle">
                      <td className={`${sticky} border-t border-white/8 py-3 pl-5 pr-2 sm:pl-6 sm:pr-3`}>
                        <div className="font-semibold tabular-nums">{s.date}</div>
                        <div className="max-w-[110px] truncate text-xs text-white/50 sm:max-w-[160px] lg:max-w-[260px]">{s.venue} · {s.courts}×{s.hours}h</div>
                        <div className="mt-1 text-xs tabular-nums text-white/70">
                          {formatMoney(s.costCents)} · <span className="text-volt">{formatMoney(each)} each</span>
                        </div>
                        <div className="text-[11px] text-cobalt-soft/70">Paid by {name.get(s.paidBy) ?? "?"}</div>
                      </td>
                      <td className="hidden border-t border-white/8 px-2 py-3 text-right text-[11px] sm:table-cell font-medium uppercase leading-[28px] tracking-wide text-white/45">
                        <div>Played</div>
                        <div className="mt-1.5">Paid</div>
                      </td>
                      {players.map((p) => {
                        const played = s.playerIds.includes(p.id);
                        const host = p.id === s.paidBy;
                        const paid = s.paidIds.includes(p.id);
                        return (
                          <td key={p.id} className="border-t border-white/8 px-1 py-3 lg:px-2 lg:py-3.5">
                            <div className="flex flex-col items-center gap-1.5">
                              <Check
                                tone="played"
                                disabled={!canEdit}
                                checked={played}
                                label={`${p.name} played on ${s.date}`}
                                onChange={(on) => change({ sessionId: s.id, playerId: p.id, field: "played", on })}
                              />
                              {host ? (
                                <span title="Booked and paid for the courts" className="grid h-7 place-items-center rounded-full border border-volt/40 px-2 text-[10px] font-bold uppercase tracking-wide text-volt">
                                  Host
                                </span>
                              ) : played ? (
                                <Check
                                  tone="paid"
                                  disabled={!canEdit}
                                  checked={paid}
                                  label={`${p.name} paid for ${s.date}`}
                                  onChange={(on) => change({ sessionId: s.id, playerId: p.id, field: "paid", on })}
                                />
                              ) : (
                                <span className="grid h-7 w-7 place-items-center text-white/20">–</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-t border-white/8 py-3 pl-2 pr-5 text-right sm:pr-6">
                        <div className="flex flex-col items-end gap-2">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditing(s.id)}
                              aria-label={`Edit session on ${s.date}`}
                              className="text-xs font-medium text-cobalt-soft hover:text-white"
                            >
                              Edit
                            </button>
                          )}
                          {canEdit && (
                            <form action={deleteSession}>
                              <input type="hidden" name="id" value={s.id} />
                              <button className="text-xs text-white/40 hover:text-live">Delete</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {optimistic.length > RECENT && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="pl-1 text-[13px] text-[rgb(235_235_245/0.6)]">
                {showAll
                  ? `Showing all ${optimistic.length} sessions.`
                  : `Showing the latest ${RECENT} of ${optimistic.length}. Total owed counts every session.`}
              </span>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                className="ring-pill px-4 py-2 text-[15px] font-semibold text-cobalt-soft hover:bg-white/8"
              >
                {showAll ? "Show less" : `Show ${optimistic.length - RECENT} more`}
              </button>
            </div>
          )}
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
          {editing !== null && optimistic.some((s) => s.id === editing) && (
            <EditSessionDialog
              session={optimistic.find((s) => s.id === editing)!}
              players={players}
              onClose={() => setEditing(null)}
            />
          )}
        </>
      )}
    </Card>
  );
}
