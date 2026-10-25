import { connection } from "next/server";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { getSubmissionFileData } from "@/lib/intake";

// A file uploaded through a Google Form (ID photo, payment screenshot),
// decrypted for a signed-in admin. Never cached, and sandboxed.
export async function GET(_request: Request, ctx: RouteContext<"/admin/form-submissions/files/[fileId]">) {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  const { fileId } = await ctx.params;
  const file = await getSubmissionFileData(fileId);
  if (!file) return hiddenResponse();
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
