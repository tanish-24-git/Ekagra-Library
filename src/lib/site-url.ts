// The public address of the site, without a trailing slash: used for
// canonical links, the sitemap and structured data. NEXT_PUBLIC_SITE_URL wins
// if set; otherwise the live address Vercel provides (your domain once added,
// else the .vercel.app one), and http://localhost:3000 on your computer.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")).replace(/\/$/, "");

export const absoluteUrl = (path: string) => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
