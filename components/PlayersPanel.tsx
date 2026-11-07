"use client";

import { useActionState } from "react";
import { addPlayer, removePlayer } from "@/app/actions";
import type { Player } from "@/lib/split";
import { Avatar, Card, ErrorText } from "./ui";

export function PlayersPanel({ players }: { players: Player[] }) {
  const [addState, addAction, adding] = useActionState(addPlayer, undefined);
  const [removeState, removeAction] = useActionState(removePlayer, undefined);

  return (
    <Card title="Players" subtitle={`${players.length} in the group`}>
      <form action={addAction} className="flex gap-2">
        <input name="name" placeholder="Add a player" className="glass-input min-w-0 flex-1" autoComplete="off" />
        <button className="glass-button" disabled={adding}>Add</button>
      </form>
      <div className="mt-3 space-y-2">
        <ErrorText>{addState?.error}</ErrorText>
        <ErrorText>{removeState?.error}</ErrorText>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => (
          <li key={p.id} className="ring-pill flex items-center gap-1 py-1 pl-1 pr-1 text-sm">
            <Avatar name={p.name} size="sm" />
            <span className="pl-1 pr-0.5 font-medium">{p.name}</span>
            <form action={removeAction}>
              <input type="hidden" name="id" value={p.id} />
              <button
                aria-label={`Remove ${p.name}`}
                className="grid h-6 w-6 place-items-center rounded-full text-white/40 hover:bg-white/15 hover:text-white"
              >
                ×
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
