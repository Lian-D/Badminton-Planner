"use client";

import { useActionState, useMemo, useState } from "react";
import { addSession, type ActionState } from "@/app/actions";
import { formatMoney, splitCost, type Player } from "@/lib/split";
import { Card, ErrorText, Field } from "./ui";

export function SessionForm({ players, today }: { players: Player[]; today: string }) {
  const [venue, setVenue] = useState("");
  const [courts, setCourts] = useState("1");
  const [hours, setHours] = useState("2");
  const [rate, setRate] = useState("");
  const [cost, setCost] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [paidBy, setPaidBy] = useState<string>("");
  const [state, action, pending] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await addSession(prev, form);
    if (result?.ok) {
      setCost("");
      setSelected([]);
    }
    return result;
  }, undefined);

  // Typing a per-court-hour rate fills in the total.
  function onRate(v: string) {
    setRate(v);
    const r = parseFloat(v);
    const total = r * (parseInt(courts) || 0) * (parseFloat(hours) || 0);
    if (Number.isFinite(total)) setCost(total.toFixed(2));
  }
  function recalc(c: string, h: string) {
    const r = parseFloat(rate);
    if (Number.isFinite(r)) setCost((r * (parseInt(c) || 0) * (parseFloat(h) || 0)).toFixed(2));
  }

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const costCents = Math.round((parseFloat(cost) || 0) * 100);
  const shares = useMemo(() => splitCost(costCents, selected), [costCents, selected]);
  const maxShare = Math.max(0, ...shares.values());
  const minShare = selected.length ? Math.min(...shares.values()) : 0;

  if (players.length === 0) {
    return (
      <Card title="Log a court session">
        <p className="text-sm text-white/55">There are no players yet. An admin can add them in the Admin tab.</p>
      </Card>
    );
  }

  return (
    <Card title="Log a court session" subtitle="Cost is split evenly between everyone who played">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Date">
            <input type="date" name="date" defaultValue={today} className="glass-input" required />
          </Field>
          <Field label="Venue" className="sm:col-span-3">
            <input name="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Sports centre" className="glass-input" required />
          </Field>
          <Field label="Courts">
            <input
              type="number" name="courts" min={1} step={1} value={courts}
              onChange={(e) => { setCourts(e.target.value); recalc(e.target.value, hours); }}
              className="glass-input" required
            />
          </Field>
          <Field label="Hours">
            <input
              type="number" name="hours" min={0.25} step={0.25} value={hours}
              onChange={(e) => { setHours(e.target.value); recalc(courts, e.target.value); }}
              className="glass-input" required
            />
          </Field>
          <Field label="Rate / court-hr">
            <input
              type="number" min={0} step={0.01} value={rate} placeholder="optional"
              onChange={(e) => onRate(e.target.value)} className="glass-input"
            />
          </Field>
          <Field label="Total cost ($)">
            <input
              type="number" name="cost" min={0} step={0.01} value={cost}
              onChange={(e) => setCost(e.target.value)} className="glass-input" required
            />
          </Field>
        </div>

        <Field label="Paid by">
          <select name="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="glass-input" required>
            <option value="" disabled>Who booked & paid?</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="pl-1 text-[13px] uppercase tracking-wide text-[rgb(235_235_245/0.6)]">Played (split between)</span>
            <button
              type="button"
              onClick={() => setSelected(selected.length === players.length ? [] : players.map((p) => p.id))}
              className="text-xs font-medium text-cobalt-soft hover:text-white"
            >
              {selected.length === players.length ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const on = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`cursor-pointer select-none rounded-full border px-4 py-2 text-sm font-medium transition ${
                    on ? "border-cobalt bg-cobalt text-white" : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10"
                  }`}
                >
                  <input type="checkbox" name="players" value={p.id} checked={on} onChange={() => toggle(p.id)} className="sr-only" />
                  {p.name}
                  {on && shares.get(p.id) !== undefined && (
                    <span className="ml-1.5 text-xs text-white/75">{formatMoney(shares.get(p.id)!)}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <Field label="Notes">
          <input name="notes" placeholder="optional" className="glass-input" />
        </Field>

        <ErrorText>{state?.error}</ErrorText>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-sm text-white/60">
            {selected.length > 0 && costCents > 0 ? (
              <>
                {formatMoney(costCents)} ÷ {selected.length} ={" "}
                <span className="font-semibold text-white">
                  {formatMoney(minShare)}
                  {maxShare !== minShare && `–${formatMoney(maxShare)}`}
                </span>{" "}
                each
              </>
            ) : (
              "Pick players to see the split"
            )}
          </p>
          <button className="glass-button" disabled={pending}>
            {pending ? "Saving…" : "Log session"}
          </button>
        </div>
      </form>
    </Card>
  );
}
