import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export const newToken = () => randomBytes(24).toString("base64url");

/** Session tokens are stored hashed so a leaked DB can't be used to log in. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
