"use server";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DocumentKind } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { adminEmails, adminHref } from "@/lib/admin-session";
import { auth } from "@/lib/auth";
import { DOCUMENT_KINDS, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, matchesType } from "@/lib/documents";
import { formatShortDate } from "@/lib/labels";
import { runReminders, type ReminderRun } from "@/lib/reminders";
import {
  createStudent,
  deleteEnquiry,
  deleteStudent,
  deleteStudentDocument,
  markStudentLeft,
  pauseStudent,
  removeIdNumber,
  renewStudent,
  resumeStudent,
  revealIdNumber,
  setEnquiryStatus,
  updateStudent,
  type EnquiryRecord,
  type IdNumberKind,
  type NewDocument,
} from "@/lib/students";
import { createStudentSchema, editStudentSchema, renewSchema } from "@/lib/validation";

// Wrong sign-ins: five tries per IP, then a 15-minute lockout. Kept in
// memory, so it resets on restart and isn't shared between server instances.
// Neon Auth adds its own rate limits on top.
const MAX_TRIES = 5;
const LOCKOUT_MS = 15 * 60_000;
const failures = new Map<string, { count: number; until: number }>();

// email comes back so the form keeps it after an error.
export type LoginState = { error?: string; email?: string };

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

export type PasswordState = { error?: string; message?: string };

// Changes the signed-in admin's password and signs out their other devices.
export async function changeAdminPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  await requireAdmin();
  if (!auth) return { error: "Admin sign-in isn’t set up." };
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const repeat = String(formData.get("repeatPassword") ?? "");
  // Neon Auth requires at least 8 characters; longer is safer.
  if (newPassword.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (newPassword !== repeat) return { error: "The two new passwords don’t match. Type them again." };
  if (newPassword === currentPassword) return { error: "Choose a password different from the current one." };

  const { error } = await auth.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (error) {
    return { error: /invalid|incorrect|password/i.test(error.message ?? "") ? "Your current password isn’t right." : `Couldn’t change the password: ${error.message}.` };
  }
  return { message: "Password changed. Other devices have been signed out." };
}

export async function logout() {
  await auth?.signOut();
  redirect("/");
}

export type StudentFormState = { message?: string; fields?: Record<string, string[] | undefined>; values?: Record<string, string> };

// Reads the form's text fields and checks any uploaded ID documents: allowed
// type, under 4 MB, and content that really is that type.
async function readStudentForm(formData: FormData) {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
  const fields: Record<string, string[] | undefined> = {};
  const documents: NewDocument[] = [];
  for (const kind of DOCUMENT_KINDS) {
    const file = formData.get(`doc_${kind}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!DOCUMENT_TYPES.includes(file.type)) fields[`doc_${kind}`] = ["Upload a JPG, PNG, WebP or PDF file"];
    else if (file.size > MAX_DOCUMENT_BYTES) fields[`doc_${kind}`] = ["This file is over 4 MB. Upload a smaller photo"];
    else {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (matchesType(file.type, bytes)) documents.push({ kind, contentType: file.type, bytes });
      else fields[`doc_${kind}`] = ["This file isn’t a real JPG, PNG, WebP or PDF. Upload the photo or PDF again"];
    }
  }
  const sharesId = Boolean(values.aadhaar?.trim() || values.pan?.trim() || documents.length);
  if (sharesId && values.consent !== "on") fields.consent = ["Confirm the student agreed to share their ID"];
  return { values, fields, documents };
}

export async function addStudent(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requireAdmin();
  const { values, fields, documents } = await readStudentForm(formData);
  const parsed = createStudentSchema.safeParse(values);
  if (!parsed.success) Object.assign(fields, z.flattenError(parsed.error).fieldErrors);
  if (!parsed.success || Object.keys(fields).length) return { message: "Check the highlighted fields.", fields, values };
  await createStudent(parsed.data, documents);
  redirect(adminHref());
}

export async function editStudent(studentId: string, _prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requireAdmin();
  const { values, fields, documents } = await readStudentForm(formData);
  const parsed = editStudentSchema.safeParse(values);
  if (!parsed.success) Object.assign(fields, z.flattenError(parsed.error).fieldErrors);
  if (!parsed.success || Object.keys(fields).length) return { message: "Check the highlighted fields.", fields, values };
  const saved = await updateStudent(studentId, parsed.data, documents);
  if (!saved) return { message: "This student no longer exists.", values };
  redirect(adminHref(`/students/${studentId}`));
}

// Status changes and removals from the student page. Each checks the admin
// session itself, then refreshes the page.
export async function pauseStudentAction(studentId: string) {
  await requireAdmin();
  await pauseStudent(studentId);
  refresh();
}

export async function resumeStudentAction(studentId: string) {
  await requireAdmin();
  await resumeStudent(studentId);
  refresh();
}

export async function markLeftAction(studentId: string) {
  await requireAdmin();
  await markStudentLeft(studentId);
  refresh();
}

export async function deleteStudentAction(studentId: string) {
  await requireAdmin();
  await deleteStudent(studentId);
  redirect(adminHref());
}

export async function deleteDocumentAction(studentId: string, kind: DocumentKind) {
  await requireAdmin();
  if (DOCUMENT_KINDS.includes(kind)) await deleteStudentDocument(studentId, kind);
  refresh();
}

export async function removeIdNumberAction(studentId: string, kind: IdNumberKind) {
  await requireAdmin();
  if (kind === "aadhaar" || kind === "pan" || kind === "licence") await removeIdNumber(studentId, kind);
  refresh();
}

const ENQUIRY_STATUSES: EnquiryRecord["status"][] = ["new", "contacted", "joined", "closed"];

export async function setEnquiryStatusAction(enquiryId: string, status: EnquiryRecord["status"]) {
  await requireAdmin();
  if (ENQUIRY_STATUSES.includes(status)) await setEnquiryStatus(enquiryId, status);
  refresh();
}

export async function deleteEnquiryAction(enquiryId: string) {
  await requireAdmin();
  await deleteEnquiry(enquiryId);
  refresh();
}

// Shows the full Aadhaar, PAN or licence number on the student page when asked.
export async function revealNumber(studentId: string, kind: IdNumberKind): Promise<string | null> {
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
