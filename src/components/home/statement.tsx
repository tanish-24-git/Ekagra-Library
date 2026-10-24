"use client";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { exams, statement } from "@/content/site";

// The statement inks in word by word as it scrolls through the viewport.
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = statement.split(" ");

  return (
    <section aria-label="About the library" className="mx-auto max-w-[1440px] px-5 py-32 md:px-10 md:py-48">
      <p ref={ref} className="max-w-[24ch] font-display text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] leading-[1.12] tracking-[-0.015em] md:ml-[8.33%]">
        {reduce
          ? statement
          : words.map((word, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
                {word}
              </Word>
            ))}
      </p>

      <div className="mt-20 grid gap-4 md:mt-28 md:grid-cols-12">
        <h2 className="text-caption text-ink-soft md:col-span-3 md:col-start-2">Who studies here</h2>
        <p className="font-display text-h4 italic text-ink-soft md:col-span-7">{exams.join(", ")}.</p>
      </div>
    </section>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}
