import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { accountCount, getAccount, signupsEnabled } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<div className="glass h-80 animate-pulse rounded-[28px]" />}>
        <Login />
      </Suspense>
      <p className="mt-4 text-center text-[13px] text-white/45">
        Accounts are for logging courts. Voting doesn&apos;t need one.
      </p>
    </div>
  );
}

async function Login() {
  await connection();
  if (await getAccount()) redirect("/");
  return <LoginForm firstAccount={accountCount() === 0} signupsOpen={signupsEnabled()} />;
}
