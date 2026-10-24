import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s | ${site.name} admin` },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-svh bg-paper">{children}</div>;
}
