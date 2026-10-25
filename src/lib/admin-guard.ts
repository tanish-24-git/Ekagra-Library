import "server-only";
import { notFound } from "next/navigation";
import { adminStanding } from "./admin-accounts";
import { adminEmails, adminMode } from "./admin-session";
import { auth } from "./auth";

// Second line of defence behind src/proxy.ts: every admin page, action and
// API handler checks access itself and answers "not found" without it.

// The signed-in Neon Auth user, when their session is still live and they're
// an admin: their account is in the admins table (an admin who changed their
// sign-in email), or their email is one of ADMIN_EMAILS and isn't an address
// a recorded admin moved away from.
export async function adminUser() {
  if (adminMode() !== "secure" || !auth) return null;
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user?.email || !data?.session?.token) return null;
  const standing = await adminStanding(user.id, user.email, data.session.token);
  if (!standing.live) return null;
  if (standing.recorded) return user;
  return adminEmails().includes(user.email.toLowerCase()) && !standing.retired ? user : null;
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
