import { connection } from "next/server";
import { z } from "zod";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { createStudent, feeStatus, listStudents } from "@/lib/students";
import { createStudentSchema } from "@/lib/validation";

// GET /api/students?status=active&seating=reserved&q=patil
export async function GET(request: Request) {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const seating = params.get("seating");
  const q = params.get("q")?.toLowerCase();

  const rows = (await listStudents())
    .filter((s) => !status || s.status === status)
    .filter((s) => !seating || s.seating === seating)
    .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.phone.includes(q))
    .map((s) => ({ ...s, fee: feeStatus(s.endsOn) }));

  return Response.json({ data: rows, count: rows.length });
}

// POST /api/students — same payload as the admin "Add student" form.
export async function POST(request: Request) {
  if (!(await isAdmin())) return hiddenResponse();
  const body = await request.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid student details", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const student = await createStudent(parsed.data);
  return Response.json({ data: student }, { status: 201 });
}
