import type { MetadataRoute } from "next";

// Deliberately silent about the admin: listing it here would advertise it.
// Admin pages send their own noindex headers instead (see src/proxy.ts).
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
