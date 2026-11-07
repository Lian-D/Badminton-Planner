"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import {
  removeAccount,
  removeDiscordWebhook,
  removeVoter,
  resetPassword,
  resetVoter,
  saveDiscord,
  saveSiteUrl,
  setRole,
  testDiscord,
  toggleSignups,
} from "@/app/admin/actions";
import type { Role } from "@/lib/auth";
import { Avatar, Card, ErrorText } from "./ui";

export type AccountRow = { id: number; username: string; role: Role; createdAt: string };

/** iOS-style switch */
function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${on ? "bg-volt" : "bg-[var(--color-fill)]"}`}
    >
      <span
        className={`absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.3)] transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export function SignupSettings({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  const [, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <Card title="Sign-ups">
      <div className="grouped">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <div className="text-[17px] font-medium">Allow account creation</div>
            <div className="text-[13px] text-[rgb(235_235_245/0.6)]">
              {on ? "Anyone can create a host account from the sign-in page." : "Only existing accounts can sign in."}
            </div>
          </div>
          <Switch
            on={on}
            label="Allow account creation"
            onChange={(next) =>
              start(async () => {
                setOn(next);
                const res = await toggleSignups(next);
                setError(res?.error);
              })
            }
          />
        </div>
      </div>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Card>
  );
}

export function AccountsPanel({ accounts, meId }: { accounts: AccountRow[]; meId: number }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [resetState, resetAction, resetting] = useActionState(resetPassword, undefined);

  const run = (fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      const res = await fn();
      setError(res?.error);
    });

  return (
    <Card title="Accounts" subtitle="Admins manage sign-ups, accounts and players. Hosts can log courts.">
      <ul className={`grouped ${pending ? "opacity-70" : ""}`}>
        {accounts.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={a.username} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-medium">
                  {a.username}
                  {a.id === meId && <span className="ml-2 text-[13px] text-white/45">(you)</span>}
                </div>
                <div className="text-[13px] text-[rgb(235_235_245/0.6)]">Joined {a.createdAt.slice(0, 10)}</div>
              </div>
              {/* role segmented control */}
              <div className="flex rounded-full bg-[var(--color-fill)] p-0.5 text-[13px] font-semibold">
                {(["host", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => a.role !== r && run(() => setRole(a.id, r))}
                    className={`rounded-full px-3 py-1 capitalize transition ${
                      a.role === r ? (r === "admin" ? "bg-volt text-ink" : "bg-cobalt text-white") : "text-white/60 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setResetFor(resetFor === a.id ? null : a.id)}
                className="text-[13px] font-medium text-cobalt-soft hover:text-white"
              >
                Reset password
              </button>
              {a.id !== meId && (
                <button
                  type="button"
                  onClick={() => confirm(`Remove ${a.username}'s account?`) && run(() => removeAccount(a.id))}
                  className="text-[13px] font-medium text-live/90 hover:text-live"
                >
                  Remove
                </button>
              )}
            </div>
            {resetFor === a.id && (
              <form action={resetAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={a.id} />
                <input
                  name="password"
                  type="password"
                  placeholder={`New password for ${a.username}`}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="glass-input min-w-0 flex-1"
                />
                <button className="glass-button" disabled={resetting}>Save</button>
                <div className="w-full">
                  <ErrorText>{resetState?.error}</ErrorText>
                  {resetState?.ok && <p className="text-[13px] text-volt">Password updated. They&apos;ve been signed out everywhere.</p>}
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Card>
  );
}

type EventInfo = { id: string; label: string; on: boolean };

export function DiscordPanel({ maskedUrl, events }: { maskedUrl: string | null; events: EventInfo[] }) {
  const [state, action, saving] = useActionState(saveDiscord, undefined);
  const [switches, setSwitches] = useState(() => Object.fromEntries(events.map((e) => [e.id, e.on])));
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ error?: string; ok?: number }>();

  return (
    <Card title="Discord notifications" subtitle="Post updates to a channel through a webhook.">
      <form action={action} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="pl-1 text-[13px] uppercase tracking-wide text-[rgb(235_235_245/0.6)]">Webhook URL</span>
          <input
            name="url"
            type="password"
            autoComplete="off"
            placeholder={maskedUrl ? "Saved. Paste a new URL to replace it" : "https://discord.com/api/webhooks/…"}
            className="glass-input"
          />
          {maskedUrl && <span className="truncate pl-1 font-mono text-[11px] text-white/40">{maskedUrl}</span>}
        </label>

        <div className="grouped">
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-[15px]">{e.label}</span>
              <input type="hidden" name={`event_${e.id}`} value={switches[e.id] ? "on" : "off"} />
              <Switch on={switches[e.id]} label={e.label} onChange={(on) => setSwitches((s) => ({ ...s, [e.id]: on }))} />
            </div>
          ))}
        </div>

        <ErrorText>{state?.error ?? testResult?.error}</ErrorText>
        {state?.ok && !state.error && <p className="text-[13px] text-volt">Saved.</p>}
        {testResult?.ok && <p className="text-[13px] text-volt">Test message sent. Check your channel.</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button className="glass-button" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <button
            type="button"
            disabled={!maskedUrl || testing}
            onClick={() => startTest(async () => setTestResult(await testDiscord()))}
            className="ring-pill px-4 py-2.5 text-[15px] font-semibold text-cobalt-soft enabled:hover:bg-white/8 disabled:opacity-40"
          >
            {testing ? "Sending…" : "Send test"}
          </button>
          {maskedUrl && (
            <button
              type="button"
              onClick={() => confirm("Remove the Discord webhook?") && startTest(async () => setTestResult(await removeDiscordWebhook()))}
              className="ml-auto text-[13px] font-medium text-live/90 hover:text-live"
            >
              Remove webhook
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function GeneralSettings({ siteUrl, fromEnv }: { siteUrl: string | null; fromEnv: boolean }) {
  const [state, action, saving] = useActionState(saveSiteUrl, undefined);
  return (
    <Card title="Settings">
      <form action={action} className="space-y-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="pl-1 text-[13px] uppercase tracking-wide text-[rgb(235_235_245/0.6)]">Site URL</span>
          <input
            name="siteUrl"
            type="url"
            inputMode="url"
            defaultValue={fromEnv ? "" : siteUrl ?? ""}
            placeholder={siteUrl ?? "https://badminton.example.com"}
            className="glass-input"
          />
        </label>
        <p className="pl-1 text-[13px] text-[rgb(235_235_245/0.6)]">
          Discord messages link here. {fromEnv && "Currently set by the SITE_URL environment variable."}
        </p>
        <ErrorText>{state?.error}</ErrorText>
        {state?.ok && <p className="pl-1 text-[13px] text-volt">Saved.</p>}
        <button className="glass-button" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </Card>
  );
}

export type VoterRow = { id: number; name: string; hasPassword: boolean; votesThisWeek: number; lastWeek: string | null };

export function VotersPanel({ voters }: { voters: VoterRow[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [filter, setFilter] = useState("");
  const shown = voters.filter((v) => v.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const act = (fn: () => Promise<{ error?: string } | undefined>, ok: string) =>
    start(async () => {
      const res = await fn();
      setMessage(res?.error ? { error: res.error } : { ok });
    });

  return (
    <Card
      title="Voters"
      subtitle="People who signed in to the court vote. Resetting clears their password and signs them out everywhere; their votes stay."
    >
      {voters.length > 6 && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search voters"
          aria-label="Search voters"
          className="glass-input mb-3 w-full"
        />
      )}
      {voters.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.04] px-4 py-6 text-center text-[15px] text-white/55">Nobody has voted yet.</p>
      ) : (
        <ul className={`grouped ${pending ? "opacity-70" : ""}`}>
          {shown.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={v.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-[17px] font-medium">
                  {v.name}
                  {v.hasPassword && (
                    <span title="Has a password" className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                      Password
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-[rgb(235_235_245/0.6)]">
                  {v.votesThisWeek
                    ? `${v.votesThisWeek} vote${v.votesThisWeek === 1 ? "" : "s"} this week`
                    : v.lastWeek
                      ? `Last voted week of ${v.lastWeek}`
                      : "No votes yet"}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  confirm(`Reset ${v.name}'s voting login? They'll be signed out and can set a new password next time.`) &&
                  act(() => resetVoter(v.id), `${v.name} was signed out and their password cleared.`)
                }
                className="text-[13px] font-medium text-cobalt-soft hover:text-white"
              >
                Reset login
              </button>
              <button
                type="button"
                onClick={() =>
                  confirm(`Remove ${v.name} and all their votes?`) && act(() => removeVoter(v.id), `${v.name} was removed.`)
                }
                className="text-[13px] font-medium text-live/90 hover:text-live"
              >
                Remove
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-4 text-[15px] text-white/50">No voters match “{filter}”.</li>}
        </ul>
      )}
      <div className="mt-3">
        <ErrorText>{message?.error}</ErrorText>
        {message?.ok && <p className="pl-1 text-[13px] text-volt">{message.ok}</p>}
      </div>
    </Card>
  );
}
