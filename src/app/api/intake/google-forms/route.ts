import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { hiddenResponse } from "@/lib/admin-guard";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, matchesType } from "@/lib/documents";
import { saveSubmission, saveSubmissionFile } from "@/lib/intake";

// Receives Google Forms responses from the Apps Script in
// scripts/google-forms/intake.gs. Off until INTAKE_SECRET is set; without the
// right "Authorization: Bearer <INTAKE_SECRET>" header it answers 404.
//
// The script sends each response as one "submission" message, then one
// "file" message per uploaded file (each stays under Vercel's 4.5 MB request
// limit). Messages for the same response share Google's response ID, so a
// resent response updates the stored one instead of duplicating it.

const digest = (s: string) => createHash("sha256").update(s).digest();

const form = z.enum(["registration", "payment"]);
const responseId = z.string().trim().min(1).max(200);
const message = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("submission"),
    form,
    responseId,
    submittedAt: z.string().max(40).optional(),
    answers: z.record(z.string().max(200), z.union([z.string().max(3000), z.array(z.string().max(500)).max(30)])),
  }),
  z.object({
    kind: z.literal("file"),
    form,
    responseId,
    question: z.string().trim().min(1).max(200),
    name: z.string().max(300).optional(),
    type: z.string().max(100),
    data: z.string().max(7_000_000),
  }),
]);

export async function POST(request: Request) {
  const secret = process.env.INTAKE_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return hiddenResponse();

  const parsed = message.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unexpected message", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  const m = parsed.data;

  try {
    if (m.kind === "submission") {
      const id = await saveSubmission({ form: m.form, responseId: m.responseId, answers: m.answers, submittedAt: m.submittedAt });
      return Response.json({ ok: true, id });
    }

    const bytes = Buffer.from(m.data, "base64");
    if (!DOCUMENT_TYPES.includes(m.type) || !matchesType(m.type, bytes)) {
      return Response.json({ error: "Only JPG, PNG, WebP or PDF files are accepted" }, { status: 415 });
    }
    if (bytes.length > MAX_DOCUMENT_BYTES) return Response.json({ error: "File is over 4 MB" }, { status: 413 });
    const id = await saveSubmissionFile({ form: m.form, responseId: m.responseId, question: m.question, contentType: m.type, bytes });
    if (!id) return Response.json({ error: "Send the submission before its files" }, { status: 409 });
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
}
