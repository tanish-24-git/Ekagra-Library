import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site-url";

// Deliberately silent about the admin: listing it here would advertise it.
// Admin pages send their own noindex headers instead (see src/proxy.ts).
// API routes are data, not pages, so crawlers skip them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
