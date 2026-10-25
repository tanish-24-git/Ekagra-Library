"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { photos } from "@/content/images";
import { site } from "@/content/site";

export function HeroArch() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const open = useTransform(scrollYProgress, [0.05, 0.7], [0, 1], { clamp: true });
  const imageScale = useTransform(scrollYProgress, [0, 0.7], [1.14, 1]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.25], [0, -48]);
  const introPointer = useTransform(scrollYProgress, (v) => (v > 0.2 ? "none" : "auto"));
  const nameOpacity = useTransform(scrollYProgress, [0.62, 0.86], [0, 1]);
  const nameY = useTransform(scrollYProgress, [0.62, 0.9], [40, 0]);

  // The arch’s clip-path reads --p from CSS (see .hero-arch in globals.css).
  const arch = useRef<HTMLDivElement>(null);
  useMotionValueEvent(open, "change", (v) => {
    if (!reduce) arch.current?.style.setProperty("--p", String(v));
  });

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative h-[260svh] motion-reduce:h-svh">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={arch} className="hero-arch absolute inset-0 bg-sand">
          <motion.div className="absolute inset-0" style={{ scale: reduce ? 1 : imageScale }}>
            <Image
              src={photos.readingHall.src}
              alt={photos.readingHall.alt}
              fill
              preload
              sizes="100vw"
              quality={80}
              className="object-cover object-[50%_40%]"
            />
          </motion.div>

          {!reduce && (
            <motion.div
              aria-hidden
              style={{ opacity: nameOpacity }}
              className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent"
            />
          )}
          {!reduce && (
            <motion.div
              style={{ opacity: nameOpacity, y: nameY }}
              className="absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-5 pb-12 md:px-10 md:pb-16"
            >
              <p className="font-display text-[clamp(3.5rem,11vw,10.5rem)] leading-[0.92] tracking-[-0.02em] text-paper">
                {site.name}
              </p>
              <div className="mt-5 flex flex-col gap-1 text-linen/90 md:flex-row md:items-baseline md:gap-8">
                <span lang="mr" className="font-display text-h4">
                  {site.marathiName}
                </span>
                <span className="text-body">Ekagra: a mind held on one thing.</span>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          style={reduce ? undefined : { opacity: introOpacity, y: introY, pointerEvents: introPointer }}
          className="relative mx-auto flex h-full max-w-[1440px] flex-col px-5 pt-24 md:justify-end md:px-10 md:pt-0 md:pb-[12svh]"
        >
          <div className="md:max-w-[46vw]">
            <h1 id="hero-title">
              <span className="block text-body text-ink-soft">
                {site.name}, a study library in {site.area}, {site.city}
              </span>{" "}
              <span className="mt-3 block font-display text-h1 tracking-[-0.02em] text-balance">
                A quiet seat for the long preparation.
              </span>
            </h1>
            <p className="mt-5 max-w-[38ch] text-lead text-ink-soft md:mt-6">
              A peaceful study library for MPSC, UPSC, NEET, JEE and every competitive exam.
              <span className="hidden sm:inline"> Open all 7 days, {site.hours}, in {site.area}, {site.city}.</span>
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 md:mt-8">
              <Link href="#enquiry" className={buttonClass("primary")}>
                Send an enquiry
              </Link>
              <Link href="#facilities" className="link-quiet">
                See the facilities
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
