"use client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

// A silent looping clip. Shows just the poster for reduced-motion users.
export function AmbientVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <video
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={!reduce}
      preload="metadata"
      aria-hidden
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
