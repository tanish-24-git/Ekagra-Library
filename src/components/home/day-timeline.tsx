"use client";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { day } from "@/content/site";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";

// On desktop the section pins and the day scrolls sideways, one pixel of
// horizontal travel per pixel of vertical scroll. On phones it's a plain list.
export function DayTimeline() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 768px)");
  const pinned = wide && !reduce;
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el || !pinned) return;
    const measure = () => setDistance(Math.max(el.scrollWidth - window.innerWidth, 0));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (v) => -v * distance);

  return (
    <section
      id="the-day"
      ref={section}
      aria-labelledby="day-title"
      className="relative bg-linen"
      style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}
    >
      <div className={cn("flex flex-col py-24", pinned && "sticky top-0 h-svh justify-center overflow-hidden py-0")}>
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10">
          <h2 id="day-title" className="font-display text-h2 tracking-[-0.015em]">
            The day, hour by hour
          </h2>
          <p className="mt-4 max-w-[40ch] text-lead text-ink-soft">Every day, from opening at 8 am to closing at 9 pm.</p>
        </div>

        <motion.ol
          ref={track}
          style={{ x: pinned ? x : 0 }}
          className="mt-12 flex flex-col gap-14 px-5 md:mt-14 md:w-max md:flex-row md:gap-10 md:px-10 md:pr-[12vw]"
        >
          {day.map((moment, i) => (
            <li key={moment.time + moment.period} className="md:w-[clamp(280px,27vw,420px)] md:shrink-0">
              <div className={cn("relative aspect-[4/5] overflow-hidden bg-sand md:h-[46svh] md:w-full md:aspect-auto", i === 0 && "arch")}>
                <Image src={moment.photo.src} alt={moment.photo.alt} fill sizes="(min-width: 768px) 27vw, 90vw" className="object-cover" />
              </div>
              <p className="mt-5 font-display text-h3 leading-none">
                <time>
                  {moment.time}
                  <span className="ml-1.5 text-h4 text-ink-soft">{moment.period}</span>
                </time>
              </p>
              <h3 className="mt-3 text-lead font-medium">{moment.title}</h3>
              <p className="mt-1 max-w-[34ch] text-ink-soft">{moment.body}</p>
            </li>
          ))}
        </motion.ol>

        {pinned && (
          <div aria-hidden className="absolute inset-x-10 bottom-8 h-px bg-rule">
            <motion.div className="h-full origin-left bg-ink" style={{ scaleX: scrollYProgress }} />
          </div>
        )}
      </div>
    </section>
  );
}
