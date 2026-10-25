import { connection } from "next/server";
import { hiddenResponse } from "@/lib/admin-guard";
import { runReminders } from "@/lib/reminders";

// Called once a day by a scheduler (vercel.json, cron-job.org or GitHub
// Actions) with the header `Authorization: Bearer <CRON_SECRET>`. Vercel Cron
// sends that header by itself when CRON_SECRET is set. Answers 404 otherwise.
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return hiddenResponse();
  return Response.json(await runReminders(), { headers: { "Cache-Control": "no-store" } });
}
