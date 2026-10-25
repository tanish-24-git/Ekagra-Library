"use client";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

// Stands in for the browser's scrollbar on the public site (hidden in
// globals.css): a thin bronze bar along the top that fills as you scroll.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.35, restDelta: 0.0005 });
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="scroll-track pointer-events-none fixed inset-x-0 top-0 z-[65] h-[3px]">
      <motion.div style={{ scaleX: reduce ? scrollYProgress : smooth }} className="scroll-bar h-full origin-left" />
    </div>
  );
}
