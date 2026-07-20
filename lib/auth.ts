import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "m-de-session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET env var");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  const expectedSig = Buffer.from(sign(expiresAt));
  const actualSig = Buffer.from(signature);
  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return false;
  }

  const expiresAtMs = Number(expiresAt);
  return Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) throw new Error("Missing APP_PASSWORD_HASH env var");
  return bcrypt.compare(password, hash);
}
