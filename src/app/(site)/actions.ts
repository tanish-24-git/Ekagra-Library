"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { enquirySchema, type EnquiryField } from "@/lib/enquiry";
import { createEnquiry } from "@/lib/students";

// The homepage enquiry form. A Server Action rather than a public API route:
// it accepts one enquiry at a time and returns only "ok" or field errors.

// At most five enquiries per connection every ten minutes. Kept in memory,
// so it resets on restart and isn't shared between server instances.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

export type EnquiryResult = { ok: true } | { ok: false; fields?: Partial<Record<EnquiryField, string[]>>; error?: string };

export async function submitEnquiry(input: Record<string, unknown>): Promise<EnquiryResult> {
  // Hidden "company" field: people never see it, spam bots fill it in.
  if (input.company) return { ok: true };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return { ok: false, error: "Too many enquiries from this connection. Please call us instead." };

  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fields: z.flattenError(parsed.error).fieldErrors };

  recent.set(ip, [...times, now]);
  await createEnquiry(parsed.data);
  return { ok: true };
}
