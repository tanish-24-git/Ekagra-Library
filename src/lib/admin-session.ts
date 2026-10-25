// Who can reach the admin and where it lives. No secrets here, so the proxy
// can use it as well as server code.

// How the admin is reached:
//  - "open":   development on sample data (no DATABASE_URL) without the sign-in
//              settings below. /admin works with no login. Never with real data.
//  - "secure": NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET and ADMIN_EMAILS are set.
//              You sign in with Neon Auth (Better Auth) as one of ADMIN_EMAILS. With
//              ADMIN_PATH also set, the admin lives at /<ADMIN_PATH> and /admin is a 404.
//  - "off":    anything else, e.g. real data or production without those settings.
//              Every admin URL is a 404.
export type AdminMode = "open" | "secure" | "off";

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function adminMode(): AdminMode {
  const configured = !!(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET && adminEmails().length);
  if (configured) return "secure";
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL ? "open" : "off";
}

const secretPath = () => (process.env.ADMIN_PATH ?? "").replace(/^\/+|\/+$/g, "");

export function adminSlug(): string | null {
  const mode = adminMode();
  if (mode === "off") return null;
  return (mode === "secure" && secretPath()) || "admin";
}

export const adminHref = (path = "") => `/${adminSlug()}${path}`;
