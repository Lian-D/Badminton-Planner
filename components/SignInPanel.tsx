"use client";

import { useActionState } from "react";
import { signIn, signOut } from "@/app/vote/actions";
import type { Voter } from "@/lib/voters";
import { Avatar, Card, ErrorText, Field } from "./ui";

export function SignInPanel({ me }: { me: Voter | null }) {
  const [state, action, pending] = useActionState(signIn, undefined);

  if (me) {
    return (
      <Card title="You're voting as" className="!p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} light />
            <span className="font-display text-[22px] font-bold tracking-[-0.025em]">{me.name}</span>
          </div>
          <form action={signOut}>
            <button className="ring-pill px-4 py-2 text-sm text-white/70 hover:bg-white/8 hover:text-white">Sign out</button>
          </form>
        </div>
        <p className="mt-3 text-sm text-white/55">Tap the slots you can make. Tap again to remove.</p>
      </Card>
    );
  }

  return (
    <Card title="Sign in to vote" subtitle="No account needed. Just pick a name for this browser.">
      <form action={action} className="space-y-3">
        <Field label="Your name">
          <input name="name" defaultValue={state?.name} className="glass-input" autoComplete="nickname" required maxLength={40} />
        </Field>
        <Field label="Password (optional)">
          <input name="password" type="password" className="glass-input" autoComplete="current-password" />
        </Field>
        <p className="text-xs text-white/45">
          New names are created on the spot. A password stops anyone else from changing your votes.
        </p>
        <ErrorText>{state?.error}</ErrorText>
        <button className="glass-button w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Card>
  );
}
