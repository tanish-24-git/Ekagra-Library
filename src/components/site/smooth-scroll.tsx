"use client";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

// Root-mode Lenis drives window scrolling, so Motion's useScroll keeps
// working unchanged. Skipped entirely for reduced-motion users.
export function SmoothScroll() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <ReactLenis root options={{ lerp: 0.1, anchors: { offset: -72 } }} />;
}
