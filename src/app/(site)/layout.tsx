import { JsonLd } from "@/components/seo/json-ld";
import { Footer } from "@/components/site/footer";
import { FooterReveal } from "@/components/site/footer-reveal";
import { Header } from "@/components/site/header";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { libraryJsonLd, websiteJsonLd } from "@/lib/structured-data";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* site-shell: hides the browser scrollbar on public pages (globals.css). */}
      <div id="top" className="site-shell" />
      <ScrollProgress />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SmoothScroll />
      <Header />
      {/* The page is a card that lifts off the footer (see FooterReveal). overflow-clip, unlike
          overflow-hidden, keeps position: sticky working for the sections inside. */}
      <main id="main" className="relative z-10 bg-paper md:overflow-clip md:rounded-b-[2.5rem] md:shadow-[0_40px_80px_-40px_rgba(59,49,43,0.45)]">
        {children}
      </main>
      <FooterReveal>
        <Footer />
      </FooterReveal>
      <div className="grain" aria-hidden />
      <JsonLd id="library" data={libraryJsonLd()} />
      <JsonLd id="website" data={websiteJsonLd()} />
    </>
  );
}
