import Link from "next/link";
import { connection } from "next/server";
import { signOut } from "@/app/login/actions";
import { getAccount } from "@/lib/auth";
import { MobileNav, Tabs } from "./Tabs";
import { Avatar } from "./ui";

/** Header tabs + account pill (reads the auth cookie, so it renders per request). */
export async function HeaderNav() {
  await connection();
  const me = await getAccount();
  return (
    <div className="flex items-center gap-3">
      <Tabs isAdmin={me?.role === "admin"} />
      {me ? (
        <div className="glass flex items-center gap-1 rounded-full p-1 pl-1">
          <Avatar name={me.username} size="sm" />
          <span className="hidden max-w-[120px] truncate px-1.5 text-[15px] font-semibold md:inline">{me.username}</span>
          <form action={signOut}>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="grid h-8 place-items-center rounded-full px-3 text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="glass rounded-full px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-white/10">
          Sign in
        </Link>
      )}
    </div>
  );
}

export async function MobileNavForAccount() {
  await connection();
  const me = await getAccount();
  return <MobileNav isAdmin={me?.role === "admin"} />;
}
