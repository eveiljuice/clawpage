/**
 * Token generation and validation for multi-user auth.
 */
import { randomBytes } from "crypto";

export function generateToken(): string {
  return "hm_" + randomBytes(24).toString("hex");
}

export function isValidToken(token: string): boolean {
  return typeof token === "string" && token.startsWith("hm_") && token.length === 51;
}

export function extractBearer(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}
