import { Suspense } from "react";
import Link from "next/link";
import { getData } from "@/lib/queries";
import { computeBalances, settleUp } from "@/lib/split";
import { AttendanceGrid } from "@/components/AttendanceGrid";
import { BalancesTable } from "@/components/BalancesTable";
import { PaymentsList } from "@/components/PaymentsList";
import { SessionForm } from "@/components/SessionForm";
import { SettleUp } from "@/components/SettleUp";
import { Card } from "@/components/ui";

export default function Home() {
  return (
    <Suspense fallback={<div className="glass h-64 animate-pulse rounded-3xl" />}>
      <Dashboard />
    </Suspense>
  );
}

function SignInPrompt() {
  return (
    <Card title="Log a court session" subtitle="Anyone with an account can log courts.">
      <p className="text-[15px] text-white/60">
        You can see who owes what without signing in. To log sessions or tick off payments, sign in first.
      </p>
      <Link href="/login" className="glass-button mt-5 inline-block">Sign in</Link>
    </Card>
  );
}

async function Dashboard() {
  const { players, sessions, payments, today, account } = await getData();
  const balances = computeBalances(players, sessions, payments);
  const transfers = settleUp(balances);
  const canEdit = !!account;

  return (
    <div className="space-y-6">
      <AttendanceGrid sessions={sessions} players={players} canEdit={canEdit} isAdmin={account?.role === "admin"} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <BalancesTable balances={balances} />
        <SettleUp transfers={transfers} players={players} today={today} canEdit={canEdit} />
      </div>

      <PaymentsList payments={payments} players={players} canEdit={canEdit} />

      {canEdit ? <SessionForm players={players} today={today} /> : <SignInPrompt />}
    </div>
  );
}
