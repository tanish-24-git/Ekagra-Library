"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { SESSION_COOKIE, SESSION_HOURS, adminHref, createSession } from "@/lib/admin-session";
import type { DocumentKind } from "@/db/schema";
import { DOCUMENT_KINDS, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents";
import { createStudent, revealIdNumber, type NewDocument } from "@/lib/students";
import { createStudentSchema } from "@/lib/validation";

// Wrong passwords: five tries per IP, then a 15-minute lockout. Kept in
// memory, so it resets on restart and isn't shared between server instances.
const MAX_TRIES = 5;
const LOCKOUT_MS = 15 * 60_000;
const failures = new Map<string, { count: number; until: number }>();

const digest = (value: string) => createHash("sha256").update(value).digest();

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const record = failures.get(ip);
  if (record && record.count >= MAX_TRIES && record.until > now) {
    return { error: "Too many wrong passwords. Try again in 15 minutes." };
  }

  const expected = process.env.ADMIN_PASSWORD ?? "";
  const given = String(formData.get("password") ?? "");
  const ok = expected.length > 0 && timingSafeEqual(digest(given), digest(expected));

  if (!ok) {
    const count = record && record.until > now ? record.count + 1 : 1;
    failures.set(ip, { count, until: now + LOCKOUT_MS });
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That password isn’t right. Check it and try again." };
  }

  failures.delete(ip);
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect(adminHref());
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
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
