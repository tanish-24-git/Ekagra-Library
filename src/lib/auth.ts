import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth (Better Auth, hosted by Neon) for the admin sign-in. Null until
// NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are set. Sessions live in
// signed cookies; the session details are cached in a cookie for 5 minutes,
// so most admin requests don't wait on Neon.
const baseUrl = process.env.NEON_AUTH_BASE_URL;
const secret = process.env.NEON_AUTH_COOKIE_SECRET;

export const auth = baseUrl && secret ? createNeonAuth({ baseUrl, cookies: { secret } }) : null;
