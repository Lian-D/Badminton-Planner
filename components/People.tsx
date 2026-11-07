import { ShuttleIcon } from "./ShuttleIcon";

// Minimalist people illustration built from the same Notionists faces as the avatars.
const CAST = ["rally", "smash", "drop shot", "net kill"];

export function People({ size = "md", cast = CAST }: { size?: "sm" | "md"; cast?: string[] }) {
  const face = size === "sm" ? "h-12 w-12" : "h-16 w-16 sm:h-20 sm:w-20";
  return (
    <div aria-hidden className="relative mx-auto flex w-max items-end">
      {cast.map((seed, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- tiny cached SVG
        <img
          key={seed}
          src={`/avatar/${encodeURIComponent(seed)}`}
          alt=""
          className={`${face} rounded-full ring-4 ring-[rgb(21_24_31)] ${i > 0 ? "-ml-3" : ""} ${i % 2 ? "translate-y-1" : ""}`}
          style={{ zIndex: cast.length - i }}
        />
      ))}
      <ShuttleIcon className={`absolute -right-6 -top-5 rotate-[24deg] ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`} />
    </div>
  );
}
