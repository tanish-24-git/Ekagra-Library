import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE, adminMode, verifySession } from "./admin-session";

// Second line of defence behind src/proxy.ts: every admin page, action and
// API handler checks access itself and answers "not found" without it.

export async function isAdmin() {
  const mode = adminMode();
  if (mode === "open") return true;
  if (mode === "off") return false;
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) notFound();
}

export const hiddenResponse = () => new Response("Not found", { status: 404 });
