import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, adminMode, adminSlug, verifySession } from "@/lib/admin-session";

// Keeps the admin out of sight (see adminMode in src/lib/admin-session.ts):
//  - In development without admin settings, /admin simply works.
//  - Otherwise /admin answers 404 and the admin is served from a secret path
//    (ADMIN_PATH) behind a login. Admin API routes answer 404 without a session.
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

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const mode = adminMode();
  const isAdminFolder = pathname === "/admin" || pathname.startsWith("/admin/");
  // The public enquiry form posts to /api/enquiries.
  const isAdminApi = ADMIN_API.some((re) => re.test(pathname)) && !(pathname.startsWith("/api/enquiries") && request.method === "POST");

  if (mode === "open") {
    if (pathname === "/admin/login") return NextResponse.redirect(new URL("/admin", request.url));
    return isAdminFolder ? private_(NextResponse.next()) : NextResponse.next();
  }

  const signedIn = () => verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (isAdminFolder) return hidden(request);
  if (isAdminApi) return (await signedIn()) ? NextResponse.next() : hidden(request);

  const slug = adminSlug();
  if (slug && (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`))) {
    const rest = pathname.slice(slug.length + 1);
    const isLogin = rest === "/login";
    const ok = await signedIn();
    if (!ok && !isLogin) return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
    if (ok && isLogin) return NextResponse.redirect(new URL(`/${slug}`, request.url));
    return private_(NextResponse.rewrite(new URL(`/admin${rest}${search}`, request.url)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|videos/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
