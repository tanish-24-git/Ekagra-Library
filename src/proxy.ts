import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, adminSlug, verifySession } from "@/lib/admin-session";

// Keeps the admin out of sight:
//  - /admin itself always answers 404, like any page that doesn't exist.
//  - The admin is served from a secret path (ADMIN_PATH) and needs a login.
//  - Admin API routes answer 404 unless the request carries a valid session.
//  - Admin responses are marked noindex and never cached.

const ADMIN_API = [/^\/api\/students(\/|$)/, /^\/api\/seats\/?$/, /^\/api\/enquiries\/?$/];

const hidden = (request: NextRequest) => NextResponse.rewrite(new URL("/_not-found", request.url));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = () => verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return hidden(request);

  if (ADMIN_API.some((re) => re.test(pathname))) {
    // The public enquiry form posts here.
    if (pathname.startsWith("/api/enquiries") && request.method === "POST") return NextResponse.next();
    return (await signedIn()) ? NextResponse.next() : hidden(request);
  }

  const slug = adminSlug();
  if (slug && (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`))) {
    const rest = pathname.slice(slug.length + 1);
    const isLogin = rest === "/login";
    const ok = await signedIn();
    if (!ok && !isLogin) return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
    if (ok && isLogin) return NextResponse.redirect(new URL(`/${slug}`, request.url));

    const response = NextResponse.rewrite(new URL(`/admin${rest}${search}`, request.url));
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
