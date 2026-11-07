"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateSession, type ActionState } from "@/app/actions";
import type { Player, Session } from "@/lib/split";
import { ErrorText, Field } from "./ui";

/** Admin-only dialog for changing a session's details. */
export function EditSessionDialog({ session, players, onClose }: { session: Session; players: Player[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await updateSession(prev, form);
    if (result?.ok) onClose();
    return result;
  }, undefined);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`edit-${session.id}`}
      className="glass m-auto w-[calc(100%-32px)] max-w-lg rounded-[28px] p-0 text-white backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      style={{ background: "rgb(24 27 34 / 0.92)" }}
    >
      <form action={action} className="space-y-4 p-6">
        <input type="hidden" name="id" value={session.id} />
        <div className="flex items-start justify-between gap-4">
          <h2 id={`edit-${session.id}`} className="font-display text-[22px] font-bold tracking-[-0.025em]">
            Edit session
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ring-pill grid h-9 w-9 place-items-center text-lg text-white/70 hover:text-white">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" name="date" defaultValue={session.date} className="glass-input" required />
          </Field>
          <Field label="Venue">
            <input name="venue" defaultValue={session.venue} className="glass-input" required />
          </Field>
          <Field label="Courts">
            <input type="number" name="courts" min={1} step={1} defaultValue={session.courts} className="glass-input" required />
          </Field>
          <Field label="Hours">
            <input type="number" name="hours" min={0.25} step={0.25} defaultValue={session.hours} className="glass-input" required />
          </Field>
          <Field label="Total cost ($)">
            <input type="number" name="cost" min={0} step={0.01} defaultValue={(session.costCents / 100).toFixed(2)} className="glass-input" required />
          </Field>
          <Field label="Paid by">
            <select name="paidBy" defaultValue={session.paidBy} className="glass-input" required>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <input name="notes" defaultValue={session.notes ?? ""} placeholder="optional" className="glass-input" />
        </Field>
        <p className="pl-1 text-[13px] text-[rgb(235_235_245/0.6)]">
          Use the Played boxes in the court log to change who played. Shares recalculate automatically.
        </p>

        <ErrorText>{state?.error}</ErrorText>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ring-pill px-5 py-2.5 text-[15px] font-semibold text-white/80 hover:text-white">
            Cancel
          </button>
          <button className="glass-button" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </dialog>
  );
}
