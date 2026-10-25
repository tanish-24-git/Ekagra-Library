"use server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { enquirySchema, type EnquiryField } from "@/lib/enquiry";
import { createEnquiry, enquiryActivity } from "@/lib/students";

// The homepage enquiry form. A Server Action rather than a public API route:
// it accepts one enquiry at a time and returns only "ok" or field errors.
//
// Spam protection, cheapest check first:
//  1. A hidden "company" field that only bots fill in.
//  2. Forms sent within 3 seconds of the page opening (no person types that fast).
//  3. A quick in-memory limit per connection (this server instance).
//  4. A database limit per connection that holds across instances: 3 an hour,
//     8 a day. Connections are stored as a salted hash, never the raw IP.
//  5. The same phone number again within a week is accepted but not stored twice.
// Silent checks (1, 2, 5) answer "ok" so bots learn nothing.

const MIN_FILL_MS = 3_000;
const BURST_WINDOW_MS = 10 * 60_000;
const BURST_MAX = 5;
const PER_HOUR = 3;
const PER_DAY = 8;
const recent = new Map<string, number[]>();

export type EnquiryResult = { ok: true } | { ok: false; fields?: Partial<Record<EnquiryField, string[]>>; error?: string };

const tooMany = { ok: false, error: "Too many enquiries from this connection. Please call us instead." } as const;

function hashIp(ip: string) {
  const salt = process.env.DOCUMENTS_KEY ?? process.env.NEON_AUTH_COOKIE_SECRET ?? "ekagra-library";
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
}

export async function submitEnquiry(input: Record<string, unknown>): Promise<EnquiryResult> {
  if (input.company) return { ok: true };
  const startedAt = Number(input.startedAt);
  if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return { ok: true };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < BURST_WINDOW_MS);
  if (times.length >= BURST_MAX) return tooMany;

  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fields: z.flattenError(parsed.error).fieldErrors };

  const ipHash = hashIp(ip);
  const activity = await enquiryActivity(ipHash, parsed.data.phone);
  if (activity.lastHour >= PER_HOUR || activity.lastDay >= PER_DAY) return tooMany;

  recent.set(ip, [...times, now]);
  if (activity.phoneThisWeek) return { ok: true };
  await createEnquiry(parsed.data, ipHash);
  return { ok: true };
}
