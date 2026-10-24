"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { SESSION_COOKIE, SESSION_HOURS, adminHref, createSession } from "@/lib/admin-session";
import { createStudent } from "@/lib/students";
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
  const values = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const parsed = createStudentSchema.safeParse(values);
  if (!parsed.success) {
    return { message: "Check the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors, values };
  }
  await createStudent(parsed.data);
  redirect(adminHref());
}
