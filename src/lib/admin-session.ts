// Admin sessions: a signed, expiring token in an httpOnly cookie.
// Uses Web Crypto so it works in the proxy as well as in server code.

export const SESSION_COOKIE = "ek_session";
export const SESSION_HOURS = 12;

// The admin lives at a secret path (ADMIN_PATH) instead of /admin.
// Without ADMIN_PATH, ADMIN_PASSWORD and ADMIN_SESSION_SECRET the admin is
// switched off and every admin URL answers 404.
export function adminSlug(): string | null {
  const slug = (process.env.ADMIN_PATH ?? "").replace(/^\/+|\/+$/g, "");
  if (!slug || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return null;
  return slug;
}

export const adminHref = (path = "") => `/${adminSlug()}${path}`;

const encoder = new TextEncoder();

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.ADMIN_SESSION_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`ekagra-admin.${payload}`)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession() {
  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  return `${expires}.${await sign(String(expires))}`;
}

export async function verifySession(token: string | undefined) {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return sameString(sig, await sign(expires));
}
