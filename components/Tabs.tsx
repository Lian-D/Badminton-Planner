"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const TABS = [
  {
    href: "/vote",
    label: "Court vote",
    short: "Vote",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...icon}>
        <rect x="3.5" y="5" width="17" height="15" rx="4" />
        <path d="M8 3v4M16 3v4M3.5 10h17M9 14.5l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Courts & costs",
    short: "Costs",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...icon}>
        <rect x="3" y="6" width="18" height="13" rx="4" />
        <path d="M3 10h18M16 15h2" />
      </svg>
    ),
  },
] as const;

const ADMIN_TAB = {
  href: "/admin",
  label: "Admin",
  short: "Admin",
  icon: (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...icon}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
};

type Tab = { href: string; label: string; short: string; icon: React.ReactNode };
const tabsFor = (isAdmin: boolean): Tab[] => (isAdmin ? [...TABS, ADMIN_TAB] : [...TABS]);

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Segmented control in the header (tablet and up). */
export function Tabs({ isAdmin = false }: { isAdmin?: boolean }) {
  const isActive = useActive();
  return (
    <nav className="glass hidden gap-0.5 rounded-full p-1 sm:inline-flex" aria-label="Sections">
      {tabsFor(isAdmin).map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-5 py-2 text-[15px] font-semibold tracking-[-0.01em] transition ${
              active
                ? "bg-volt text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_4px_14px_-4px_rgb(200_243_29/0.5)]"
                : "text-white/80 hover:bg-white/8 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** iOS-style floating Liquid Glass tab bar on phones. */
export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const isActive = useActive();
  return (
    <nav
      aria-label="Sections"
      className="glass fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-max gap-1 rounded-full p-1.5 sm:hidden"
      style={{ background: "rgb(28 31 38 / 0.96)" }}
    >
      {tabsFor(isAdmin).map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            className={`flex w-[88px] flex-col items-center gap-0.5 rounded-full px-3 py-2 transition ${
              active ? "bg-white/12 text-volt" : "text-white/85 active:bg-white/8"
            }`}
          >
            {t.icon}
            <span className="text-[10px] font-semibold tracking-normal">{t.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
