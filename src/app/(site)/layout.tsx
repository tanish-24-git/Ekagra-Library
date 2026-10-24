import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { SmoothScroll } from "@/components/site/smooth-scroll";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div id="top" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SmoothScroll />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <div className="grain" aria-hidden />
    </>
  );
}
