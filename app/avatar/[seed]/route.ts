import { createHash } from "node:crypto";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { cached, CacheKeys } from "@/lib/cache";

// Notionists by Zoish, CC0 1.0 (https://heyzoish.gumroad.com/l/notionists), via DiceBear.
const BACKGROUNDS = ["e6f9a6", "f2ffc4", "c8f31d", "b6d4ff", "d9e8ff", "9cc8ff"];

/**
 * GET /avatar/<name>: a deterministic profile picture. The seed is a SHA-256
 * hash of the lowercased name, so the same person gets the same face as a
 * player, an account and a voter.
 */
export async function GET(_req: Request, ctx: RouteContext<"/avatar/[seed]">) {
  const { seed } = await ctx.params;
  const hash = createHash("sha256").update(decodeURIComponent(seed).trim().toLowerCase()).digest("hex");
  const svg = await cached(CacheKeys.avatar(hash), 60 * 60 * 24 * 30, () =>
    createAvatar(notionists, { seed: hash, backgroundColor: BACKGROUNDS, backgroundType: ["solid"] }).toString(),
  );

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
