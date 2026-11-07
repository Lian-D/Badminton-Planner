"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/login/actions";
import { Card, ErrorText, Field } from "./ui";
import { People } from "./People";

export function LoginForm({ firstAccount, signupsOpen }: { firstAccount: boolean; signupsOpen: boolean }) {
  const [mode, setMode] = useState<"in" | "up">(firstAccount ? "up" : "in");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);

  if (firstAccount) {
    return (
      <>
        <div className="mb-6">
          <People />
        </div>
        <Card
          title="Create the admin account"
          subtitle="You're the first one here, so this account will manage hosts, players and sign-ups."
        >
          <SignUpFields action={upAction} pending={upPending} error={upState?.error} cta="Create admin account" />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <People />
      </div>
      <Card>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-[var(--color-fill)] p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full py-2 text-[15px] font-semibold transition ${
                mode === m ? "bg-volt text-ink" : "text-white/70 hover:text-white"
              }`}
            >
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {mode === "in" ? (
          <form action={inAction} className="space-y-4">
            <Field label="Username">
              <input name="username" className="glass-input" autoComplete="username" required autoFocus />
            </Field>
            <Field label="Password">
              <input name="password" type="password" className="glass-input" autoComplete="current-password" required />
            </Field>
            <ErrorText>{inState?.error}</ErrorText>
            <button className="glass-button w-full" disabled={inPending}>
              {inPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : signupsOpen ? (
          <SignUpFields action={upAction} pending={upPending} error={upState?.error} cta="Create account" />
        ) : (
          <p className="rounded-2xl bg-white/[0.04] px-4 py-6 text-center text-[15px] text-white/60">
            Account creation is turned off. Ask an admin to turn it on.
          </p>
        )}
      </Card>
    </>
  );
}

function SignUpFields({
  action,
  pending,
  error,
  cta,
}: {
  action: (form: FormData) => void;
  pending: boolean;
  error?: string;
  cta: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field label="Username">
        <input
          name="username"
          className="glass-input"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9._\-]+"
          autoFocus
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          className="glass-input"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <Field label="Confirm password">
        <input
          name="confirm"
          type="password"
          className="glass-input"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <button className="glass-button w-full" disabled={pending}>
        {pending ? "Creating…" : cta}
      </button>
    </form>
  );
}
