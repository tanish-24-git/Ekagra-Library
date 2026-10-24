import { connection } from "next/server";
import { z } from "zod";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { createEnquiry, listEnquiries } from "@/lib/students";
import { enquirySchema } from "@/lib/validation";

// GET is admin-only. POST is the public call-back form on the homepage.
export async function GET() {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const data = await listEnquiries();
  return Response.json({ data, count: data.length });
}

export async function POST(request: Request) {
  const parsed = enquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const enquiry = await createEnquiry(parsed.data);
  return Response.json({ data: { id: enquiry.id } }, { status: 201 });
}
