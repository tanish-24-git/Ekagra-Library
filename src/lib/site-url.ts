// The public address of the site, without a trailing slash. Set
// NEXT_PUBLIC_SITE_URL to the real domain on the live site so canonical
// links, the sitemap and structured data point at it.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const absoluteUrl = (path: string) => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
