import { DayTimeline } from "@/components/home/day-timeline";
import { Facilities } from "@/components/home/facilities";
import { Faq } from "@/components/home/faq";
import { HeroArch } from "@/components/home/hero-arch";
import { Statement } from "@/components/home/statement";
import { Visit } from "@/components/home/visit";

export default function HomePage() {
  return (
    <>
      <HeroArch />
      <Statement />
      <Facilities />
      <DayTimeline />
      <Faq />
      <Visit />
    </>
  );
}
