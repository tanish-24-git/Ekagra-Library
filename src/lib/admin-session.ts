// Admin access and sessions. Uses Web Crypto so it works in the proxy as
// well as in server code.

export const SESSION_COOKIE = "ek_session";
export const SESSION_HOURS = 12;

// How the admin is reached:
//  - "open":   development with no admin settings. /admin works, no login.
//  - "hidden": ADMIN_PATH, ADMIN_PASSWORD and ADMIN_SESSION_SECRET are set.
//              The admin lives at /<ADMIN_PATH> behind a login; /admin is a 404.
//  - "off":    production without those settings. Every admin URL is a 404.
export type AdminMode = "open" | "hidden" | "off";

export function adminMode(): AdminMode {
  const configured = !!(process.env.ADMIN_PATH?.replace(/\//g, "") && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
  if (configured) return "hidden";
  return process.env.NODE_ENV === "production" ? "off" : "open";
}

export function adminSlug(): string | null {
  const mode = adminMode();
  if (mode === "off") return null;
  if (mode === "open") return "admin";
  return (process.env.ADMIN_PATH ?? "").replace(/^\/+|\/+$/g, "");
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
