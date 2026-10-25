import type { Metadata, Viewport } from "next";
import { Mukta, Tiro_Devanagari_Marathi } from "next/font/google";
import { photos } from "@/content/images";
import { seo, site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const tiro = Tiro_Devanagari_Marathi({
  variable: "--font-tiro",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "devanagari"],
  display: "swap",
});

const mukta = Mukta({
  variable: "--font-mukta",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin", "devanagari"],
  display: "swap",
});

const shareImage = { url: photos.readingHall.src, width: photos.readingHall.width, height: photos.readingHall.height, alt: photos.readingHall.alt };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${seo.title} | ${site.name}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: seo.keywords,
  applicationName: site.name,
  category: "education",
  openGraph: {
    siteName: site.name,
    title: `${site.name}: ${seo.title}`,
    description: site.description,
    url: "/",
    images: [shareImage],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name}: ${seo.title}`,
    description: site.description,
    images: [shareImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Location tags some search engines and map services still read.
  other: {
    "geo.region": "IN-MH",
    "geo.placename": `${site.area}, ${site.city}`,
    "geo.position": `${site.geo.latitude};${site.geo.longitude}`,
    ICBM: `${site.geo.latitude}, ${site.geo.longitude}`,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${tiro.variable} ${mukta.variable} antialiased`}>
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
