// Minimal admin auth: compare a submitted password to the ADMIN_PASSWORD env var,
// then set a signed HTTP-only cookie. The cookie value is an HMAC of a fixed marker
// using the password as the key, so it can't be forged without knowing the password
// and doesn't expose the password itself.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "hp_admin";
const MARKER = "hikingpoll-admin-v1";

function adminPassword(): string {
  // In local dev without a configured password, fall back to a well-known default
  // so the admin screen is usable out of the box. Production should always set it.
  return process.env.ADMIN_PASSWORD || "hike-admin";
}

export function expectedToken(): string {
  return createHmac("sha256", adminPassword()).update(MARKER).digest("hex");
}

export function checkPassword(submitted: string): boolean {
  const a = Buffer.from(submitted || "");
  const b = Buffer.from(adminPassword());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
