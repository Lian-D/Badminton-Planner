// Decorative backdrop: a doubles badminton court seen in perspective under
// floodlights, heavily blurred so it reads as ambient light. Dimensions are in cm (13.40 m × 6.10 m), lines 4 cm wide.

const W = 610;
const L = 1340;
const NET = L / 2;

export function CourtBackground() {
  const line = { stroke: "rgb(255 255 255 / 0.55)", strokeWidth: 5 };
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* arena + floodlights */}
      <div className="arena absolute inset-0" />

      {/* court plane */}
      <div className="court-stage absolute inset-0">
        <svg viewBox={`-60 -60 ${W + 120} ${L + 120}`} className="court-plane">
          <defs>
            <linearGradient id="mat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1d4a8a" />
              <stop offset="0.5" stopColor="#173b6e" />
              <stop offset="1" stopColor="#102a50" />
            </linearGradient>
            <pattern id="mesh" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 0 L10 10 M10 0 L0 10" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* run-off area and mat */}
          <rect x={-60} y={-60} width={W + 120} height={L + 120} rx={8} fill="#0e1a2c" />
          <rect x={0} y={0} width={W} height={L} fill="url(#mat)" />

          {/* boundary (doubles) */}
          <rect x={0} y={0} width={W} height={L} fill="none" {...line} />
          {/* singles sidelines */}
          <path d={`M46 0 V${L} M${W - 46} 0 V${L}`} {...line} />
          {/* doubles long service lines */}
          <path d={`M0 76 H${W} M0 ${L - 76} H${W}`} {...line} />
          {/* short service lines */}
          <path d={`M0 ${NET - 198} H${W} M0 ${NET + 198} H${W}`} {...line} />
          {/* centre lines */}
          <path d={`M${W / 2} 0 V${NET - 198} M${W / 2} ${NET + 198} V${L}`} {...line} />

          {/* net: posts, tape and mesh shadow */}
          <rect x={-46} y={NET - 14} width={W + 92} height={28} fill="url(#mesh)" />
          <path d={`M-46 ${NET} H${W + 46}`} stroke="rgb(255 255 255 / 0.85)" strokeWidth="7" />
          <circle cx={-46} cy={NET} r={11} fill="#d9dccf" />
          <circle cx={W + 46} cy={NET} r={11} fill="#d9dccf" />
        </svg>
      </div>

      {/* light spill on the net */}
      <div className="net-glow absolute inset-x-0 top-[45%] h-[35vh]" />

      {/* vignette so cards stay readable */}
      <div className="vignette absolute inset-0" />
    </div>
  );
}
