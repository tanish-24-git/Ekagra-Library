import { connection } from "next/server";
import { z } from "zod";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { enquirySchema } from "@/lib/enquiry";
import { createEnquiry, listEnquiries } from "@/lib/students";

// GET is admin-only. POST is the public enquiry form on the homepage.
export async function GET() {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const data = await listEnquiries();
  return Response.json({ data, count: data.length });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Hidden "company" field: people never see it, spam bots fill it in.
  if (body && typeof body === "object" && "company" in body && body.company) {
    return Response.json({ data: { id: "ok" } }, { status: 201 });
  }
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const enquiry = await createEnquiry(parsed.data);
  return Response.json({ data: { id: enquiry.id } }, { status: 201 });
}
