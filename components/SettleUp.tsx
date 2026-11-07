"use client";

import { useActionState } from "react";
import { addPayment } from "@/app/actions";
import type { Player, Transfer } from "@/lib/split";
import { Avatar, Card, ErrorText, Field, Money } from "./ui";

export function SettleUp({ transfers, players, today, canEdit }: { transfers: Transfer[]; players: Player[]; today: string; canEdit: boolean }) {
  const [quickState, quickAction, quickPending] = useActionState(addPayment, undefined);
  const [state, action, pending] = useActionState(addPayment, undefined);

  return (
    <Card title="Settle up" subtitle="Fewest payments to clear every balance">
      {transfers.length === 0 ? (
        <p className="rounded-[26px] border border-volt/20 bg-volt/8 px-4 py-6 text-center text-sm font-medium text-volt">
          All square. Nobody owes anything.
        </p>
      ) : (
        <ul className="space-y-3">
          {transfers.map((t) => (
            <li
              key={`${t.from.id}-${t.to.id}`}
              className="grid grid-cols-[64px_1fr_64px] items-center gap-2 rounded-[26px] border border-white/8 bg-white/[0.03] px-3 py-4"
            >
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Avatar name={t.from.name} light />
                <span className="w-full truncate text-xs text-white/75">{t.from.name}</span>
              </div>
              <form action={quickAction} className="flex flex-col items-center gap-1 text-center">
                <span className="text-[11px] uppercase tracking-wider text-white/45">pays</span>
                <span className="font-rounded text-3xl font-semibold leading-none tracking-[-0.02em]"><Money cents={t.amountCents} /></span>
                <input type="hidden" name="fromId" value={t.from.id} />
                <input type="hidden" name="toId" value={t.to.id} />
                <input type="hidden" name="amount" value={(t.amountCents / 100).toFixed(2)} />
                <input type="hidden" name="date" value={today} />
                <input type="hidden" name="note" value="Settle up" />
                {canEdit && <button className="glass-button mt-2 !px-4 !py-1.5 text-xs" disabled={quickPending}>Mark paid</button>}
              </form>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Avatar name={t.to.name} light />
                <span className="w-full truncate text-xs text-white/75">{t.to.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2"><ErrorText>{quickState?.error}</ErrorText></div>

      {canEdit && players.length >= 2 && (
        <details className="mt-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
          <summary className="cursor-pointer pl-1 text-sm font-medium text-white/70">Record a custom payment</summary>
          <form action={action} className="mt-4 grid grid-cols-2 gap-3">
            <Field label="From">
              <select name="fromId" defaultValue="" className="glass-input" required>
                <option value="" disabled>Payer</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="To">
              <select name="toId" defaultValue="" className="glass-input" required>
                <option value="" disabled>Recipient</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Amount ($)">
              <input type="number" name="amount" min={0.01} step={0.01} className="glass-input" required />
            </Field>
            <Field label="Date">
              <input type="date" name="date" defaultValue={today} className="glass-input" required />
            </Field>
            <Field label="Note" className="col-span-2">
              <input name="note" placeholder="optional" className="glass-input" />
            </Field>
            <div className="col-span-2 flex items-center justify-between gap-3">
              <ErrorText>{state?.error}</ErrorText>
              <button className="glass-button ml-auto" disabled={pending}>Record payment</button>
            </div>
          </form>
        </details>
      )}
    </Card>
  );
}
