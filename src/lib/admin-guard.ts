import "server-only";
import { notFound } from "next/navigation";
import { adminEmails, adminMode } from "./admin-session";
import { auth } from "./auth";

// Second line of defence behind src/proxy.ts: every admin page, action and
// API handler checks access itself and answers "not found" without it.

// The signed-in Neon Auth user, when their email is one of ADMIN_EMAILS.
export async function adminUser() {
  if (adminMode() !== "secure" || !auth) return null;
  const user = (await auth.getSession()).data?.user;
  const email = user?.email?.toLowerCase();
  return user && email && adminEmails().includes(email) ? user : null;
}

export async function isAdmin() {
  const mode = adminMode();
  if (mode === "open") return true;
  if (mode === "off") return false;
  return !!(await adminUser());
}

export async function requireAdmin() {
  if (!(await isAdmin())) notFound();
}

export const hiddenResponse = () => new Response("Not found", { status: 404 });
