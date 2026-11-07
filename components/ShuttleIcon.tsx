/** Shuttlecock mark: cork base, band and a flared feather skirt. */
export function ShuttleIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      {/* feather skirt */}
      <path d="M5.5 3.5 L12 20 H20 L26.5 3.5 Q16 1 5.5 3.5Z" fill="var(--color-volt)" fillOpacity=".18" stroke="var(--color-volt)" strokeWidth="1.8" strokeLinejoin="round" />
      {/* feather shafts */}
      <path d="M10.5 2.6 L14.2 20 M16 2.2 V20 M21.5 2.6 L17.8 20" stroke="var(--color-volt)" strokeWidth="1.3" strokeLinecap="round" />
      {/* binding threads */}
      <path d="M8.3 10.5 Q16 8.8 23.7 10.5 M10.4 15.7 Q16 14.6 21.6 15.7" stroke="var(--color-volt)" strokeWidth="1.1" opacity=".7" />
      {/* band + cork */}
      <rect x="11" y="19.5" width="10" height="3" rx="1" fill="var(--color-volt)" />
      <path d="M11.5 22.5 H20.5 V24 A4.5 4.5 0 0 1 11.5 24 Z" fill="var(--color-volt)" />
    </svg>
  );
}
