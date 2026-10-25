import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { adminEmails } from "./admin-session";

// Admin accounts kept in the database, and changing an account's sign-in
// email in Neon Auth. Neon Auth ties the password to the user ID, not the
// email, so updating the email on the user row is all a change needs.

// Everything the admin check needs, in one query: whether this session is
// still live in Neon Auth (so ended sessions stop at once, not when the
// 5-minute session cookie cache runs out), whether the account is a recorded
// admin, and whether its email is one a recorded admin moved away from
// (which ADMIN_EMAILS no longer covers).
export async function adminStanding(userId: string, email: string, sessionToken: string) {
  if (!db) return { live: true, recorded: false, retired: false };
  const { rows } = await db.execute(sql`select
    exists(select 1 from neon_auth.session where token = ${sessionToken} and "userId" = ${userId} and "expiresAt" > now()) as live,
    exists(select 1 from ${admins} where ${admins.userId} = ${userId}) as recorded,
    exists(select 1 from ${admins} where ${admins.userId} <> ${userId} and ${email.toLowerCase()} = any(${admins.previousEmails})) as retired`);
  return rows[0] as { live: boolean; recorded: boolean; retired: boolean };
}

// Whether signing in with this email may lead to the admin: a recorded
// admin's current email, or one in ADMIN_EMAILS no recorded admin moved away from.
export async function mayBeAdminEmail(email: string) {
  const e = email.toLowerCase();
  if (!db) return adminEmails().includes(e);
  const rows = await db
    .select({ email: admins.email })
    .from(admins)
    .where(sql`${admins.email} = ${e} or ${e} = any(${admins.previousEmails})`);
  if (rows.some((r) => r.email === e)) return true;
  return !rows.length && adminEmails().includes(e);
}

export async function rememberAdmin(userId: string, email: string, oldEmail: string) {
  if (!db) return;
  const [row] = await db.select({ previousEmails: admins.previousEmails }).from(admins).where(eq(admins.userId, userId));
  const previousEmails = [...new Set([...(row?.previousEmails ?? []), oldEmail.toLowerCase()])].filter((e) => e !== email);
  await db
    .insert(admins)
    .values({ userId, email, previousEmails })
    .onConflictDoUpdate({ target: admins.userId, set: { email, previousEmails, updatedAt: new Date() } });
}

export async function emailUsedByAnotherAccount(email: string, userId: string): Promise<boolean> {
  if (!db) return false;
  const { rows } = await db.execute(sql`select 1 from neon_auth."user" where lower(email) = ${email.toLowerCase()} and id <> ${userId} limit 1`);
  return rows.length > 0;
}

export async function setSignInEmail(userId: string, email: string) {
  if (!db) throw new Error("The database isn't connected (DATABASE_URL).");
  await db.execute(sql`update neon_auth."user" set email = ${email.toLowerCase()}, "updatedAt" = now() where id = ${userId}`);
}

// Signs the account out everywhere except the session just created.
export async function endOtherSessions(userId: string, keepToken: string) {
  if (!db) return;
  await db.execute(sql`delete from neon_auth.session where "userId" = ${userId} and token <> ${keepToken}`);
}
