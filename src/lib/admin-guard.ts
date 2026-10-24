import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./admin-session";

// Second line of defence behind src/proxy.ts: every admin page, action and
// API handler checks the session itself and answers "not found" without one.

export async function isAdmin() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) notFound();
}

export const hiddenResponse = () => new Response("Not found", { status: 404 });
