import type { Metadata } from "next";
import { DayTimeline } from "@/components/home/day-timeline";
import { Facilities } from "@/components/home/facilities";
import { Faq } from "@/components/home/faq";
import { HeroArch } from "@/components/home/hero-arch";
import { Statement } from "@/components/home/statement";
import { Visit } from "@/components/home/visit";
import { JsonLd } from "@/components/seo/json-ld";
import { faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <HeroArch />
      <Statement />
      <Facilities />
      <DayTimeline />
      <Faq />
      <Visit />
      <JsonLd id="faq" data={faqJsonLd()} />
    </>
  );
}
