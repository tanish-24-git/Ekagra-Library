import { connection } from "next/server";
import { z } from "zod";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { deleteStudent, feeStatus, getStudent, updateStudent } from "@/lib/students";
import { updateStudentSchema } from "@/lib/validation";

const notFound = () => Response.json({ error: "No student with that id" }, { status: 404 });

export async function GET(_request: Request, ctx: RouteContext<"/api/students/[id]">) {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const { id } = await ctx.params;
  const student = await getStudent(id);
  return student ? Response.json({ data: { ...student, fee: feeStatus(student.endsOn) } }) : notFound();
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/students/[id]">) {
  if (!(await isAdmin())) return hiddenResponse();
  const { id } = await ctx.params;
  const parsed = updateStudentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid update", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const student = await updateStudent(id, parsed.data);
  return student ? Response.json({ data: student }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/students/[id]">) {
  if (!(await isAdmin())) return hiddenResponse();
  const { id } = await ctx.params;
  return (await deleteStudent(id)) ? new Response(null, { status: 204 }) : notFound();
}
