import { connection } from "next/server";
import { site } from "@/content/site";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { seatSummary } from "@/lib/students";

// GET /api/seats — reserved desks and sit-anywhere members (admin only).
export async function GET() {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();
  return Response.json({ data: await seatSummary(site.seats) });
}
