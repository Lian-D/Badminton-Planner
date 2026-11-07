import type { ReactNode } from "react";
import { People } from "./People";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass min-w-0 rounded-[28px] p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div>
            {title && <h2 className="font-display text-[22px] font-bold leading-tight tracking-[-0.025em]">{title}</h2>}
            {subtitle && <p className="mt-1 text-[15px] text-[rgb(235_235_245/0.6)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="pl-1 text-[13px] uppercase tracking-wide text-[rgb(235_235_245/0.6)]">{label}</span>
      {children}
    </label>
  );
}

/** Profile picture generated from a hash of the name (see app/avatar/[seed]/route.ts). */
export function Avatar({ name, size = "md", light = false }: { name: string; size?: "xs" | "sm" | "md" | "lg"; light?: boolean }) {
  const dims = { xs: "h-4 w-4", sm: "h-8 w-8", md: "h-11 w-11", lg: "h-14 w-14" }[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny cached SVG, no optimisation needed
    <img
      src={`/avatar/${encodeURIComponent(name.trim().toLowerCase())}`}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-full bg-white/10 object-cover ${size === "xs" ? "" : "ring-4"} ${dims} ${
        light ? "ring-white/15" : "ring-cobalt/15"
      }`}
    />
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-live/15 px-4 py-2.5 text-[15px] text-live">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center">
      <People size="sm" cast={["rally", "smash", "drop shot"]} />
      <p className="mt-4 text-sm text-white/50">{children}</p>
    </div>
  );
}

export function Money({ cents, signed = false }: { cents: number; signed?: boolean }) {
  const text = (Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  if (!signed) return <span className="tabular-nums">{text}</span>;
  const color = cents > 0 ? "text-volt" : cents < 0 ? "text-live" : "text-white/45";
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return <span className={`tabular-nums font-semibold ${color}`}>{sign}{text}</span>;
}
