import { connection } from "next/server";
import type { DocumentKind } from "@/db/schema";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { DOCUMENT_KINDS } from "@/lib/documents";
import { getStudentDocument } from "@/lib/students";

// Streams a decrypted ID document to the admin. Never cached anywhere.
export async function GET(_request: Request, ctx: RouteContext<"/api/students/[id]/documents/[kind]">) {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const { id, kind } = await ctx.params;
  if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) return hiddenResponse();

  const doc = await getStudentDocument(id, kind as DocumentKind);
  if (!doc) return Response.json({ error: "No document of that kind for this student" }, { status: 404 });

  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
