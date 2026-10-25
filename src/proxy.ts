import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { NextResponse, type NextRequest } from "next/server";
import { adminMode, adminSlug } from "@/lib/admin-session";

// Keeps the admin out of sight (see adminMode in src/lib/admin-session.ts):
//  - In development without sign-in settings, /admin simply works.
//  - With sign-in set up, admin pages need a Neon Auth session; without one
//    they redirect to the login page and admin API routes answer 404. This is
//    a quick cookie check: pages and handlers verify the session and the
//    email allowlist themselves (src/lib/admin-guard.ts).
//  - With ADMIN_PATH set, /admin answers 404 and the admin is served from
//    that secret path instead.
//  - Admin responses are marked noindex and never cached.

const ADMIN_API = [/^\/api\/students(\/|$)/, /^\/api\/seats\/?$/, /^\/api\/enquiries\/?$/];

const hidden = (request: NextRequest) => NextResponse.rewrite(new URL("/_not-found", request.url));

function private_(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  // same-origin, not no-referrer: the secret path still never reaches other
  // sites, and the browser keeps sending a real Origin on form posts, which
  // Server Actions need (no-referrer makes it "null" and they are rejected).
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const mode = adminMode();
  const slug = adminSlug();
  const isAdminFolder = pathname === "/admin" || pathname.startsWith("/admin/");
  // The public enquiry form posts to /api/enquiries.
  const isAdminApi = ADMIN_API.some((re) => re.test(pathname)) && !(pathname.startsWith("/api/enquiries") && request.method === "POST");

  if (mode === "open") {
    if (pathname === "/admin/login") return NextResponse.redirect(new URL("/admin", request.url));
    return isAdminFolder ? private_(NextResponse.next()) : NextResponse.next();
  }
  if (mode === "off" || !slug) return isAdminFolder || isAdminApi ? hidden(request) : NextResponse.next();

  const hasSession = request.cookies.has(NEON_AUTH_SESSION_COOKIE_NAME);
  if (isAdminApi) return hasSession ? NextResponse.next() : hidden(request);
  if (isAdminFolder && slug !== "admin") return hidden(request);
  if (pathname !== `/${slug}` && !pathname.startsWith(`/${slug}/`)) return NextResponse.next();

  const rest = pathname.slice(slug.length + 1);
  if (!hasSession && rest !== "/login") return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
  return private_(slug === "admin" ? NextResponse.next() : NextResponse.rewrite(new URL(`/admin${rest}${search}`, request.url)));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|videos/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
