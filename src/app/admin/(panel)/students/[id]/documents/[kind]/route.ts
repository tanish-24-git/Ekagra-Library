import { connection } from "next/server";
import type { DocumentKind } from "@/db/schema";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { DOCUMENT_KINDS } from "@/lib/documents";
import { getStudentDocument } from "@/lib/students";

// Streams a decrypted ID document to a signed-in admin. Lives inside the
// admin (served from ADMIN_PATH when set), never cached, and sandboxed so a
// file can't run scripts even if a browser tried to render it as a page.
export async function GET(_request: Request, ctx: RouteContext<"/admin/students/[id]/documents/[kind]">) {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const { id, kind } = await ctx.params;
  if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) return hiddenResponse();

  const doc = await getStudentDocument(id, kind as DocumentKind);
  if (!doc) return hiddenResponse();

  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
