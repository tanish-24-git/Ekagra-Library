import { hiddenResponse } from "@/lib/admin-guard";
import { auth } from "@/lib/auth";

// Neon Auth's API, proxied through the site so its session cookies are
// first-party. Sign-up is closed here: admin accounts are created on the
// admin login page, and only for the addresses in ADMIN_EMAILS.

type Context = { params: Promise<{ path: string[] }> };
const handlers = auth?.handler();

export async function GET(request: Request, ctx: Context) {
  return handlers ? handlers.GET(request, ctx) : hiddenResponse();
}

export async function POST(request: Request, ctx: Context) {
  const { path } = await ctx.params;
  if (!handlers || path[0] === "sign-up") return hiddenResponse();
  return handlers.POST(request, ctx);
}
