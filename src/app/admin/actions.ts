"use server";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DocumentKind } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { adminEmails, adminHref } from "@/lib/admin-session";
import { auth } from "@/lib/auth";
import { DOCUMENT_KINDS, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents";
import { formatShortDate } from "@/lib/labels";
import { runReminders, type ReminderRun } from "@/lib/reminders";
import { createStudent, renewStudent, revealIdNumber, type NewDocument } from "@/lib/students";
import { createStudentSchema, renewSchema } from "@/lib/validation";

// Wrong sign-ins: five tries per IP, then a 15-minute lockout. Kept in
// memory, so it resets on restart and isn't shared between server instances.
// Neon Auth adds its own rate limits on top.
const MAX_TRIES = 5;
const LOCKOUT_MS = 15 * 60_000;
const failures = new Map<string, { count: number; until: number }>();

// email and name come back so the form keeps them after an error.
export type LoginState = { error?: string; notice?: string; email?: string; name?: string };

const credentials = (formData: FormData) => ({
  email: String(formData.get("email") ?? "").trim().toLowerCase(),
  password: String(formData.get("password") ?? ""),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!auth) return { error: "Admin sign-in isn’t set up yet. See README: Opening the admin." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const record = failures.get(ip);
  if (record && record.count >= MAX_TRIES && record.until > now) {
    return { error: "Too many wrong sign-ins. Try again in 15 minutes.", email: String(formData.get("email") ?? "") };
  }

  const { email, password } = credentials(formData);
  // Addresses outside ADMIN_EMAILS get the same answer as a wrong password.
  const result = adminEmails().includes(email) ? await auth.signIn.email({ email, password }) : null;

  if (!result || result.error) {
    const count = record && record.until > now ? record.count + 1 : 1;
    failures.set(ip, { count, until: now + LOCKOUT_MS });
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That email and password don’t match an admin account.", email };
  }

  failures.delete(ip);
  redirect(adminHref());
}

// First-time setup: an address listed in ADMIN_EMAILS chooses its password.
export async function createAdminAccount(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!auth) return { error: "Admin sign-in isn’t set up yet. See README: Opening the admin." };
  const { email, password } = credentials(formData);
  const name = String(formData.get("name") ?? "").trim() || email.split("@")[0];

  if (!adminEmails().includes(email)) {
    return { error: "This email isn’t on the admin list. Add it to ADMIN_EMAILS first, then try again.", email, name };
  }
  if (password.length < 10) return { error: "Use at least 10 characters for the password.", email, name };

  const { data, error } = await auth.signUp.email({ email, password, name });
  if (error) {
    return {
      error: /exist/i.test(error.message ?? "")
        ? "There’s already an account for this email. Sign in instead."
        : `Couldn’t create the account: ${error.message ?? "unknown error"}.`,
      email,
      name,
    };
  }

  // Without a session token the project wants the email verified first.
  if (!data?.token) return { notice: "Account created. Check your inbox for the verification email, then sign in." };
  redirect(adminHref());
}

export async function logout() {
  await auth?.signOut();
  redirect("/");
}

export type AddStudentState = { message?: string; fields?: Record<string, string[] | undefined>; values?: Record<string, string> };

export async function addStudent(_prev: AddStudentState, formData: FormData): Promise<AddStudentState> {
  await requireAdmin();
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
  const parsed = createStudentSchema.safeParse(values);
  const fields: Record<string, string[] | undefined> = parsed.success ? {} : { ...z.flattenError(parsed.error).fieldErrors };

  const documents: NewDocument[] = [];
  for (const kind of DOCUMENT_KINDS) {
    const file = formData.get(`doc_${kind}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!DOCUMENT_TYPES.includes(file.type)) fields[`doc_${kind}`] = ["Upload a JPG, PNG, WebP or PDF file"];
    else if (file.size > MAX_DOCUMENT_BYTES) fields[`doc_${kind}`] = ["This file is over 4 MB. Upload a smaller photo"];
    else documents.push({ kind, contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
  }

  const sharesId = Boolean(values.aadhaar?.trim() || values.pan?.trim() || documents.length);
  if (sharesId && values.consent !== "on") fields.consent = ["Confirm the student agreed to share their ID"];

  if (!parsed.success || Object.keys(fields).length) {
    return { message: "Check the highlighted fields.", fields, values };
  }
  await createStudent(parsed.data, documents);
  redirect(adminHref());
}

// Shows the full Aadhaar or PAN number on the student page when asked.
export async function revealNumber(studentId: string, kind: Extract<DocumentKind, "aadhaar" | "pan">): Promise<string | null> {
  await requireAdmin();
  return revealIdNumber(studentId, kind);
}

export type RenewState = { message?: string; error?: string; fields?: Record<string, string[] | undefined> };

// Records a renewal payment and extends the membership (bound to a student id).
export async function renewMembership(studentId: string, _prev: RenewState, formData: FormData): Promise<RenewState> {
  await requireAdmin();
  const parsed = renewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const student = await renewStudent(studentId, parsed.data);
  if (!student?.endsOn) return { error: "Couldn’t find this student. Reload the page and try again." };
  refresh();
  return { message: `Renewed. The membership now runs until ${formatShortDate(student.endsOn)}.` };
}

export async function sendRemindersNow(): Promise<ReminderRun> {
  await requireAdmin();
  return runReminders();
}
