import type { Metadata, Viewport } from "next";
import { Mukta, Tiro_Devanagari_Marathi } from "next/font/google";
import { site } from "@/content/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${site.fullName}, ${site.city}`,
    template: `%s | ${site.fullName}`,
  },
  description: site.description,
  openGraph: {
    title: site.fullName,
    description: site.description,
    images: ["/images/library/reading-hall.jpg"],
    locale: "en_IN",
    type: "website",
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
